import { logger } from "./logger";
import { db, skippedTokensTable, detectedTokensTable } from "@workspace/db";
import { eq, lt, or, sql, and, gt, ilike } from "drizzle-orm";
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

// ── Fix 4: Narrative spam keywords ─────────────────────────────────────────
const SPAM_KEYWORDS = [
  "banana", "pup", "cat", "dog", "pepe", "trump", "elon", "moon", "inu",
  "frog", "bear", "bull", "wojak", "chad", "shib", "doge", "bonk", "wif",
];

// ── Stale record cleanup ───────────────────────────────────────────────────
async function cleanStaleRecords(): Promise<void> {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000);
  try {
    const deletedDetected = await db.delete(detectedTokensTable)
      .where(lt(detectedTokensTable.detectedAt, cutoff))
      .returning({ id: detectedTokensTable.id });

    const deletedStaleSkipped = await db.delete(skippedTokensTable)
      .where(lt(skippedTokensTable.detectedAt, cutoff))
      .returning({ id: skippedTokensTable.id });

    const deletedBadSkipped = await db.delete(skippedTokensTable)
      .where(
        or(
          eq(skippedTokensTable.tokenName, "Unknown"),
          eq(skippedTokensTable.tokenName, "?"),
          eq(skippedTokensTable.tokenName, ""),
        ),
      )
      .returning({ id: skippedTokensTable.id });

    seenMints.clear();

    console.log(`STALE RECORDS CLEARED — ${deletedDetected.length} detected + ${deletedStaleSkipped.length} stale skipped deleted`);
    console.log(`SKIPPED TAB FIXED — ${deletedBadSkipped.length} Unknown/bad-name records deleted`);
    console.log("QUALITY FILTER ACTIVE — min liquidity $15,000 | min buys 5");
  } catch (err) {
    logger.warn({ err }, "cleanStaleRecords: DB cleanup error");
  }
}

// ── Dedup detected tokens by tokenMint keeping highest liquidity ─────────
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

  // Always resolve symbol and name — never store "?" or "Unknown"
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

  // ── Pre-filter 1: Null/zero liquidity → Skipped ─────────────────────────
  if (!liquidityUsd || liquidityUsd <= 0) {
    await db.insert(skippedTokensTable).values({
      tokenMint: mint, tokenSymbol, tokenName, logoUrl,
      reason:    "No DEX pair yet — liquidity unavailable",
      safetyScore: "0", liquidityUsd: null,
    }).catch(() => {});
    return;
  }

  // ── Fix 3: Tier system — enforce $15k–$500k window ──────────────────────
  if (liquidityUsd < 15_000) {
    await db.insert(skippedTokensTable).values({
      tokenMint: mint, tokenSymbol, tokenName, logoUrl,
      reason:    `Liquidity too low — below $15k minimum ($${Math.round(liquidityUsd).toLocaleString()})`,
      safetyScore: "0", liquidityUsd: String(liquidityUsd),
    }).catch(() => {});
    return;
  }

  if (liquidityUsd > 500_000) {
    await db.insert(skippedTokensTable).values({
      tokenMint: mint, tokenSymbol, tokenName, logoUrl,
      reason:    "Liquidity too high — low profit potential for meme trading",
      safetyScore: "0", liquidityUsd: String(liquidityUsd),
    }).catch(() => {});
    return;
  }

  // ── Pre-filter 2: Activity gate (min 5 buys in 5m) ──────────────────────
  if (buyTxns5m < 5) {
    await db.insert(skippedTokensTable).values({
      tokenMint: mint, tokenSymbol, tokenName, logoUrl,
      reason:    `Insufficient buy activity — ${buyTxns5m}b in 5m below 5 minimum`,
      safetyScore: "0", liquidityUsd: String(liquidityUsd),
    }).catch(() => {});
    return;
  }

  // ── Fix 4: Narrative spam filter ─────────────────────────────────────────
  const nameLower = tokenName.toLowerCase();
  const matchedKeyword = SPAM_KEYWORDS.find((kw) => nameLower.includes(kw));

  if (matchedKeyword) {
    try {
      const cutoff10m = new Date(Date.now() - 10 * 60 * 1000);
      const existing = await db.select({ id: detectedTokensTable.id })
        .from(detectedTokensTable)
        .where(
          and(
            gt(detectedTokensTable.detectedAt, cutoff10m),
            ilike(detectedTokensTable.tokenName, `%${matchedKeyword}%`),
          ),
        )
        .limit(3);

      if (existing.length >= 2) {
        await db.insert(skippedTokensTable).values({
          tokenMint: mint, tokenSymbol, tokenName, logoUrl,
          reason:    `Narrative duplicate — top 2 by liquidity already detected (${matchedKeyword})`,
          safetyScore: "0", liquidityUsd: String(liquidityUsd),
        }).catch(() => {});
        logger.info({ mint, keyword: matchedKeyword }, "[SPAM_FILTER] Narrative duplicate skipped");
        return;
      }
    } catch (err) {
      logger.warn({ err }, "Narrative filter DB check failed — allowing token");
    }
  }

  // ── All pre-filters passed — save to Detected as pending ────────────────
  await db.insert(detectedTokensTable).values({
    tokenMint: mint, tokenSymbol, tokenName, logoUrl,
    safetyStatus: "pending",
    liquidityUsd: String(liquidityUsd),
    volume5m:     String(volume5m),
    mintRevoked:  false,
    buyTxns5m,
    sellTxns5m,
  }).catch(() => {});

  logger.info({ mint, symbol: tokenSymbol, liq: liquidityUsd, buys: buyTxns5m }, "[SCANNING] Token queued for risk gate");

  // ── Risk gate — runs on every token, 15 s hard timeout ──────────────────
  const token: DexToken = {
    ...(rawToken as DexToken),
    tokenMint: mint, tokenSymbol, tokenName,
    liquidityUsd, buyTxns5m, sellTxns5m, volume5m,
  };

  let riskResult: Awaited<ReturnType<typeof runRiskGate>> | null = null;
  try {
    riskResult = await Promise.race([
      runRiskGate(token),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 15_000)),
    ]);
  } catch {
    riskResult = null;
  }

  if (riskResult === null) {
    await db.update(detectedTokensTable)
      .set({ safetyStatus: "risky" })
      .where(eq(detectedTokensTable.tokenMint, mint))
      .catch(() => {});
    await db.insert(skippedTokensTable).values({
      tokenMint: mint, tokenSymbol, tokenName, logoUrl,
      reason:       "Risk gate timeout — no response within 15 seconds",
      safetyScore:  "0", liquidityUsd: String(liquidityUsd),
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
      tokenMint: mint, tokenSymbol, tokenName, logoUrl,
      reason:      riskResult.reasons.join("; "),
      safetyScore: String(riskResult.score),
      liquidityUsd: String(liquidityUsd),
    }).catch(() => {});
    return;
  }

  // ── Risk gate passed ─────────────────────────────────────────────────────
  logger.info({ mint }, "[AUDIT_PASS] Risk gate passed");
  const probabilityScore = calculateProbabilityScore(token, riskResult);

  await db.update(detectedTokensTable)
    .set({ safetyStatus: "good", probabilityScore })
    .where(eq(detectedTokensTable.tokenMint, mint))
    .catch(() => {});

  // ── Trading path — only when bot is active ───────────────────────────────
  if (!state.isRunning) return;
  if (!canTrade() || isHibernating()) return;
  if (!canOpenNewPosition()) {
    logger.info("Max open positions reached — skipping new token");
    return;
  }

  state.lastActivity = new Date();

  const sentiment = await analyzeTokenSentiment(
    tokenSymbol, tokenName,
    {
      liquidityUsd,
      volume24h:             token.volume24h,
      priceChangePercent24h: token.priceChange24h,
      holderCount:  0, topHolderPct: 0,
      isTrending:   token.isTrending ?? false,
      isBoosted:    token.isBoosted  ?? false,
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

export function getBotState(): BotState { return { ...state }; }

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

  await cleanStaleRecords();
  await deduplicatePairs();

  startTripleRadarScanner(handleDiscoveredToken);

  startWalletWatcher(async () => {
    logger.info("Wallet funded — auto-starting bot");
    startBot();
  });

  setInterval(() => cleanStaleRecords().catch(() => {}), 10 * 60 * 1000);

  console.log("CRASH FIX COMPLETE");
  console.log("RADAR LIVE COMPLETE");
  console.log("TIER SYSTEM ACTIVE — Tier 1: $15k–$100k (MOON) | Tier 2: $100k–$500k (SAFE)");
  console.log("SPAM FILTER ACTIVE — narrative dedup enabled");
  console.log("SKIPPED TAB FIXED");
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
