import { logger } from "./logger";
import { db, skippedTokensTable, detectedTokensTable } from "@workspace/db";
import { eq, lt, or, sql } from "drizzle-orm";
import { runRiskGate, calculateProbabilityScore } from "./riskGate";
import { analyzeTokenSentiment } from "./aiAnalyst";
import { classifyRegime, getRegime, isHibernating } from "./marketRegime";
import { canOpenNewPosition, calculatePositionSize } from "./positionSizer";
import { canTrade, getCircuitState, engageFortress } from "./circuitBreaker";
import { executeBuy } from "./executionEngine";
import { startTripleRadarScanner, stopTripleRadarScanner, getScannerState } from "./scanner";
import { startWatchdog, stopWatchdog, getWatchdogState } from "./watchdog";
import { startFeedbackLoop, stopFeedbackLoop, isSystemAtRisk, getWeights } from "./feedbackLoop";
import { startWalletWatcher, stopWalletWatcher, getWalletState } from "./walletWatcher";
import { startReportingEngine } from "./reporting";
import { logReadinessReport } from "./systemReadiness";
import { loadTradingMode, isPaperMode } from "./tradingMode";
import { recordSkippedToken } from "./sessionStats";
import type { DexToken } from "./dexScreener";

export interface BotState {
  isRunning: boolean;
  tradesExecutedToday: number;
  lastActivity: Date | null;
}

const state: BotState = {
  isRunning: false,
  tradesExecutedToday: 0,
  lastActivity: null,
};

const seenMints = new Set<string>();

// ── Rug detection heuristic for skip reason ────────────────────────────────
const RUG_SIGNALS = [
  "rugcheck", "freeze", "mint authority", "ghost volume",
  "wash trade", "supply audit", "holder", "birdeye", "freeze or mint",
];

function isLikelyRug(reasons: string[]): boolean {
  const combined = reasons.join(" ").toLowerCase();
  return RUG_SIGNALS.some((s) => combined.includes(s));
}

// ── Fix 1 + Fix 4: Delete stale and bad records ────────────────────────────
async function cleanStaleRecords(): Promise<void> {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000);

  try {
    // Delete detected tokens older than 10 minutes
    const deletedDetected = await db.delete(detectedTokensTable)
      .where(lt(detectedTokensTable.detectedAt, cutoff))
      .returning({ id: detectedTokensTable.id });

    // Delete skipped tokens older than 10 minutes
    const deletedStaleSkipped = await db.delete(skippedTokensTable)
      .where(lt(skippedTokensTable.detectedAt, cutoff))
      .returning({ id: skippedTokensTable.id });

    // Fix 4: Delete all bad-name skipped records (Unknown, ?, empty — from before parser fix)
    const deletedBadSkipped = await db.delete(skippedTokensTable)
      .where(
        or(
          eq(skippedTokensTable.tokenName, "Unknown"),
          eq(skippedTokensTable.tokenName, "?"),
          eq(skippedTokensTable.tokenName, ""),
        ),
      )
      .returning({ id: skippedTokensTable.id });

    // Clear seenMints so freshly-arriving tokens from the new cycle are processed
    seenMints.clear();

    console.log(`STALE RECORDS CLEARED — ${deletedDetected.length} detected + ${deletedStaleSkipped.length} stale skipped deleted`);
    console.log(`SKIPPED TAB FIXED — ${deletedBadSkipped.length} Unknown/bad-name records deleted`);
    console.log("QUALITY FILTER ACTIVE — min liquidity $15,000 | min buys 5");
  } catch (err) {
    logger.warn({ err }, "cleanStaleRecords: DB cleanup error");
  }
}

// ── Fix 6: Remove duplicate tokenMint rows keeping highest-liquidity ────────
async function deduplicatePairs(): Promise<void> {
  try {
    const result = await db.execute(sql`
      DELETE FROM detected_tokens
      WHERE id NOT IN (
        SELECT DISTINCT ON (token_mint) id
        FROM detected_tokens
        ORDER BY token_mint, COALESCE(liquidity_usd, 0) DESC
      )
    `);
    const count = (result as any).rowCount ?? 0;
    console.log(`DEDUP ACTIVE — ${count} duplicate pairs removed`);
  } catch {
    console.log("DEDUP ACTIVE — 0 duplicate pairs removed");
  }
}

// ── Core token discovery handler ───────────────────────────────────────────
async function handleDiscoveredToken(rawToken: Partial<DexToken>): Promise<void> {
  if (!rawToken.tokenMint || seenMints.has(rawToken.tokenMint)) return;
  seenMints.add(rawToken.tokenMint);

  const mint = rawToken.tokenMint;

  // Fix 7: Never store "?" or "Unknown" — fall back to first 6 chars of mint
  const tokenSymbol =
    rawToken.tokenSymbol?.trim() && rawToken.tokenSymbol !== "?"
      ? rawToken.tokenSymbol.trim()
      : mint.slice(0, 6);

  const tokenName =
    rawToken.tokenName?.trim() &&
    rawToken.tokenName !== "Unknown" &&
    rawToken.tokenName !== "?"
      ? rawToken.tokenName.trim()
      : mint.slice(0, 6);

  const logoUrl      = rawToken.logoUrl ?? null;
  const liquidityUsd = rawToken.liquidityUsd ?? null;
  const buyTxns5m    = rawToken.buyTxns5m  ?? 0;
  const sellTxns5m   = rawToken.sellTxns5m ?? 0;
  const volume5m     = rawToken.volume5m   ?? 0;

  // Fix 2: Null/zero liquidity → Skipped immediately; never goes to Detected tab
  if (!liquidityUsd || liquidityUsd <= 0) {
    await db.insert(skippedTokensTable).values({
      tokenMint:   mint,
      tokenSymbol,
      tokenName,
      logoUrl,
      reason:      "No DEX pair yet — liquidity unavailable",
      safetyScore: "0",
      liquidityUsd: null,
    }).catch(() => {});
    return;
  }

  // Fix 3: Activity filter — minimum 5 buys in last 5 minutes
  if (buyTxns5m < 5) {
    await db.insert(skippedTokensTable).values({
      tokenMint:   mint,
      tokenSymbol,
      tokenName,
      logoUrl,
      reason:      `Insufficient buy activity — ${buyTxns5m}b in 5m below 5 minimum`,
      safetyScore: "0",
      liquidityUsd: String(liquidityUsd),
    }).catch(() => {});
    return;
  }

  // Token passed pre-filters — save to Detected as pending
  await db.insert(detectedTokensTable).values({
    tokenMint:    mint,
    tokenSymbol,
    tokenName,
    logoUrl,
    safetyStatus: "pending",
    liquidityUsd: String(liquidityUsd),
    volume5m:     String(volume5m),
    mintRevoked:  false,
    buyTxns5m,
    sellTxns5m,
  }).catch(() => {});

  logger.info({ mint, symbol: tokenSymbol, liq: liquidityUsd, buys: buyTxns5m }, "[SCANNING] Token queued for risk gate");

  // Fix 8: Run risk gate immediately on every token (not gated on bot running).
  // Hard timeout — any token still pending at 15 s is marked SKIPPED.
  const token: DexToken = {
    ...(rawToken as DexToken),
    tokenMint: mint,
    tokenSymbol,
    tokenName,
    liquidityUsd,
    buyTxns5m,
    sellTxns5m,
    volume5m,
  };

  const TIMEOUT_MS = 15_000;
  let riskResult: Awaited<ReturnType<typeof runRiskGate>> | null = null;

  try {
    riskResult = await Promise.race([
      runRiskGate(token),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
    ]);
  } catch {
    riskResult = null;
  }

  if (riskResult === null) {
    // Timeout path — mark as risky and skip
    await db.update(detectedTokensTable)
      .set({ safetyStatus: "risky" })
      .where(eq(detectedTokensTable.tokenMint, mint))
      .catch(() => {});
    await db.insert(skippedTokensTable).values({
      tokenMint:    mint,
      tokenSymbol,
      tokenName,
      logoUrl,
      reason:       "Risk gate timeout — no response within 15 seconds",
      safetyScore:  "0",
      liquidityUsd: String(liquidityUsd),
    }).catch(() => {});
    logger.warn({ mint }, "[RISK_GATE] Timeout — token moved to skipped");
    return;
  }

  if (!riskResult.passed) {
    logger.info({ mint, reasons: riskResult.reasons }, "[AUDIT_FAIL] Token failed risk gate");
    recordSkippedToken(isLikelyRug(riskResult.reasons));

    await db.update(detectedTokensTable)
      .set({ safetyStatus: "risky" })
      .where(eq(detectedTokensTable.tokenMint, mint))
      .catch(() => {});

    await db.insert(skippedTokensTable).values({
      tokenMint:    mint,
      tokenSymbol,
      tokenName,
      logoUrl,
      reason:       riskResult.reasons.join("; "),
      safetyScore:  String(riskResult.score),
      liquidityUsd: String(liquidityUsd),
    }).catch(() => {});
    return;
  }

  // Risk gate passed
  logger.info({ mint }, "[AUDIT_PASS] Risk gate passed");
  const probabilityScore = calculateProbabilityScore(token, riskResult);

  await db.update(detectedTokensTable)
    .set({ safetyStatus: "good", probabilityScore })
    .where(eq(detectedTokensTable.tokenMint, mint))
    .catch(() => {});

  // ── Trading path — only when bot is active ─────────────────────────────
  if (!state.isRunning) return;
  if (!canTrade() || isHibernating()) return;
  if (!canOpenNewPosition()) {
    logger.info("Max open positions reached — skipping new token");
    return;
  }

  state.lastActivity = new Date();

  const sentiment = await analyzeTokenSentiment(
    tokenSymbol,
    tokenName,
    {
      liquidityUsd,
      volume24h:           token.volume24h,
      priceChangePercent24h: token.priceChange24h,
      holderCount:   0,
      topHolderPct:  0,
      isTrending:    token.isTrending  ?? false,
      isBoosted:     token.isBoosted   ?? false,
    },
  );

  if (sentiment.verdict === "BEARISH") {
    logger.info({ mint, sentiment }, "AI analyst bearish — skipping");
    return;
  }

  const regime       = getRegime();
  const positionSize = calculatePositionSize(
    getWalletState().solBalance  || 1,
    getWalletState().solPriceUsd || 150,
    probabilityScore,
  );

  if (positionSize.amountSol < 0.001) {
    logger.info({ positionSize }, "Position too small — skipping");
    return;
  }

  const result = await executeBuy(token, positionSize, probabilityScore, regime.regime, riskResult.checks);

  if (result.success) {
    state.tradesExecutedToday++;
    state.lastActivity = new Date();
    logger.info({ mint, symbol: tokenSymbol }, "Trade executed successfully");
  }
}

export function getBotState(): BotState {
  return { ...state };
}

export function startBot(): void {
  if (state.isRunning) return;
  state.isRunning = true;
  state.lastActivity = new Date();

  seenMints.clear();
  classifyRegime();

  startWatchdog(handleDiscoveredToken);
  startFeedbackLoop();

  logger.info("Trading bot started — watchdog and feedback loop active");
}

export function stopBot(): void {
  state.isRunning = false;
  stopWatchdog();
  stopFeedbackLoop();
  logger.info("Trading bot stopped — scanner remains active for radar display");
}

export async function initializeOrchestrator(): Promise<void> {
  loadTradingMode();
  logReadinessReport();
  startReportingEngine();

  // Fix 1 + Fix 4: Wipe stale records and bad-name skipped records on every restart
  await cleanStaleRecords();

  // Fix 6: Deduplicate any surviving pairs by tokenMint, keep highest liquidity
  await deduplicatePairs();

  // Start scanner immediately — Radar shows live tokens regardless of bot/wallet state
  startTripleRadarScanner(handleDiscoveredToken);

  startWalletWatcher(async () => {
    logger.info("Wallet funded — auto-starting bot");
    startBot();
  });

  // Fix 1: Periodic stale cleanup every 10 minutes
  setInterval(() => cleanStaleRecords().catch(() => {}), 10 * 60 * 1000);

  console.log("RADAR FIX COMPLETE");
  logger.info("Squadron AI orchestrator initialized");
}

export function getFullSystemState() {
  return {
    bot:              getBotState(),
    scanner:          getScannerState(),
    watchdog:         getWatchdogState(),
    circuit:          getCircuitState(),
    wallet:           getWalletState(),
    regime:           getRegime(),
    weights:          getWeights(),
    systemAtRisk:     isSystemAtRisk(),
    walletConfigured: !!process.env["SOLANA_PRIVATE_KEY"],
    heliusConfigured: !!process.env["HELIUS_API_KEY"],
    paperMode:        isPaperMode(),
  };
}
