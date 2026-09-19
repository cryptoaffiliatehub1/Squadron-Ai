import fs from "fs";
import path from "path";
import axios from "axios";
import { logger } from "./logger";
import { clearMoonbags, startMoonbagMonitor, stopMoonbagMonitor } from "./moonbagVault";
import { recordDexScreenerCall } from "./dexMetrics";

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface PaperTrade {
  id: string;
  tokenMint: string;
  tokenSymbol: string;
  tokenName: string;
  logoUrl?: string | null;
  type: "buy";
  status: "OPEN" | "PARTIAL EXIT" | "WIN" | "LOSS" | "MOONBAG" | "MOONBAG EXIT";
  amountSol: number;
  positionSizeUsd: number;
  tier: string;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  exitPrice: number | null;
  exitMultiplier: number | null;
  pnlSol: number | null;
  pnlUsd: number | null;
  moonbagAmountUsd: number | null;
  filtersPassedCount: number;
  filtersFailedCount: number;
  filterDetails: Record<string, boolean | string>;
  probabilityScore: number;
  regime: string;
  timestamp: string;
  entryTimestamp?: string;
  exitTimestamp: string | null;
  relaxedMode?: boolean;
  // C1: entry signal fields
  sniperRiskPct?: number;
  walletAgeDays?: number;
  volumeConsistencyScore?: number;
  holderGrowthPattern?: string | null;
  entryLiquidity?: number;
  entryMarketCap?: number;
  entryVolume5m?: number;
  entryBuys5m?: number;
  entrySells5m?: number;
  entryRegime?: string;
  // C2: score and signals
  scoreBreakdownJson?: string;
  signalsTriggered?: string[];
  socialLinks?: { twitter?: string; telegram?: string; website?: string };
  // C2: live data tracking (populated by exit engine every 60s)
  currentPrice?: number | null;
  currentLiquidity?: number | null;
  currentVolume5m?: number | null;
  currentBuys5m?: number | null;
  currentSells5m?: number | null;
  lastLiveFetch?: string | null;
  downsideAccelerationAt?: string | null;
  // C2: partial exit tracking
  halfSoldAt?: number | null;
  halfSoldProfit?: number | null;
  halfSoldTime?: string | null;
  // C2: moonbag fields
  remainingPositionSol?: number | null;
  remainingCostBasis?: number;
  remainingPositionUsd?: number | null;
  originalEntryUsd?: number | null;
  moonbagCreatedAt?: string | null;
  realizedProceedsUsd?: number;
  realizedCostBasisUsd?: number;
  // C2: loss tracking
  lossAmount?: number | null;
}

export interface TradeStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgWinUsd: number;
  avgLossUsd: number;
  expectancyUsd: number;
  totalPnlUsd: number;
}

export interface DailyReport {
  date: string;
  totalTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgWinSol: number;
  avgLossSol: number;
  avgWinUsd: number;
  avgLossUsd: number;
  expectancy: number;
  topFailureReason: string;
  totalPnlSol: number;
  totalPnlUsd: number;
  simBalanceUsd: number;
  biggestWin: { tokenSymbol: string; multiplier: number; pnlUsd: number; pnlSol: number } | null;
  biggestLoss: { tokenSymbol: string; pnlUsd: number; pnlSol: number; reason: string } | null;
  isPaperMode: boolean;
  allTime: TradeStats;
  today: TradeStats;
  capitalInjectedUsd: number;
  startingCapitalUsd: number;
}

export interface SimBalance {
  startingBalanceUsd: number;
  currentBalanceUsd: number;
  lockedInOpenUsd: number;
  realizedPnlUsd: number;
  pnlPct: number;
}

interface DailyCompound {
  date: string;
  startBalance: number;
  dailyTarget: number;
}

interface CapitalInjection {
  id: string;
  amountUsd: number;
  note?: string;
  timestamp: string;
}

// ── File paths ────────────────────────────────────────────────────────────────

const DATA_DIR           = path.resolve(process.cwd(), "data");
const PAPER_TRADES_FILE  = path.join(DATA_DIR, "paper_trades.json");
const DAILY_REPORT_FILE  = path.join(DATA_DIR, "daily_report.json");
const WEIGHTS_FILE       = path.join(DATA_DIR, "weights_history.json");
const DAILY_COMPOUND_FILE = path.join(DATA_DIR, "daily_compound.json");
const FAILED_REPORTS_DIR = path.join(DATA_DIR, "failed_reports");
const CAPITAL_INJECTIONS_FILE = path.join(DATA_DIR, "capital_injections.json");
const DEFAULT_BASE_CAPITAL_USD = 100;
const REFERENCE_SOL_PRICE_USD = 150;
const CAPITAL_CONFIG_FILE = path.join(DATA_DIR, "capital_config.json");
let paperWritesAllowed = true;

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch { return fallback; }
}

function writeJson(file: string, data: unknown): void {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

// C2: backward-compat — old trades had no status field; new ones have PARTIAL EXIT and MOONBAG EXIT
function resolveStatus(t: any): PaperTrade["status"] {
  if (t.status) return t.status as PaperTrade["status"];
  if (t.exitTimestamp && t.pnlSol !== null) return t.pnlSol > 0 ? "WIN" : "LOSS";
  return "OPEN";
}

function getTodayUTC(): string {
  return new Date().toISOString().split("T")[0];
}

export function isPaperMode(): boolean {
  try {
    const { isPaperMode: tm } = require("./tradingMode") as { isPaperMode: () => boolean };
    return tm();
  } catch { return true; }
}

// ── Relaxed sim mode ──────────────────────────────────────────────────────────
export function noRecentPaperTrades(windowMinutes = 30): boolean {
  try {
    const trades = readJson<any[]>(PAPER_TRADES_FILE, []);
    const cutoff = Date.now() - windowMinutes * 60_000;
    return trades.filter((t) => new Date(t.timestamp).getTime() > cutoff).length === 0;
  } catch { return true; }
}

// ── Dedup: one open trade per mint ───────────────────────────────────────────
export function hasOpenPaperTrade(mint: string): boolean {
  try {
    const trades = readJson<any[]>(PAPER_TRADES_FILE, []);
    return trades.some((t) => t.tokenMint === mint && resolveStatus(t) === "OPEN");
  } catch { return false; }
}

// ── Read helpers ──────────────────────────────────────────────────────────────
export function getPaperTrades(): PaperTrade[] {
  const raw = readJson<any[]>(PAPER_TRADES_FILE, []);
  return raw.map((t) => ({
    ...t,
    status: resolveStatus(t),
    entryTimestamp: t.entryTimestamp ?? t.timestamp,
  })) as PaperTrade[];
}

function finiteNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getCapitalInjections(): CapitalInjection[] {
  return readJson<CapitalInjection[]>(CAPITAL_INJECTIONS_FILE, [])
    .filter((i) => finiteNumber(i.amountUsd) > 0);
}

export function getBaseCapitalUsd(): number {
  const config = readJson<{ baseCapitalUsd?: unknown } | null>(CAPITAL_CONFIG_FILE, null);
  const raw = config?.baseCapitalUsd;
  // Explicitly distinguish a valid zero from an absent value. Zero is a real
  // configured base and must not fall back to the legacy $100 default.
  if (raw === undefined || raw === null) return DEFAULT_BASE_CAPITAL_USD;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_BASE_CAPITAL_USD;
}

export function setBaseCapitalUsd(baseCapitalUsd: number): number {
  if (!Number.isFinite(baseCapitalUsd) || baseCapitalUsd < 0) {
    throw new Error("baseCapitalUsd must be a non-negative number");
  }
  writeJson(CAPITAL_CONFIG_FILE, { baseCapitalUsd: Math.round(baseCapitalUsd * 100) / 100 });
  logger.info({ baseCapitalUsd }, "[SIM] Base capital configured");
  return getBaseCapitalUsd();
}

export function setPaperTradeWritesAllowed(allowed: boolean): void {
  paperWritesAllowed = allowed;
  logger.info({ allowed }, `[RESET_GUARD] paper position writes ${allowed ? "enabled" : "blocked"}`);
}

export function arePaperTradeWritesAllowed(): boolean {
  return paperWritesAllowed;
}

export function getCapitalSummary() {
  const injections = getCapitalInjections();
  return {
    baseBalanceUsd: getBaseCapitalUsd(),
    injectedUsd: injections.reduce((sum, i) => sum + finiteNumber(i.amountUsd), 0),
    injections,
  };
}

export function addCapitalInjection(amountUsd: number, note?: string): CapitalInjection {
  if (!isPaperMode()) {
    throw new Error("Capital injection is available only in simulation mode");
  }
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    throw new Error("amountUsd must be a positive number");
  }
  const injection: CapitalInjection = {
    id: `ci_${Date.now()}`,
    amountUsd: Math.round(amountUsd * 100) / 100,
    note: note?.trim() || undefined,
    timestamp: new Date().toISOString(),
  };
  const injections = getCapitalInjections();
  injections.push(injection);
  writeJson(CAPITAL_INJECTIONS_FILE, injections);
  logger.info({ amountUsd: injection.amountUsd }, "[SIM] Capital injected");
  return injection;
}

export interface RealizedLeg {
  tradeId: string;
  tokenMint: string;
  tokenSymbol: string;
  status: PaperTrade["status"];
  proceedsUsd: number;
  costBasisUsd: number;
  pnlUsd: number;
  pnlSol: number;
  timestamp: string;
  reason: string;
}

/**
 * Normalize old and new paper records into actual realized exit legs.
 * Older records used halfSoldProfit for sale proceeds, so those records are
 * handled here without rewriting the user's ledger.
 */
export function getRealizedLegs(trades = getPaperTrades()): RealizedLeg[] {
  const legs: RealizedLeg[] = [];
  for (const trade of trades) {
    const status = resolveStatus(trade);
    const positionCost = finiteNumber(trade.positionSizeUsd);
    let proceeds = finiteNumber(trade.realizedProceedsUsd, NaN);
    let costBasis = finiteNumber(trade.realizedCostBasisUsd, NaN);
    let reason = status === "LOSS" ? "Stop loss" : "Paper exit";

    if (status === "MOONBAG") {
      if (!Number.isFinite(proceeds) || proceeds <= 0) continue;
      costBasis = 0;
      reason = "Moonbag sale";
    } else if (status === "MOONBAG EXIT") {
      proceeds = Number.isFinite(proceeds) ? proceeds : finiteNumber(trade.pnlUsd);
      costBasis = 0;
      reason = "Moonbag exit";
    } else if (status === "PARTIAL EXIT") {
      proceeds = Number.isFinite(proceeds)
        ? proceeds
        : finiteNumber(trade.halfSoldProfit, positionCost * 0.5 * finiteNumber(trade.exitMultiplier));
      costBasis = Number.isFinite(costBasis) ? costBasis : positionCost * 0.5;
      reason = "Golden partial exit";
    } else if (status === "LOSS") {
      const multiplier = finiteNumber(
        trade.exitMultiplier,
        trade.entryPrice > 0 && trade.exitPrice ? trade.exitPrice / trade.entryPrice : 0,
      );
      proceeds = Number.isFinite(proceeds) ? proceeds : positionCost * multiplier;
      costBasis = Number.isFinite(costBasis) ? costBasis : positionCost;
    } else if (status === "WIN") {
      const pnl = finiteNumber(trade.pnlUsd);
      proceeds = Number.isFinite(proceeds) ? proceeds : positionCost + pnl;
      costBasis = Number.isFinite(costBasis) ? costBasis : positionCost;
      reason = "Take profit";
    } else if (status === "OPEN" && Number.isFinite(proceeds) && proceeds > 0) {
      costBasis = Number.isFinite(costBasis) ? costBasis : 0;
      reason = "Manual partial exit";
    } else {
      continue;
    }

    const pnlUsd = proceeds - costBasis;
    legs.push({
      tradeId: trade.id,
      tokenMint: trade.tokenMint,
      tokenSymbol: trade.tokenSymbol,
      status,
      proceedsUsd: Math.max(0, proceeds),
      costBasisUsd: Math.max(0, costBasis),
      pnlUsd,
      pnlSol: pnlUsd / REFERENCE_SOL_PRICE_USD,
      timestamp: trade.exitTimestamp ?? trade.timestamp,
      reason,
    });
  }
  return legs;
}

function summarizeLegs(legs: RealizedLeg[]): TradeStats {
  const wins = legs.filter((leg) => leg.pnlUsd > 0);
  const losses = legs.filter((leg) => leg.pnlUsd < 0);
  const totalTrades = wins.length + losses.length;
  const avgWinUsd = wins.length ? wins.reduce((sum, leg) => sum + leg.pnlUsd, 0) / wins.length : 0;
  const avgLossUsd = losses.length
    ? Math.abs(losses.reduce((sum, leg) => sum + leg.pnlUsd, 0) / losses.length)
    : 0;
  const winRate = totalTrades ? wins.length / totalTrades : 0;
  return {
    totalTrades,
    wins: wins.length,
    losses: losses.length,
    winRate,
    avgWinUsd,
    avgLossUsd,
    expectancyUsd: winRate * avgWinUsd - (1 - winRate) * avgLossUsd,
    totalPnlUsd: legs.reduce((sum, leg) => sum + leg.pnlUsd, 0),
  };
}

export function getPaperStats() {
  const legs = getRealizedLegs();
  const today = getTodayUTC();
  const todayLegs = legs.filter((leg) => leg.timestamp.startsWith(today));
  return { allTime: summarizeLegs(legs), today: summarizeLegs(todayLegs), legs };
}

export function getOpenTrades(): PaperTrade[] {
  return getPaperTrades().filter((t) => t.status === "OPEN");
}

export function getMoonbagTrades(): PaperTrade[] {
  return getPaperTrades().filter((t) => t.status === "MOONBAG");
}

// ── C2: daily compound tracker ────────────────────────────────────────────────

function loadOrInitDailyCompound(currentBalance?: number): DailyCompound {
  const today = getTodayUTC();
  const existing = readJson<DailyCompound | null>(DAILY_COMPOUND_FILE, null);
  if (existing && existing.date === today) return existing;
  // New day or first launch: snapshot current balance as today's start
  const startBalance = currentBalance ?? 100;
  const dc: DailyCompound = {
    date: today,
    startBalance: Math.round(startBalance * 100) / 100,
    dailyTarget: Math.round(startBalance * 0.30 * 100) / 100,
  };
  writeJson(DAILY_COMPOUND_FILE, dc);
  logger.info({ date: today, startBalance, dailyTarget: dc.dailyTarget }, "[DAILY_COMPOUND] Day reset — new target set");
  return dc;
}

export function getDailyCompoundData() {
  const simBal = computeSimCash();
  return loadOrInitDailyCompound(simBal);
}

// ── C2: sim balance calculation ───────────────────────────────────────────────
// Cash = contributed capital - every buy cost + every actual sale proceeds.

function computeSimCash(): number {
  const trades = getPaperTrades();
  const capital = getCapitalSummary();
  let cash = capital.baseBalanceUsd + capital.injectedUsd;
  for (const t of trades) {
    if (t.status !== "MOONBAG" && t.status !== "MOONBAG EXIT") {
      cash -= finiteNumber(t.positionSizeUsd);
    }
    const leg = getRealizedLegs([t])[0];
    if (leg) cash += leg.proceedsUsd;
  }
  return Math.max(0, cash);
}

export function getSimBalance(): SimBalance {
  const cash = computeSimCash();
  const trades = getPaperTrades();
  const capital = getCapitalSummary();
  const { allTime } = getPaperStats();
  const lockedInOpenUsd = trades.filter(t => t.status === "OPEN")
    .reduce((s, t) => s + finiteNumber(t.remainingPositionUsd, finiteNumber(t.positionSizeUsd)), 0);
  const startingCapitalUsd = capital.baseBalanceUsd + capital.injectedUsd;
  const realizedPnlUsd = allTime.totalPnlUsd;
  const pnlPct = startingCapitalUsd > 0 ? (realizedPnlUsd / startingCapitalUsd) * 100 : 0;
  return {
    startingBalanceUsd: startingCapitalUsd,
    currentBalanceUsd: Math.round(cash * 100) / 100,
    lockedInOpenUsd: Math.round(lockedInOpenUsd * 100) / 100,
    realizedPnlUsd: Math.round(realizedPnlUsd * 100) / 100,
    pnlPct: Math.round(pnlPct * 100) / 100,
  };
}

// ── C2: full sim balance object for /api/sim/balance ─────────────────────────
export function getSimBalanceFull() {
  const cash = computeSimCash();
  const trades = getPaperTrades();
  const capital = getCapitalSummary();
  const stats = getPaperStats();
  const openTrades   = trades.filter(t => t.status === "OPEN");
  const moonbagTrades = trades.filter(t => t.status === "MOONBAG");

  const openPositionValue = openTrades.reduce((sum, t) => {
    const current = finiteNumber(t.currentPrice, t.entryPrice);
    const multiplier = t.entryPrice > 0 ? current / t.entryPrice : 1;
    const remainingCost = finiteNumber(t.remainingPositionUsd, finiteNumber(t.positionSizeUsd));
    return sum + remainingCost * multiplier;
  }, 0);

  const moonbagTotalValue = moonbagTrades.reduce((s, t) => {
    const cp = t.currentPrice;
    const ep = t.entryPrice;
    if (cp && ep > 0) {
      const mult = cp / ep;
      const rs = t.remainingPositionSol ?? t.amountSol * 0.5;
      return s + rs * REFERENCE_SOL_PRICE_USD * mult;
    }
    return s + (t.moonbagAmountUsd ?? t.pnlUsd ?? 0);
  }, 0);

  const dc = loadOrInitDailyCompound(cash);
  const todayPnL = stats.today.totalPnlUsd;
  const aboveTarget = todayPnL >= dc.dailyTarget;
  const dailyProgressPct = dc.dailyTarget > 0 ? (todayPnL / dc.dailyTarget) * 100 : 0;
  const startingCapitalUsd = capital.baseBalanceUsd + capital.injectedUsd;

  return {
    simBalance:        Math.round(cash * 100) / 100,
    cashBalance:       Math.round(cash * 100) / 100,
    totalDeployed:     Math.round(openPositionValue * 100) / 100,
    openPositionValue: Math.round(openPositionValue * 100) / 100,
    totalValue:        Math.round((cash + openPositionValue + moonbagTotalValue) * 100) / 100,
    totalEquity:       Math.round((cash + openPositionValue + moonbagTotalValue) * 100) / 100,
    totalPnL:          Math.round(stats.allTime.totalPnlUsd * 100) / 100,
    returnPct:         Math.round((stats.allTime.totalPnlUsd / startingCapitalUsd) * 10000) / 100,
    openPositions:     openTrades.length,
    moonbagCount:      moonbagTrades.length,
    moonbagTotalValue: Math.round(moonbagTotalValue * 100) / 100,
    moonbagValueUsd:   Math.round(moonbagTotalValue * 100) / 100,
    capitalInjectedUsd: Math.round(capital.injectedUsd * 100) / 100,
    startingCapitalUsd: Math.round(startingCapitalUsd * 100) / 100,
    realizedPnlUsd:    Math.round(stats.allTime.totalPnlUsd * 100) / 100,
    todayRealizedPnlUsd: Math.round(stats.today.totalPnlUsd * 100) / 100,
    todayStartBalance: dc.startBalance,
    dailyTarget:       dc.dailyTarget,
    todayPnL:          Math.round(todayPnL * 100) / 100,
    aboveTarget,
    dailyProgressPct:  Math.round(dailyProgressPct * 100) / 100,
  };
}

// ── Record a new paper trade — max 3 open cap ─────────────────────────────────
export function recordPaperTrade(
  trade: Omit<PaperTrade, "status" | "targetPrice" | "stopLoss" | "exitMultiplier" | "moonbagAmountUsd"> & { entryPrice: number },
): void {
  ensureDir(DATA_DIR);

  if (!paperWritesAllowed) {
    logger.warn({ symbol: trade.tokenSymbol }, "[RESET_GUARD] paper trade rejected while reset is not verified");
    return;
  }

  if (hasOpenPaperTrade(trade.tokenMint)) {
    console.log(`DUPLICATE TRADE SKIPPED — ${trade.tokenName}`);
    return;
  }

  // C2: enforce max 3 simultaneously open trades
  const openCount = getOpenTrades().length;
  if (openCount >= 3) {
    console.log(`MAX OPEN TRADES REACHED (3) — ${trade.tokenName} skipped`);
    return;
  }

  const full: PaperTrade = {
    ...trade,
    status:           "OPEN",
    targetPrice:      trade.entryPrice > 0 ? trade.entryPrice * 2.5 : 0,
    stopLoss:         trade.entryPrice > 0 ? trade.entryPrice * 0.7 : 0,
    exitPrice:        null,
    exitMultiplier:   null,
    pnlSol:           null,
    pnlUsd:           null,
    moonbagAmountUsd: null,
    remainingPositionUsd: trade.positionSizeUsd,
    realizedProceedsUsd: 0,
    realizedCostBasisUsd: 0,
    exitTimestamp:    null,
    entryTimestamp:   trade.timestamp,
  } as PaperTrade;

  const trades = readJson<any[]>(PAPER_TRADES_FILE, []);
  trades.push(full);
  writeJson(PAPER_TRADES_FILE, trades);

  const tag = (trade as any).relaxedMode ? "[SIM-RELAXED]" : "[SIM]";
  logger.info(
    { id: full.id, symbol: full.tokenSymbol, positionSizeUsd: full.positionSizeUsd, score: full.probabilityScore, status: "OPEN" },
    `${tag} BUY ${full.tokenSymbol} — ${full.amountSol.toFixed(4)} SOL ($${full.positionSizeUsd}) — score ${full.probabilityScore}`,
  );
  console.log(`${tag} BUY — ${full.tokenName} (${full.tokenSymbol}) — entry $${full.entryPrice?.toFixed(6) ?? "?"} — $${full.positionSizeUsd} — score ${full.probabilityScore} — open: ${openCount + 1}/3`);
}

// ── C2: live data fetcher (replaces price-only fetch) ────────────────────────
async function fetchLiveData(mint: string): Promise<{
  price: number; liquidityUsd: number; volume5m: number; buyTxns5m: number; sellTxns5m: number;
} | null> {
  try {
    recordDexScreenerCall("paper-exit");
    const resp = await axios.get<{ pairs?: any[] }>(
      `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
      { timeout: 8_000 },
    );
    const sol = (resp.data?.pairs ?? []).filter((p: any) => p?.chainId === "solana");
    if (sol.length === 0) return null;
    const best = sol.reduce((a: any, b: any) =>
      (b.liquidity?.usd ?? 0) > (a.liquidity?.usd ?? 0) ? b : a,
    );
    const price = parseFloat(best.priceUsd ?? "0");
    if (!isFinite(price) || price <= 0) return null;
    return {
      price,
      liquidityUsd: best.liquidity?.usd ?? 0,
      volume5m:     best.volume?.m5 ?? 0,
      buyTxns5m:    best.txns?.m5?.buys ?? 0,
      sellTxns5m:   best.txns?.m5?.sells ?? 0,
    };
  } catch { return null; }
}

// ── In-memory moonbag price history for tier-3 lower-lows check ─────────────
const moonbagPriceHistory = new Map<string, number[]>();
const downsideAccelerationAt = new Map<string, number>();

// ── C2: exit engine — full 6-step implementation ─────────────────────────────
let exitEngineInterval: ReturnType<typeof setInterval> | null = null;

async function runExitCheck(): Promise<void> {
  // ── Step 1: fetch live data for all OPEN trades and store ─────────────────
  const open = getOpenTrades();

  for (const trade of open) {
    if (!trade.entryPrice || trade.entryPrice <= 0) continue;

    const live = await fetchLiveData(trade.tokenMint);

    // Fallback: use last stored price when DexScreener fetch fails so exit checks still fire
    // (avoids silent skip every cycle when rate-limited or no Solana pair returned)
    let effectiveLive = live;
    if (!effectiveLive && trade.currentPrice && trade.currentPrice > 0) {
      console.log(`EXIT CHECK — fetch failed for ${trade.tokenName}, using stored $${trade.currentPrice.toFixed(8)}`);
      effectiveLive = {
        price:        trade.currentPrice,
        liquidityUsd: trade.currentLiquidity  ?? 0,
        volume5m:     trade.currentVolume5m   ?? 0,
        buyTxns5m:    trade.currentBuys5m     ?? 0,
        sellTxns5m:   trade.currentSells5m    ?? 0,
      };
    }
    if (!effectiveLive) continue;

    const now = new Date().toISOString();

    // Store live data on the record (only when we have a fresh fetch)
    if (live) {
      const all = readJson<any[]>(PAPER_TRADES_FILE, []);
      const idx = all.findIndex((t: any) => t.id === trade.id);
      if (idx === -1) continue;
      all[idx].currentPrice     = live.price;
      all[idx].currentLiquidity = live.liquidityUsd;
      all[idx].currentVolume5m  = live.volume5m;
      all[idx].currentBuys5m    = live.buyTxns5m;
      all[idx].currentSells5m   = live.sellTxns5m;
      all[idx].lastLiveFetch    = now;
      writeJson(PAPER_TRADES_FILE, all);
    }

    const currentPrice  = effectiveLive.price;
    const multiplier    = currentPrice / trade.entryPrice;
    const targetPrice   = trade.targetPrice  || trade.entryPrice * 2.5;
    const stopLossPrice = trade.stopLoss     || trade.entryPrice * 0.7;

    // Downside acceleration: once a live position reaches -15%, take a
    // second DexScreener reading after exactly 3 seconds before the normal
    // 30-second exit cycle can miss a fast collapse.
    if (multiplier <= 0.85 && currentPrice > stopLossPrice) {
      const previous = downsideAccelerationAt.get(trade.id) ?? 0;
      if (Date.now() - previous >= 30_000) {
        downsideAccelerationAt.set(trade.id, Date.now());
        console.log(
          `[DOWNSIDE_ACCELERATION] ${trade.tokenSymbol} reached ${(multiplier * 100).toFixed(1)}% of entry — next check in 3s`,
        );
        await new Promise<void>((resolve) => setTimeout(resolve, 3_000));
        const accelerated = await fetchLiveData(trade.tokenMint);
        if (accelerated) {
          effectiveLive = accelerated;
          console.log(
            `[DOWNSIDE_ACCELERATION] ${trade.tokenSymbol} 3s check caught ${(accelerated.price / trade.entryPrice * 100).toFixed(1)}% of entry at $${accelerated.price.toFixed(8)}`,
          );
        } else {
          console.log(`[DOWNSIDE_ACCELERATION] ${trade.tokenSymbol} 3s check unavailable — retaining prior live price`);
        }
      }
    }

    // ── Step 2: Golden exit — 2.5× reached ───────────────────────────────
    if (currentPrice >= targetPrice) {
      const halfSoldProceeds = 0.5 * trade.positionSizeUsd * multiplier;
      const halfSoldProfit   = halfSoldProceeds - trade.positionSizeUsd * 0.5; // net on the half sold vs 50% of cost
      const moonbagAmountUsd = halfSoldProceeds; // value of remaining 50% at current price

      // Step 2 log
      console.log(`TAKE PROFIT TRIGGERED — ${trade.tokenName} — selling 50% at $${currentPrice.toFixed(6)}`);
      console.log(`50% SOLD — capital recovered — $${halfSoldProceeds.toFixed(2)} secured`);

      const all2 = readJson<any[]>(PAPER_TRADES_FILE, []);
      const idx2 = all2.findIndex((t: any) => t.id === trade.id);
      if (idx2 === -1) continue;

      // Update original to PARTIAL EXIT
      all2[idx2] = {
        ...all2[idx2],
        status:           "PARTIAL EXIT",
        exitPrice:        currentPrice,
        exitMultiplier:   multiplier,
        halfSoldAt:       currentPrice,
        halfSoldProfit:   halfSoldProceeds,  // full proceeds from 50% sold
        halfSoldTime:     now,
        remainingPositionUsd: trade.positionSizeUsd * 0.5,
        realizedProceedsUsd: halfSoldProceeds,
        realizedCostBasisUsd: trade.positionSizeUsd * 0.5,
        pnlUsd:           halfSoldProfit,    // net profit on sold half
        pnlSol:           halfSoldProfit / 150,
        exitTimestamp:    now,
      };

      // ── Step 3: create MOONBAG entry ────────────────────────────────────
      const moonbagEntry: any = {
        id:                  `mb_${trade.id}`,
        tokenMint:           trade.tokenMint,
        tokenSymbol:         trade.tokenSymbol,
        tokenName:           trade.tokenName,
        logoUrl:             trade.logoUrl,
        socialLinks:         (trade as any).socialLinks,
        type:                "buy",
        status:              "MOONBAG",
        amountSol:           trade.amountSol * 0.5,
        positionSizeUsd:     0,             // C2: cost basis $0
        remainingPositionUsd: 0,
        originalEntryUsd: trade.positionSizeUsd,
        remainingPositionSol: trade.amountSol * 0.5,
        remainingCostBasis:  0,
        realizedProceedsUsd: 0,
        realizedCostBasisUsd: 0,
        tier:                trade.tier,
        entryPrice:          trade.entryPrice,
        targetPrice:         null,
        stopLoss:            null,
        exitPrice:           null,
        exitMultiplier:      multiplier,
        pnlUsd:              moonbagAmountUsd,
        pnlSol:              moonbagAmountUsd / 150,
        moonbagAmountUsd,
        moonbagCreatedAt:    now,
        filtersPassedCount:  trade.filtersPassedCount,
        filtersFailedCount:  trade.filtersFailedCount,
        filterDetails:       trade.filterDetails,
        probabilityScore:    trade.probabilityScore,
        scoreBreakdownJson:  (trade as any).scoreBreakdownJson,
        signalsTriggered:    (trade as any).signalsTriggered,
        regime:              trade.regime,
        timestamp:           now,
        exitTimestamp:       null,
        relaxedMode:         trade.relaxedMode,
        entryLiquidity:      trade.entryLiquidity,
        entryMarketCap:      trade.entryMarketCap,
        sniperRiskPct:       trade.sniperRiskPct,
        currentPrice,
        currentLiquidity:    effectiveLive.liquidityUsd,
        lastLiveFetch:       now,
      };
      all2.push(moonbagEntry);
      writeJson(PAPER_TRADES_FILE, all2);

      console.log(`MOONBAG CREATED — ${trade.tokenName} — remaining 50% moved to vault — cost basis $0.00`);
      console.log(
        `PAPER EXIT WIN — ${trade.tokenName} | entry $${trade.entryPrice.toFixed(6)} → 50% sold $${currentPrice.toFixed(6)} | ${multiplier.toFixed(2)}× | recovered $${halfSoldProceeds.toFixed(2)} | moonbag started at $0 cost basis`,
      );

    // ── Step 6: Stop loss ─────────────────────────────────────────────────
    } else if (currentPrice <= stopLossPrice) {
      const lossAmount = trade.positionSizeUsd * multiplier - trade.positionSizeUsd; // negative

      console.log(`STOP LOSS HIT — ${trade.tokenName} — full position closed at $${currentPrice.toFixed(6)}`);

      const all3 = readJson<any[]>(PAPER_TRADES_FILE, []);
      const idx3 = all3.findIndex((t: any) => t.id === trade.id);
      if (idx3 === -1) continue;

      all3[idx3] = {
        ...all3[idx3],
        status:         "LOSS",
        exitPrice:      currentPrice,
        exitMultiplier: multiplier,
        lossAmount,
        remainingPositionUsd: 0,
        realizedProceedsUsd: trade.positionSizeUsd * multiplier,
        realizedCostBasisUsd: trade.positionSizeUsd,
        pnlUsd:         lossAmount,
        pnlSol:         lossAmount / 150,
        exitTimestamp:  now,
      };
      writeJson(PAPER_TRADES_FILE, all3);

      console.log(
        `PAPER EXIT LOSS — ${trade.tokenName} | entry $${trade.entryPrice.toFixed(6)} → exit $${currentPrice.toFixed(6)} | ${multiplier.toFixed(2)}× | PnL $${lossAmount.toFixed(2)}`,
      );
    }
  }

  // ── Step 5: moonbag tier protection every 60s ────────────────────────────
  const moonbags = getMoonbagTrades();
  for (const mb of moonbags) {
    const live = await fetchLiveData(mb.tokenMint);
    if (!live) continue;

    const all = readJson<any[]>(PAPER_TRADES_FILE, []);
    const idx = all.findIndex((t: any) => t.id === mb.id);
    if (idx === -1) continue;

    // Always update live price on moonbag record (Step 4 support)
    all[idx].currentPrice     = live.price;
    all[idx].currentLiquidity = live.liquidityUsd;
    all[idx].currentVolume5m  = live.volume5m;
    all[idx].currentBuys5m    = live.buyTxns5m;
    all[idx].currentSells5m   = live.sellTxns5m;
    all[idx].lastLiveFetch    = new Date().toISOString();
    all[idx].pnlUsd           = (mb.amountSol * 150) * (live.price / (mb.entryPrice || live.price));

    // Price history for lower-lows detection
    const hist = moonbagPriceHistory.get(mb.id) ?? [];
    hist.push(live.price);
    if (hist.length > 10) hist.splice(0, hist.length - 10);
    moonbagPriceHistory.set(mb.id, hist);

    const priceDropPct  = mb.entryPrice > 0 ? (1 - live.price / mb.entryPrice) * 100 : 0;
    const entryLiq      = mb.entryLiquidity ?? 0;

    // Tier 3: all 5 conditions simultaneously
    const c1 = priceDropPct >= 30;
    const c2 = live.buyTxns5m > 0 && live.sellTxns5m > live.buyTxns5m * 3;
    const c3 = entryLiq > 0 && live.liquidityUsd < entryLiq * 0.65;
    const c4 = live.buyTxns5m < 3;
    const c5 = hist.length >= 3
      && hist[hist.length - 1] < hist[hist.length - 2]
      && hist[hist.length - 2] < hist[hist.length - 3];

    if (c1 && c2 && c3 && c4 && c5) {
      all[idx].status       = "MOONBAG EXIT";
      all[idx].exitPrice    = live.price;
      all[idx].exitTimestamp = new Date().toISOString();
      console.log(`MOONBAG EMERGENCY EXIT — ${mb.tokenName} — all 5 tier-3 conditions met — exit at $${live.price.toFixed(6)}`);
    }

    writeJson(PAPER_TRADES_FILE, all);
  }
}

export function startExitEngine(): void {
  if (exitEngineInterval) return;
  exitEngineInterval = setInterval(() => {
    runExitCheck().catch((e) => logger.warn({ e }, "[EXIT_ENGINE] Price check error"));
  }, 30_000);
  startMoonbagMonitor();
  console.log("EXIT ENGINE ACTIVE — checking prices every 30s, moonbag tier protection active");
}

export function stopExitEngine(): void {
  if (exitEngineInterval) { clearInterval(exitEngineInterval); exitEngineInterval = null; }
  stopMoonbagMonitor();
}

// ── Step 4: moonbags with live prices for portfolio ──────────────────────────
export async function getMoonbagsWithPrices(): Promise<Array<PaperTrade & {
  currentPrice: number | null;
  currentMultiplier: number | null;
  currentValueUsd: number | null;
  delisted: boolean;
}>> {
  const moonbags = getMoonbagTrades();
  return Promise.all(
    moonbags.map(async (mb) => {
      // Prefer stored currentPrice (updated by exit engine), fall back to live fetch
      let cp: number | null = mb.currentPrice ?? null;
      if (!cp) cp = await fetchLiveData(mb.tokenMint).then(d => d?.price ?? null);
      const delisted = cp === null;
      const currentMultiplier = cp != null && mb.entryPrice > 0
        ? cp / mb.entryPrice : null;
      const rs = mb.remainingPositionSol ?? mb.amountSol * 0.5;
      const currentValueUsd = cp != null
         ? rs * REFERENCE_SOL_PRICE_USD * (currentMultiplier ?? 1) : mb.moonbagAmountUsd;
      return { ...mb, currentPrice: cp, currentMultiplier, currentValueUsd, delisted };
    }),
  );
}

function currentPriceForTrade(trade: PaperTrade): number {
  return finiteNumber(trade.currentPrice, finiteNumber(trade.entryPrice));
}

function moonbagValueAtPrice(trade: PaperTrade, price: number): number {
  const multiplier = trade.entryPrice > 0 ? price / trade.entryPrice : 1;
  return finiteNumber(trade.remainingPositionSol, trade.amountSol * 0.5)
    * REFERENCE_SOL_PRICE_USD * multiplier;
}

export function sellPaperTrade(id: string, percentage: number): PaperTrade[] {
  if (!isPaperMode()) throw new Error("Paper selling is available only in simulation mode");
  if (!Number.isFinite(percentage) || ![25, 50, 75, 100].includes(percentage)) {
    throw new Error("percentage must be 25, 50, 75, or 100");
  }

  const all = readJson<any[]>(PAPER_TRADES_FILE, []);
  const row = all.find((t) => t.id === id);
  if (!row) throw new Error("Paper position not found");
  const trade = { ...row, status: resolveStatus(row) } as PaperTrade;
  const fraction = percentage / 100;
  const now = new Date().toISOString();

  if (trade.status === "MOONBAG") {
    const price = currentPriceForTrade(trade);
    const currentValue = moonbagValueAtPrice(trade, price);
    const proceeds = currentValue * fraction;
    const remainingSol = finiteNumber(trade.remainingPositionSol, trade.amountSol * 0.5) * (1 - fraction);
    row.realizedProceedsUsd = finiteNumber(row.realizedProceedsUsd) + proceeds;
    row.realizedCostBasisUsd = 0;
    row.amountSol = remainingSol;
    row.remainingPositionSol = remainingSol;
    row.currentPrice = price;
    row.lastSaleTimestamp = now;
    row.pnlUsd = row.realizedProceedsUsd;
    row.pnlSol = row.pnlUsd / REFERENCE_SOL_PRICE_USD;
    if (percentage === 100) {
      row.status = "MOONBAG EXIT";
      row.exitPrice = price;
      row.exitTimestamp = now;
    }
    writeJson(PAPER_TRADES_FILE, all);
    return getPaperTrades();
  }

  if (trade.status !== "OPEN") {
    throw new Error("Only OPEN positions and MOONBAG positions can be sold");
  }

  const price = currentPriceForTrade(trade);
  const multiplier = trade.entryPrice > 0 ? price / trade.entryPrice : 0;
  const positionCost = finiteNumber(trade.positionSizeUsd);
  const proceeds = positionCost * multiplier * fraction;
  const costSold = positionCost * fraction;
  const realizedProceeds = finiteNumber(row.realizedProceedsUsd) + proceeds;
  const realizedCost = finiteNumber(row.realizedCostBasisUsd) + costSold;
  const remainingFraction = 1 - fraction;

  row.realizedProceedsUsd = realizedProceeds;
  row.realizedCostBasisUsd = realizedCost;
  row.currentPrice = price;
  row.lastSaleTimestamp = now;
  row.remainingPositionUsd = positionCost * remainingFraction;
  row.amountSol = finiteNumber(row.amountSol) * remainingFraction;
  row.pnlUsd = realizedProceeds - realizedCost;
  row.pnlSol = row.pnlUsd / REFERENCE_SOL_PRICE_USD;

  const capitalRecovered = realizedProceeds >= positionCost - 0.000001;
  if (percentage === 100) {
    row.status = row.pnlUsd > 0 ? "WIN" : "LOSS";
    row.exitPrice = price;
    row.exitMultiplier = multiplier;
    row.exitTimestamp = now;
    row.lossAmount = row.pnlUsd < 0 ? row.pnlUsd : null;
  } else if (capitalRecovered) {
    row.status = "PARTIAL EXIT";
    row.exitPrice = price;
    row.exitMultiplier = multiplier;
    row.exitTimestamp = now;
    row.halfSoldAt = price;
    row.halfSoldProfit = realizedProceeds;
    row.halfSoldTime = now;

    const moonbagEntry: any = {
      ...row,
      id: `mb_${row.id}`,
      status: "MOONBAG",
      amountSol: row.amountSol,
      positionSizeUsd: 0,
      remainingPositionUsd: 0,
      originalEntryUsd: positionCost,
      remainingPositionSol: row.amountSol,
      remainingCostBasis: 0,
      realizedProceedsUsd: 0,
      realizedCostBasisUsd: 0,
      entryPrice: row.entryPrice,
      currentPrice: price,
      currentMultiplier: multiplier,
      currentValueUsd: row.amountSol * REFERENCE_SOL_PRICE_USD * multiplier,
      moonbagAmountUsd: row.amountSol * REFERENCE_SOL_PRICE_USD * multiplier,
      moonbagCreatedAt: now,
      exitPrice: null,
      exitTimestamp: null,
      pnlUsd: row.amountSol * REFERENCE_SOL_PRICE_USD * multiplier,
      pnlSol: (row.amountSol * REFERENCE_SOL_PRICE_USD * multiplier) / REFERENCE_SOL_PRICE_USD,
      timestamp: now,
    };
    all.push(moonbagEntry);
  }

  writeJson(PAPER_TRADES_FILE, all);
  return getPaperTrades();
}

export function bulkSellPaperTrades(
  scope: "open" | "moonbags" | "all",
  percentage: number,
): { sold: string[]; errors: string[]; trades: PaperTrade[] } {
  const trades = getPaperTrades().filter((trade) =>
    scope === "open" ? trade.status === "OPEN"
      : scope === "moonbags" ? trade.status === "MOONBAG"
        : trade.status === "OPEN" || trade.status === "MOONBAG",
  );
  const sold: string[] = [];
  const errors: string[] = [];
  for (const trade of trades) {
    try {
      sellPaperTrade(trade.id, percentage);
      sold.push(trade.id);
    } catch (error) {
      errors.push(`${trade.tokenSymbol}: ${error instanceof Error ? error.message : "sell failed"}`);
    }
  }
  return { sold, errors, trades: getPaperTrades() };
}

// ── Daily and all-time report ─────────────────────────────────────────────────
export function generateDailyReport(): DailyReport {
  const today = getTodayUTC();
  const allTrades = getPaperTrades();
  const stats = getPaperStats();
  const allToday = allTrades.filter((t) => t.timestamp.startsWith(today));
  const todayLegs = stats.legs.filter((leg) => leg.timestamp.startsWith(today));
  const todayStats = stats.today;
  const simBal = getSimBalance();

  const biggestWinLeg = [...todayLegs].sort((a, b) => b.pnlUsd - a.pnlUsd)
    .find((leg) => leg.pnlUsd > 0);
  const biggestLossLeg = [...todayLegs].sort((a, b) => a.pnlUsd - b.pnlUsd)
    .find((leg) => leg.pnlUsd < 0);

  const report: DailyReport = {
    date: today,
    totalTrades: todayStats.totalTrades,
    openTrades: allToday.filter((t) => t.status === "OPEN").length,
    wins: todayStats.wins,
    losses: todayStats.losses,
    winRate: todayStats.winRate,
    avgWinSol: todayStats.avgWinUsd / REFERENCE_SOL_PRICE_USD,
    avgLossSol: todayStats.avgLossUsd / REFERENCE_SOL_PRICE_USD,
    avgWinUsd: todayStats.avgWinUsd,
    avgLossUsd: todayStats.avgLossUsd,
    // Existing reporting consumers expect SOL here; the explicit stats objects
    // below are the canonical USD values used by the simulation UI.
    expectancy: todayStats.expectancyUsd / REFERENCE_SOL_PRICE_USD,
    topFailureReason: biggestLossLeg?.reason ?? "N/A",
    totalPnlSol: todayStats.totalPnlUsd / REFERENCE_SOL_PRICE_USD,
    totalPnlUsd: todayStats.totalPnlUsd,
    simBalanceUsd: simBal.currentBalanceUsd,
    biggestWin: biggestWinLeg
      ? { tokenSymbol: biggestWinLeg.tokenSymbol, multiplier: 0, pnlUsd: biggestWinLeg.pnlUsd, pnlSol: biggestWinLeg.pnlSol }
      : null,
    biggestLoss: biggestLossLeg
      ? { tokenSymbol: biggestLossLeg.tokenSymbol, pnlUsd: biggestLossLeg.pnlUsd, pnlSol: biggestLossLeg.pnlSol, reason: biggestLossLeg.reason }
      : null,
    isPaperMode: isPaperMode(),
    allTime: stats.allTime,
    today: stats.today,
    capitalInjectedUsd: getCapitalSummary().injectedUsd,
    startingCapitalUsd: getCapitalSummary().baseBalanceUsd + getCapitalSummary().injectedUsd,
  };

  writeJson(DAILY_REPORT_FILE, report);
  return report;
}

export function readDailyReport(): DailyReport | null {
  return readJson<DailyReport | null>(DAILY_REPORT_FILE, null);
}

export function resetPaperLedgerData(): {
  previousTradeCount: number;
  clearedFiles: string[];
  verifiedEmpty: boolean;
} {
  const previousTradeCount = getPaperTrades().length;
  const clearedFiles: string[] = [];

  writeJson(PAPER_TRADES_FILE, []);
  clearedFiles.push(path.basename(PAPER_TRADES_FILE));
  writeJson(CAPITAL_INJECTIONS_FILE, []);
  clearedFiles.push(path.basename(CAPITAL_INJECTIONS_FILE));
  setBaseCapitalUsd(0);

  for (const file of [
    DAILY_REPORT_FILE,
    DAILY_COMPOUND_FILE,
    path.join(DATA_DIR, "session_stats.json"),
    path.join(DATA_DIR, "scan_stats.json"),
    path.join(DATA_DIR, "notification_errors.json"),
    path.join(DATA_DIR, "paper_trade_log.json"),
    path.join(DATA_DIR, "paper_exit_audit.jsonl"),
    path.join(DATA_DIR, "sim_capital.json"),
  ]) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      clearedFiles.push(path.basename(file));
    }
  }

  for (const name of fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR) : []) {
    if (/^paper_trades.*\.json$/i.test(name) && name !== path.basename(PAPER_TRADES_FILE)) {
      fs.unlinkSync(path.join(DATA_DIR, name));
      clearedFiles.push(name);
    }
  }

  for (const dirName of ["daily_reports", "failed_reports"]) {
    const dir = path.join(DATA_DIR, dirName);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      fs.unlinkSync(path.join(dir, name));
      clearedFiles.push(`${dirName}/${name}`);
    }
  }

  for (const name of ["exit_audit.json", "exit_audits.json"]) {
    const file = path.join(DATA_DIR, name);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      clearedFiles.push(name);
    }
  }

  clearMoonbags();
  downsideAccelerationAt.clear();
  const verifiedEmpty = getPaperTrades().length === 0 && getMoonbagTrades().length === 0;
  if (!verifiedEmpty) throw new Error("Paper ledger verification failed after wipe");
  logger.info({ previousTradeCount, clearedFiles }, "[RESET] paper ledger empty after wipe");
  return { previousTradeCount, clearedFiles, verifiedEmpty };
}

export function logWeightChange(change: {
  timestamp: string;
  reason: string;
  weights: Record<string, number>;
}): void {
  const history = readJson<unknown[]>(WEIGHTS_FILE, []);
  history.push(change);
  writeJson(WEIGHTS_FILE, history);
}

export function readWeightsHistory(): unknown[] {
  return readJson<unknown[]>(WEIGHTS_FILE, []);
}

export function saveFailedReport(name: string, content: string): void {
  ensureDir(FAILED_REPORTS_DIR);
  fs.writeFileSync(path.join(FAILED_REPORTS_DIR, `report_${name}.txt`), content, "utf-8");
  logger.info({ name }, "Failed report saved to disk");
}
