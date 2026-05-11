import { logger } from "./logger";
import { db, skippedTokensTable, detectedTokensTable } from "@workspace/db";
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
import { loadTradingMode } from "./tradingMode";
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

async function handleDiscoveredToken(rawToken: Partial<DexToken>): Promise<void> {
  if (!rawToken.tokenMint || seenMints.has(rawToken.tokenMint)) return;
  seenMints.add(rawToken.tokenMint);

  if (!state.isRunning) return;
  if (!canTrade() || isHibernating()) return;
  if (!canOpenNewPosition()) {
    logger.info("Max open positions reached — skipping new token");
    return;
  }

  const token = rawToken as DexToken;
  state.lastActivity = new Date();

  logger.info({ mint: token.tokenMint, symbol: token.tokenSymbol }, "[SCANNING] New token discovered");

  await db.insert(detectedTokensTable).values({
    tokenMint: token.tokenMint,
    tokenSymbol: token.tokenSymbol ?? "?",
    tokenName: token.tokenName ?? "Unknown",
    safetyStatus: "pending",
    liquidityUsd: String(token.liquidityUsd ?? 0),
    mintRevoked: false,
    buyTxns5m: token.buyTxns5m ?? 0,
    sellTxns5m: token.sellTxns5m ?? 0,
  }).onConflictDoNothing().catch(() => {});

  const riskResult = await runRiskGate(token);

  if (!riskResult.passed) {
    logger.info({ mint: token.tokenMint, reasons: riskResult.reasons }, "[AUDIT_FAIL] Token failed risk gate");
    await db.insert(skippedTokensTable).values({
      tokenMint: token.tokenMint,
      tokenSymbol: token.tokenSymbol ?? "?",
      tokenName: token.tokenName ?? "Unknown",
      reason: riskResult.reasons.join("; "),
      safetyScore: String(riskResult.score),
    }).onConflictDoNothing().catch(() => {});
    return;
  }

  logger.info({ mint: token.tokenMint }, "[AUDIT_PASS] Risk gate passed");

  const sentiment = await analyzeTokenSentiment(
    token.tokenSymbol ?? "?",
    token.tokenName ?? "Unknown",
    {
      liquidityUsd: token.liquidityUsd,
      volume24h: token.volume24h,
      priceChangePercent24h: token.priceChange24h,
      holderCount: 0,
      topHolderPct: 0,
      isTrending: token.isTrending ?? false,
      isBoosted: token.isBoosted ?? false,
    },
  );

  if (sentiment.verdict === "BEARISH") {
    logger.info({ mint: token.tokenMint, sentiment }, "AI analyst bearish — skipping");
    return;
  }

  const probabilityScore = calculateProbabilityScore(token, riskResult);
  const regime = getRegime();
  const positionSize = calculatePositionSize(
    getWalletState().solBalance || 1,
    getWalletState().solPriceUsd || 150,
    probabilityScore,
  );

  if (positionSize.amountSol < 0.001) {
    logger.info({ positionSize }, "Position too small — skipping");
    return;
  }

  const result = await executeBuy(
    token,
    positionSize,
    probabilityScore,
    regime.regime,
    riskResult.checks,
  );

  if (result.success) {
    state.tradesExecutedToday++;
    state.lastActivity = new Date();
    logger.info({ mint: token.tokenMint, symbol: token.tokenSymbol }, "Trade executed successfully");
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

  startTripleRadarScanner(handleDiscoveredToken);
  startWatchdog(handleDiscoveredToken);
  startFeedbackLoop();

  logger.info("Trading bot started — scanner, watchdog, and feedback loop active");
}

export function stopBot(): void {
  state.isRunning = false;
  stopTripleRadarScanner();
  stopWatchdog();
  stopFeedbackLoop();
  logger.info("Trading bot stopped");
}

export function initializeOrchestrator(): void {
  loadTradingMode();
  logReadinessReport();
  startReportingEngine();

  startWalletWatcher(async () => {
    logger.info("Wallet funded — auto-starting bot");
    startBot();
  });

  logger.info("Squadron AI orchestrator initialized");
}

export function getFullSystemState() {
  return {
    bot: getBotState(),
    scanner: getScannerState(),
    watchdog: getWatchdogState(),
    circuit: getCircuitState(),
    wallet: getWalletState(),
    regime: getRegime(),
    weights: getWeights(),
    systemAtRisk: isSystemAtRisk(),
    walletConfigured: !!process.env["SOLANA_PRIVATE_KEY"],
    heliusConfigured: !!process.env["HELIUS_API_KEY"],
    paperMode: process.env["PAPER_TRADE"] !== "false",
  };
}
