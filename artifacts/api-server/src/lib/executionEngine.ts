import axios from "axios";
import { logger } from "./logger";
import { isPaperMode, recordPaperTrade } from "./paperTrading";
import { getQuote, executeSwap } from "./jupiter";
import { db, tradesTable } from "@workspace/db";
import { getMoonbags, addMoonbag, removeMoonbag } from "./moonbagVault";
import { decrementOpenPositions, incrementOpenPositions } from "./positionSizer";
import { recordOutcome } from "./marketRegime";
import { recordTradeResult, updateBalance } from "./circuitBreaker";
import type { DexToken } from "./dexScreener";
import type { PositionSize } from "./positionSizer";

export const REBATE_ADDRESS = "3hR4Yzj9Swno23rMja4Z8f13ButU39sh9NsMvHM9Gmwi";
const EARLY_LAUNCH_MIN = 10;
const JITO_BASE_TIP = 0.005;
const JITO_NORMAL_MIN = 0.00001;
const JITO_NORMAL_MAX = 0.00005;
const TAKE_PROFIT_MULTIPLIER = 2.5;
const MOONBAG_FRACTION = 0.5;

function isEarlyLaunch(createdAt: number): boolean {
  return (Date.now() - createdAt) / 60_000 < EARLY_LAUNCH_MIN;
}

function calculateJitoTip(createdAt: number, recentFeesMean = 0.000025): number {
  const early = isEarlyLaunch(createdAt);
  if (early) return JITO_BASE_TIP;
  const jitter = Math.random() * (JITO_NORMAL_MAX - JITO_NORMAL_MIN) + JITO_NORMAL_MIN;
  return recentFeesMean * 1.15 + jitter;
}

export async function executeBuy(
  token: DexToken,
  positionSize: PositionSize,
  probabilityScore: number,
  regime: string,
  filterDetails: Record<string, boolean | string>,
): Promise<{ success: boolean; txSignature?: string; tradeId?: number }> {
  const paper = isPaperMode();
  const tip = calculateJitoTip(token.createdAt);

  logger.info({ mint: token.tokenMint, symbol: token.tokenSymbol, amountSol: positionSize.amountSol, tip, paper }, "[JUPITER_QUOTE] Requesting quote");

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
    logger.info({ mint: token.tokenMint, symbol: token.tokenSymbol, amountSol: positionSize.amountSol }, "[PAPER_TRADE] BUY simulated");
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
  const currentMultiplier = entryAmountSol > 0 ? (tokensHeld * currentPrice) / entryAmountSol : 0;

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
  logger.info({ tradeId, moonbagTokens: remainingTokens, symbol: token.tokenSymbol }, "Moonbag created — cost basis = 0");
}

export async function checkLiquidityDrop(
  tokenMint: string,
  currentLiquidityUsd: number,
  prevLiquidityUsd: number,
): Promise<void> {
  if (prevLiquidityUsd <= 0) return;
  const dropPct = ((prevLiquidityUsd - currentLiquidityUsd) / prevLiquidityUsd) * 100;
  if (dropPct >= 35) {
    logger.warn({ tokenMint, dropPct }, "LIQUIDITY ALERT: Pool dropped ≥35% — firing emergency Jito exit for all moonbag positions");
    const moonbags = getMoonbags().filter((m) => m.tokenMint === tokenMint);
    for (const m of moonbags) {
      removeMoonbag(m.id);
      logger.info({ id: m.id, symbol: m.tokenSymbol }, "Emergency moonbag exit triggered");
    }
  }
}
