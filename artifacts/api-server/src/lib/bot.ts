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
import { recordPaperTrade, noRecentPaperTrades, startExitEngine } from "./paperTrading";
import type { PaperTrade } from "./paperTrading";
import type { DexToken } from "./dexScreener";
import { incrementGate } from "./scanStats";

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

// ── Relaxed sim mode — no trades in 30 min + paper mode ─────────────────────
function isRelaxedSimMode(): boolean {
  if (!isPaperMode()) return false;
  return noRecentPaperTrades(30);
}

// ── Narrative spam keywords ──────────────────────────────────────────────────
const SPAM_KEYWORDS = [
  "banana", "pup", "cat", "dog", "pepe", "trump", "elon", "moon", "inu",
  "frog", "bear", "bull", "wojak", "chad", "shib", "doge", "bonk", "wif",
];

// ── Stale record cleanup ─────────────────────────────────────────────────────
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
  } catch (err) {
    logger.warn({ err }, "cleanStaleRecords: DB cleanup error");
  }
}

// ── Dedup detected tokens ─────────────────────────────────────────────────────
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

// ── Core token discovery handler ──────────────────────────────────────────────
async function handleDiscoveredToken(rawToken: Partial<DexToken>): Promise<void> {
  if (!rawToken.tokenMint || seenMints.has(rawToken.tokenMint)) return;
  seenMints.add(rawToken.tokenMint);

  const mint = rawToken.tokenMint;
  const isBonding = rawToken.source === "BONDING";

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
  const marketCap    = rawToken.marketCap != null ? String(rawToken.marketCap) : null;

  // ── Pre-filter 1: Null/zero liquidity → Skipped (skip for BONDING) ────────
  if (!isBonding && (!liquidityUsd || liquidityUsd <= 0)) {
    await db.insert(skippedTokensTable).values({
      tokenMint: mint, tokenSymbol, tokenName, logoUrl,
      reason:    "No DEX pair yet — liquidity unavailable",
      safetyScore: "0", liquidityUsd: null, marketCap,
    }).catch(() => {});
    return;
  }

  // ── Relaxed sim mode thresholds ──────────────────────────────────────────
  const relaxed = isRelaxedSimMode();
  const minLiq  = relaxed ? 10_000 : 15_000;

  // ── C1: Two-tier buy threshold ───────────────────────────────────────────
  // Below $500k market cap: require 5 buys; above $500k: require 3 buys
  const mcapNum = rawToken.marketCap != null ? Number(rawToken.marketCap) : 0;
  const tierMinBuys = mcapNum >= 500_000 ? 3 : 5;
  const minBuys = relaxed ? Math.min(tierMinBuys, 3) : tierMinBuys;

  // ── Tier system — enforce liquidity window (skip for BONDING) ─────────────
  if (!isBonding) {
    const liq = liquidityUsd ?? 0;
    if (liq < minLiq) {
      const actualLiq = `$${Math.round(liq).toLocaleString()}`;
      await db.insert(skippedTokensTable).values({
        tokenMint: mint, tokenSymbol, tokenName, logoUrl,
        reason:    `Liquidity too low — below $${(minLiq / 1000).toFixed(0)}k minimum (${actualLiq})`,
        safetyScore: "0", liquidityUsd: String(liq), marketCap,
      }).catch(() => {});
      return;
    }

    if (liq > 500_000) {
      await db.insert(skippedTokensTable).values({
        tokenMint: mint, tokenSymbol, tokenName, logoUrl,
        reason:    "Liquidity too high — low profit potential for meme trading",
        safetyScore: "0", liquidityUsd: String(liq), marketCap,
      }).catch(() => {});
      return;
    }
  }

  // ── Pre-filter 2: Activity gate (skip for BONDING) ────────────────────────
  if (!isBonding && buyTxns5m < minBuys) {
    await db.insert(skippedTokensTable).values({
      tokenMint: mint, tokenSymbol, tokenName, logoUrl,
      reason:    `Insufficient buy activity — ${buyTxns5m}b in 5m below ${minBuys} minimum${relaxed ? " (relaxed)" : ""}`,
      safetyScore: "0", liquidityUsd: String(liquidityUsd ?? 0), marketCap,
    }).catch(() => {});
    return;
  }

  // ── Narrative spam filter ─────────────────────────────────────────────────
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
          safetyScore: "0", liquidityUsd: String(liquidityUsd ?? 0), marketCap,
        }).catch(() => {});
        logger.info({ mint, keyword: matchedKeyword }, "[SPAM_FILTER] Narrative duplicate skipped");
        return;
      }
    } catch (err) {
      logger.warn({ err }, "Narrative filter DB check failed — allowing token");
    }
  }

  // ── Save to Detected as pending ───────────────────────────────────────────
  await db.insert(detectedTokensTable).values({
    tokenMint: mint, tokenSymbol, tokenName, logoUrl,
    safetyStatus: "pending",
    liquidityUsd: String(liquidityUsd ?? 0),
    volume5m:     String(volume5m),
    marketCap,
    mintRevoked:  false,
    buyTxns5m,
    sellTxns5m,
  }).catch(() => {});

  logger.info({ mint, symbol: tokenSymbol, liq: liquidityUsd, buys: buyTxns5m, bonding: isBonding }, "[SCANNING] Token queued for risk gate");
  incrementGate("scanned");

  // ── Risk gate ─────────────────────────────────────────────────────────────
  const token: DexToken = {
    ...(rawToken as DexToken),
    tokenMint: mint, tokenSymbol, tokenName,
    liquidityUsd: liquidityUsd ?? 0, buyTxns5m, sellTxns5m, volume5m,
  };

  const verdictStart = Date.now();
  let riskResult: Awaited<ReturnType<typeof runRiskGate>> | null = null;
  try {
    riskResult = await Promise.race([
      runRiskGate(token),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 15_000)),
    ]);
  } catch {
    riskResult = null;
  }
  const verdictMs = Date.now() - verdictStart;

  // ── Gate funnel stats — track what passed each checkpoint ───────────────────
  if (riskResult) {
    const c = riskResult.checks ?? {};
    if (c["liquidity"] === true)                                            incrementGate("passedLiquidity");
    if (typeof c["rugcheck"] === "string" && c["birdeye"] === true)         incrementGate("passedRugCheck");
    if ("walletSeeding" in c && c["walletSeeding"] !== false)               incrementGate("passedWalletChecks");
    if (riskResult.passed)                                                  incrementGate("passedAllGates");
  }

  if (riskResult === null) {
    logger.warn({ mint, verdictMs }, "[RISK_GATE] TIMEOUT — no response within 15s — token moved to skipped");
    await db.update(detectedTokensTable)
      .set({ safetyStatus: "risky", failureLabel: "TIMEOUT" })
      .where(eq(detectedTokensTable.tokenMint, mint))
      .catch(() => {});
    await db.insert(skippedTokensTable).values({
      tokenMint: mint, tokenSymbol, tokenName, logoUrl,
      reason:       "Risk gate timeout — no response within 15 seconds",
      safetyScore:  "0", liquidityUsd: String(liquidityUsd ?? 0), marketCap,
    }).catch(() => {});
    return;
  }

  if (!riskResult.passed) {
    logger.info({ mint, reasons: riskResult.reasons, verdictMs }, `[AUDIT_FAIL] Token failed risk gate — verdict in ${verdictMs}ms`);
    recordSkippedToken(isLikelyRug(riskResult.reasons));

    await db.update(detectedTokensTable)
      .set({ safetyStatus: "risky", failureLabel: riskResult.failureLabel ?? "FILTERED" })
      .where(eq(detectedTokensTable.tokenMint, mint))
      .catch(() => {});

    await db.insert(skippedTokensTable).values({
      tokenMint: mint, tokenSymbol, tokenName, logoUrl,
      reason:      riskResult.reasons.join("; "),
      safetyScore: String(riskResult.score),
      liquidityUsd: String(liquidityUsd ?? 0),
      marketCap,
    }).catch(() => {});
    return;
  }

  // ── Risk gate passed ──────────────────────────────────────────────────────
  logger.info({ mint }, "[AUDIT_PASS] Risk gate passed");
  const probabilityScore = calculateProbabilityScore(token, riskResult);

  await db.update(detectedTokensTable)
    .set({
      safetyStatus: "good",
      probabilityScore,
      failureLabel: riskResult.unverified ? "UNVERIFIED" : null,
    })
    .where(eq(detectedTokensTable.tokenMint, mint))
    .catch(() => {});

  // ── Paper trade execution ─────────────────────────────────────────────────
  if (isPaperMode()) {
    const liq = liquidityUsd ?? 0;
    const tier = isBonding ? "BONDING" : liq >= 100_000 ? "SAFE" : "MOON";

    // C2: entry threshold — 60 relaxed/smart-money, 65 graduation/bonding, 70 standard
    const scoreThreshold = relaxed ? 60 : isBonding ? 65 : 70;
    if (probabilityScore < scoreThreshold) {
      logger.info({ mint, probabilityScore, scoreThreshold }, "[SIM] Score below threshold — skipped");
      return;
    }

    // C2: base position by tier (% of $100 sim balance)
    // BONDING = 2% ($2), MOON = 10% ($10), SAFE = 20% ($20)
    let positionSizeUsd = tier === "SAFE" ? 20 : tier === "BONDING" ? 2 : 10;
    if (riskResult.unverified) positionSizeUsd = Math.min(positionSizeUsd, 5);

    // C2: apply holder concentration / liquidity quality position adjustment
    const adjPct = riskResult.positionAdjustmentPct ?? 100;
    if (adjPct < 100) {
      positionSizeUsd = Math.max(1, Math.round(positionSizeUsd * adjPct / 100));
    }
    const positionSizeSol = positionSizeUsd / 150;

    const extraSig = riskResult.extraSignals;
    const signalsArr: string[] = [...(riskResult.signalsTriggered ?? [])];
    if (relaxed) signalsArr.push("SIM_RELAXED");

    const pt: PaperTrade = {
      id: `pt_${Date.now()}_${mint.slice(0, 8)}`,
      tokenMint: mint,
      tokenSymbol,
      tokenName,
      logoUrl: logoUrl ?? undefined,
      socialLinks: rawToken.socialLinks ?? undefined,
      type: "buy",
      amountSol: positionSizeSol,
      positionSizeUsd,
      tier,
      entryPrice: token.priceUsd,
      exitPrice: null,
      pnlSol: null,
      pnlUsd: null,
      filtersPassedCount: Object.values(riskResult.checks).filter((v) => v !== false).length,
      filtersFailedCount: Object.values(riskResult.checks).filter((v) => v === false).length,
      filterDetails: riskResult.checks,
      probabilityScore,
      scoreBreakdownJson: riskResult.scoreBreakdownJson,
      signalsTriggered: signalsArr,
      regime: getRegime().regime,
      timestamp: new Date().toISOString(),
      exitTimestamp: null,
      relaxedMode: relaxed,
      sniperRiskPct: extraSig?.sniperRiskPct ?? 0,
      walletAgeDays: extraSig?.walletAgeScore ?? 0,
      volumeConsistencyScore: extraSig?.volumeConsistencyScore ?? 0,
      holderGrowthPattern: extraSig?.holderGrowthLabel ?? null,
      entryLiquidity: liquidityUsd ?? 0,
      entryMarketCap: mcapNum,
      entryVolume5m: volume5m,
      entryBuys5m: buyTxns5m,
      entrySells5m: sellTxns5m,
      entryRegime: getRegime().regime,
    };

    recordPaperTrade(pt);
    incrementGate("actualEntries");
    state.tradesExecutedToday++;
    console.log(
      `[SIM] BUY — ${tokenName} (${tokenSymbol}) — entry $${token.priceUsd?.toFixed(8) ?? "?"} — $${positionSizeUsd}${isBonding ? " [BONDING]" : ""}${relaxed ? " [SIM-RELAXED]" : ""} — score ${probabilityScore}`,
    );
    return;
  }

  // ── Trading path — live mode ───────────────────────────────────────────────
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
      liquidityUsd: liquidityUsd ?? 0,
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

export function restartScanner(): void {
  console.log("AUTO-RESTART — restarting triple-radar scanner");
  stopTripleRadarScanner();
  setTimeout(() => {
    startTripleRadarScanner(handleDiscoveredToken);
    console.log("AUTO-RESTART — scanner restarted successfully");
  }, 1500);
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

  // ── C1: Secondary watchdog — every 120s check if scanner IDLE, auto-restart ──
  setInterval(() => {
    const scannerState = getScannerState();
    const isIdle = !scannerState.lastSuccessfulScan ||
      Date.now() - new Date(scannerState.lastSuccessfulScan).getTime() > 120_000;
    if (isIdle) {
      console.log("SCANNER STALLED — AUTO-RESTART TRIGGERED");
      restartScanner();
    } else {
      logger.debug("[SECONDARY_WATCHDOG] Scanner active — last scan within 120s");
    }
  }, 120_000);
  console.log("SECONDARY WATCHDOG ACTIVE — checking scanner every 120s");

  setInterval(() => cleanStaleRecords().catch(() => {}), 10 * 60 * 1000);

  startExitEngine();
  console.log("EXIT ENGINE ACTIVE — 30s price checks, stored-price fallback, moonbag tier protection");
  console.log("COMMAND 1 ACTIVE");
  console.log("BONDING CURVE FIX ACTIVE — source=BONDING skips liquidity/pair/buyers checks");
  console.log("TWO-TIER BUY THRESHOLD ACTIVE — <$500k: 5 buys | >$500k: 3 buys");
  console.log("BITQUERY NOT CONFIGURED — neutral score logged when key missing");
  console.log("LATE ENTRY SELL PRESSURE FILTER ACTIVE — 1.5:1 ratio blocks");
  console.log("DEAD TOKEN FILTER ACTIVE — -50% 24h price drop blocks");
  console.log("SNIPER ACCUMULATION CHECK ACTIVE — >25% blocks, >15% -20pts");
  console.log("WALLET SEEDING DETECTION ACTIVE — >5 gas wallets blocks");
  console.log("WALLET AGE QUALITY SCORE ACTIVE — VETERAN/FRESH/NEW labels");
  console.log("VOLUME CONSISTENCY SCORE ACTIVE — CONSISTENT/SPIKE labels");
  console.log("HOLDER GROWTH PATTERN ACTIVE — ORGANIC/ARTIFICIAL labels");
  console.log("CONTEXT-AWARE MOONBAG PROTECTION ACTIVE — 3-tier system");
  // ── COMMAND corrections ────────────────────────────────────────────────────
  console.log("FIX 1 ACTIVE — EXIT ENGINE: 30s interval + stored-price fallback when DexScreener fails");
  console.log("FIX 2 ACTIVE — RUGCHECK RADAR: safetyStatus=risky tokens excluded from /tokens/recent feed");
  console.log("FIX 2 ACTIVE — RISK GATE: passed= uses reasons.length===0 only (OR-bug removed)");
  console.log("FIX 3 ACTIVE — POST-PEAK ENTRY GUARD: 2h+ old, >300% pumped, vol<$2k blocks entry");
  console.log("FIX 4 ACTIVE — POSITION SIZER: sim balance scales off live SOL price each entry");
  console.log("CORRECTIONS COMPLETE.");
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
