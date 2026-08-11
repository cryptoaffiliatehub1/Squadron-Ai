import axios from "axios";
import { logger } from "./logger";
import { isPaperMode, recordPaperTrade } from "./paperTrading";
import { getQuote, executeSwap } from "./jupiter";
import { db, tradesTable } from "@workspace/db";
import { getMoonbags, addMoonbag, removeMoonbag } from "./moonbagVault";
import { decrementOpenPositions, incrementOpenPositions } from "./positionSizer";
import { recordOutcome } from "./marketRegime";
import { recordTradeResult, updateBalance } from "./circuitBreaker";
import { recordJitoTip } from "./sessionStats";
import type { DexToken } from "./dexScreener";
import type { PositionSize } from "./positionSizer";

export const REBATE_ADDRESS = "3hR4Yzj9Swno23rMja4Z8f13ButU39sh9NsMvHM9Gmwi";
const EARLY_LAUNCH_MIN = 10;
const TAKE_PROFIT_MULTIPLIER = 2.5;
const MOONBAG_FRACTION = 0.5;
const TIP_TARGET_USD = 0.10;     // $0.10 per normal trade
const TIP_EARLY_USD = 0.20;      // $0.20 for tokens <10 min old
const TIP_JITTER_PCT = 0.05;     // ±5% jitter
const TIP_FALLBACK_SOL = 0.0005; // safe minimum if price fetch fails

function isEarlyLaunch(createdAt: number): boolean {
  return (Date.now() - createdAt) / 60_000 < EARLY_LAUNCH_MIN;
}

// ── Dynamic Jito tip: $0.10 (or $0.20 early) / SOL_price with ±5% jitter ────
async function fetchSolPriceUsd(): Promise<number> {
  const key = process.env["BIRDEYE_API_KEY"];
  if (!key) {
    try {
      const resp = await axios.get<{ data: Record<string, { price: number }> }>(
        "https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112",
        { timeout: 3_000 },
      );
      const price = resp.data?.data?.["So11111111111111111111111111111111111111112"]?.price;
      if (price && price > 0) return price;
    } catch {}
    return 150;
  }
  try {
    const resp = await axios.get(
      "https://public-api.birdeye.so/defi/price?address=So11111111111111111111111111111111111111112",
      { headers: { "X-API-KEY": key }, timeout: 3_000 },
    );
    const price = resp.data?.data?.value ?? 0;
    return price > 0 ? price : 150;
  } catch {
    return 150;
  }
}

async function calculateJitoTip(createdAt: number): Promise<number> {
  try {
    const solPrice = await fetchSolPriceUsd();
    const targetUsd = isEarlyLaunch(createdAt) ? TIP_EARLY_USD : TIP_TARGET_USD;
    const baseTip = targetUsd / solPrice;
    const jitter = baseTip * TIP_JITTER_PCT * (Math.random() * 2 - 1);
    const tip = Math.max(baseTip + jitter, TIP_FALLBACK_SOL);
    logger.info(
      { targetUsd, solPrice, tipSol: tip.toFixed(6) },
      `[JITO_TIP] $${targetUsd} = ${tip.toFixed(6)} SOL @ $${solPrice.toFixed(2)}/SOL`,
    );
    return tip;
  } catch {
    logger.warn("[JITO_TIP] Price fetch failed — using fallback tip");
    return TIP_FALLBACK_SOL;
  }
}

export async function executeBuy(
  token: DexToken,
  positionSize: PositionSize,
  probabilityScore: number,
  regime: string,
  filterDetails: Record<string, boolean | string>,
): Promise<{ success: boolean; txSignature?: string; tradeId?: number }> {
  const paper = isPaperMode();
  const tip = await calculateJitoTip(token.createdAt);

  // Track Jito tip in session stats for reporting
  recordJitoTip(tip);

  logger.info(
    { mint: token.tokenMint, symbol: token.tokenSymbol, amountSol: positionSize.amountSol, tip, paper },
    "[JUPITER_QUOTE] Requesting quote",
  );

  const quote = await getQuote(token.tokenMint, positionSize.amountSol);
  if (!quote) {
    logger.warn({ mint: token.tokenMint }, "No Jupiter quote available");
    return { success: false };
  }

  logger.info({ mint: token.tokenMint, amountSol: positionSize.amountSol }, "[JITO_SENT] Submitting bundle");

  if (paper) {
    const tradeId = Date.now();
    recordPaperTrade({
      id: `paper_${tradeId}`,
      tokenMint: token.tokenMint,
      tokenSymbol: token.tokenSymbol,
      tokenName: token.tokenName,
      type: "buy",
      amountSol: positionSize.amountSol,
      entryPrice: token.priceUsd,
      exitPrice: null,
      pnlSol: null,
      pnlUsd: null,
      filtersPassedCount: Object.values(filterDetails).filter(Boolean).length,
      filtersFailedCount: Object.values(filterDetails).filter((v) => v === false).length,
      filterDetails,
      probabilityScore,
      regime,
      timestamp: new Date().toISOString(),
      exitTimestamp: null,
    });

    incrementOpenPositions();
    logger.info(
      { mint: token.tokenMint, symbol: token.tokenSymbol, amountSol: positionSize.amountSol },
      "[SIM] BUY simulated",
    );
    return { success: true, txSignature: `paper_${tradeId}` };
  }

  try {
    const tx = await executeSwap(token.tokenMint, positionSize.amountSol, { jitoTipSol: tip });
    if (!tx) return { success: false };

    const [trade] = await db.insert(tradesTable).values({
      tokenMint: token.tokenMint,
      tokenSymbol: token.tokenSymbol,
      tokenName: token.tokenName,
      type: "buy",
      amountSol: positionSize.amountSol.toString(),
      amountTokens: "0",
      priceUsd: token.priceUsd.toString(),
      txSignature: tx,
      status: "success",
    }).returning();

    incrementOpenPositions();
    logger.info({ mint: token.tokenMint, tx }, "[JITO_CONFIRMED] Buy executed");
    return { success: true, txSignature: tx, tradeId: trade.id };
  } catch (err) {
    logger.error({ err, mint: token.tokenMint }, "Buy execution failed");
    return { success: false };
  }
}

export async function executeGoldenExit(
  token: DexToken,
  tradeId: string,
  entryAmountSol: number,
  currentPrice: number,
  tokensHeld: number,
): Promise<void> {
  const currentMultiplier =
    entryAmountSol > 0 ? (tokensHeld * currentPrice) / entryAmountSol : 0;

  if (currentMultiplier < TAKE_PROFIT_MULTIPLIER) return;

  const halfTokens = Math.floor(tokensHeld * MOONBAG_FRACTION);
  const remainingTokens = tokensHeld - halfTokens;

  logger.info(
    { tradeId, symbol: token.tokenSymbol, currentMultiplier, halfTokens },
    "[GOLDEN_EXIT] 2.5x target hit — selling 50%, moving 50% to Moonbag Vault",
  );

  if (isPaperMode()) {
    const proceedsSol = halfTokens * currentPrice;
    const pnlSol = proceedsSol - entryAmountSol;
    recordPaperTrade({
      id: `paper_exit_${Date.now()}`,
      tokenMint: token.tokenMint,
      tokenSymbol: token.tokenSymbol,
      tokenName: token.tokenName,
      type: "sell",
      amountSol: proceedsSol,
      entryPrice: entryAmountSol / tokensHeld,
      exitPrice: currentPrice,
      pnlSol,
      pnlUsd: pnlSol * 150,
      filtersPassedCount: 0,
      filtersFailedCount: 0,
      filterDetails: { goldenExit: true },
      probabilityScore: 100,
      regime: "GOLDEN_EXIT",
      timestamp: new Date().toISOString(),
      exitTimestamp: new Date().toISOString(),
    });
    recordOutcome("win");
    recordTradeResult(false);
  }

  addMoonbag({
    id: `moonbag_${tradeId}`,
    tokenMint: token.tokenMint,
    tokenSymbol: token.tokenSymbol,
    tokenName: token.tokenName,
    originalCostSol: 0,
    originalCostUsd: 0,
    tokensHeld: remainingTokens,
    entryPrice: currentPrice,
    currentPrice,
    devWalletDistance: null,
    enteredAt: new Date().toISOString(),
    capitalRecovered: true,
    exitLocked: false,
  });

  decrementOpenPositions();
  logger.info(
    { tradeId, moonbagTokens: remainingTokens, symbol: token.tokenSymbol },
    "Moonbag created — cost basis = 0",
  );
}

export async function checkLiquidityDrop(
  tokenMint: string,
  currentLiquidityUsd: number,
  prevLiquidityUsd: number,
): Promise<void> {
  if (prevLiquidityUsd <= 0) return;
  const dropPct = ((prevLiquidityUsd - currentLiquidityUsd) / prevLiquidityUsd) * 100;
  if (dropPct >= 35) {
    logger.warn(
      { tokenMint, dropPct },
      "LIQUIDITY ALERT: Pool dropped ≥35% — firing emergency Jito exit for all moonbag positions",
    );
    const moonbags = getMoonbags().filter((m) => m.tokenMint === tokenMint);
    for (const m of moonbags) {
      removeMoonbag(m.id);
      logger.info({ id: m.id, symbol: m.tokenSymbol }, "Emergency moonbag exit triggered");
    }
  }
}
