import fs from "fs";
import path from "path";
import axios from "axios";
import { logger } from "./logger";
import { startMoonbagMonitor, stopMoonbagMonitor } from "./moonbagVault";

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface PaperTrade {
  id: string;
  tokenMint: string;
  tokenSymbol: string;
  tokenName: string;
  logoUrl?: string | null;
  type: "buy" | "sell";
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
  // C2: partial exit tracking
  halfSoldAt?: number | null;
  halfSoldProfit?: number | null;
  halfSoldTime?: string | null;
  // C2: moonbag fields
  remainingPositionSol?: number | null;
  remainingCostBasis?: number;
  moonbagCreatedAt?: string | null;
  // C2: loss tracking
  lossAmount?: number | null;
  // Manual/full-exit accounting
  realizedProceedsUsd?: number | null;
  manualSellPct?: number | null;
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
}

export interface SimBalance {
  baseStartingBalanceUsd: number;
  injectedCapitalUsd: number;
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

// ── File paths ────────────────────────────────────────────────────────────────

const DATA_DIR           = path.resolve(process.cwd(), "data");
const PAPER_TRADES_FILE  = path.join(DATA_DIR, "paper_trades.json");
const DAILY_REPORT_FILE  = path.join(DATA_DIR, "daily_report.json");
const WEIGHTS_FILE       = path.join(DATA_DIR, "weights_history.json");
const DAILY_COMPOUND_FILE = path.join(DATA_DIR, "daily_compound.json");
const SIM_CAPITAL_FILE     = path.join(DATA_DIR, "sim_capital.json");
const PAPER_LOG_FILE       = path.join(DATA_DIR, "paper_trade_log.json");
const FAILED_REPORTS_DIR = path.join(DATA_DIR, "failed_reports");

const BASE_SIM_CAPITAL_USD = 100;
const ONE_TIME_INJECTION_USD = 900;

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
    return trades.some((t) => {
      const status = resolveStatus(t);
      return t.tokenMint === mint && (status === "OPEN" || status === "PARTIAL EXIT");
    });
  } catch { return false; }
}

// ── Read helpers ──────────────────────────────────────────────────────────────
export function getPaperTrades(): PaperTrade[] {
  const raw = readJson<any[]>(PAPER_TRADES_FILE, []);
  return raw.map((t) => ({ ...t, status: resolveStatus(t) })) as PaperTrade[];
}

export function getOpenTrades(): PaperTrade[] {
  return getPaperTrades().filter((t) => t.status === "OPEN" || t.status === "PARTIAL EXIT");
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

interface SimCapital {
  baseCapitalUsd: number;
  injectedCapitalUsd: number;
  injectionKey: string | null;
  appliedAt: string | null;
}

function getSimCapital(): SimCapital {
  return readJson<SimCapital>(SIM_CAPITAL_FILE, {
    baseCapitalUsd: BASE_SIM_CAPITAL_USD,
    injectedCapitalUsd: 0,
    injectionKey: null,
    appliedAt: null,
  });
}

/** Apply the requested simulation funding exactly once. */
export function applyOneTimeCapitalInjection(): {
  applied: boolean;
  alreadyApplied: boolean;
  baseCapitalUsd: number;
  injectedCapitalUsd: number;
  totalStartingCapitalUsd: number;
  appliedAt: string | null;
} {
  const existing = getSimCapital();
  if (existing.injectionKey === "batch1-900-usd" && existing.injectedCapitalUsd === ONE_TIME_INJECTION_USD) {
    return {
      applied: false,
      alreadyApplied: true,
      baseCapitalUsd: existing.baseCapitalUsd,
      injectedCapitalUsd: existing.injectedCapitalUsd,
      totalStartingCapitalUsd: existing.baseCapitalUsd + existing.injectedCapitalUsd,
      appliedAt: existing.appliedAt,
    };
  }

  const appliedAt = new Date().toISOString();
  const updated: SimCapital = {
    baseCapitalUsd: existing.baseCapitalUsd || BASE_SIM_CAPITAL_USD,
    injectedCapitalUsd: ONE_TIME_INJECTION_USD,
    injectionKey: "batch1-900-usd",
    appliedAt,
  };
  writeJson(SIM_CAPITAL_FILE, updated);
  logger.info({ injectedCapitalUsd: ONE_TIME_INJECTION_USD, injectionKey: updated.injectionKey }, "[SIM_CAPITAL] One-time capital injection applied");
  console.log(`[SIM_CAPITAL] APPLIED $${ONE_TIME_INJECTION_USD.toFixed(2)} injection (idempotency key: ${updated.injectionKey})`);
  return {
    applied: true,
    alreadyApplied: false,
    baseCapitalUsd: updated.baseCapitalUsd,
    injectedCapitalUsd: updated.injectedCapitalUsd,
    totalStartingCapitalUsd: updated.baseCapitalUsd + updated.injectedCapitalUsd,
    appliedAt,
  };
}

export function getSimCapitalBreakdown() {
  const capital = getSimCapital();
  return {
    baseCapitalUsd: capital.baseCapitalUsd,
    injectedCapitalUsd: capital.injectedCapitalUsd,
    totalStartingCapitalUsd: capital.baseCapitalUsd + capital.injectedCapitalUsd,
    injectionKey: capital.injectionKey,
    appliedAt: capital.appliedAt,
  };
}

function recordPaperEvent(event: Record<string, unknown>): Record<string, unknown> {
  const events = readJson<Record<string, unknown>[]>(PAPER_LOG_FILE, []);
  const entry = { ...event, timestamp: new Date().toISOString() };
  events.push(entry);
  writeJson(PAPER_LOG_FILE, events.slice(-500));
  return entry;
}

export function getPaperTradeLog(limit = 50): Record<string, unknown>[] {
  return readJson<Record<string, unknown>[]>(PAPER_LOG_FILE, []).slice(-limit).reverse();
}

// ── C2: sim balance calculation ───────────────────────────────────────────────
// "Subtract positionSizeUsd after every entry. Add back halfSoldProfit for wins. Add back $0 for losses."

function computeSimCash(): number {
  const START = getSimCapital().baseCapitalUsd + getSimCapital().injectedCapitalUsd;
  const trades = getPaperTrades();
  let cash = START;
  for (const t of trades) {
    if (t.status === "MOONBAG" || t.status === "MOONBAG EXIT") {
      // Moonbags have a zero cost basis. Any manual proceeds are pure
      // realized cash and must be reflected immediately in the sim balance.
      cash += t.realizedProceedsUsd ?? 0;
      continue;
    }
    cash -= t.positionSizeUsd; // subtract entry
    if (t.realizedProceedsUsd != null) {
      cash += t.realizedProceedsUsd;
    } else if (t.status === "PARTIAL EXIT" || t.status === "WIN") {
      cash += (t.halfSoldProfit ?? t.pnlUsd ?? 0); // legacy records store proceeds here
    }
    // LOSS: add back $0 — full position lost
    // OPEN: still deployed, no proceeds yet
  }
  return cash;
}

export function getSimBalance(): SimBalance {
  const capital = getSimCapital();
  const START = capital.baseCapitalUsd + capital.injectedCapitalUsd;
  const cash = computeSimCash();
  const trades = getPaperTrades();
  const lockedInOpenUsd = trades.filter(t => t.status === "OPEN")
    .reduce((s, t) => s + t.positionSizeUsd, 0);
  const realizedPnlUsd = cash - START;
  const pnlPct = ((cash - START) / START) * 100;
  return {
    baseStartingBalanceUsd: capital.baseCapitalUsd,
    injectedCapitalUsd: capital.injectedCapitalUsd,
    startingBalanceUsd: START,
    currentBalanceUsd: Math.round(cash * 100) / 100,
    lockedInOpenUsd: Math.round(lockedInOpenUsd * 100) / 100,
    realizedPnlUsd: Math.round(realizedPnlUsd * 100) / 100,
    pnlPct: Math.round(pnlPct * 100) / 100,
  };
}

// ── C2: full sim balance object for /api/sim/balance ─────────────────────────
export function getSimBalanceFull() {
  const capital = getSimCapital();
  const cash = computeSimCash();
  const trades = getPaperTrades();
  const openTrades   = trades.filter(t => t.status === "OPEN" || t.status === "PARTIAL EXIT");
  const moonbagTrades = trades.filter(t => t.status === "MOONBAG");

  const totalDeployed = openTrades.reduce((s, t) => s + t.positionSizeUsd, 0);

  const moonbagTotalValue = moonbagTrades.reduce((s, t) => {
    const cp = t.currentPrice;
    const ep = t.entryPrice;
    if (cp && ep > 0) {
      const mult = cp / ep;
      const rs = t.remainingPositionSol ?? t.amountSol * 0.5;
      return s + rs * 150 * mult;
    }
    return s + (t.moonbagAmountUsd ?? t.pnlUsd ?? 0);
  }, 0);

  const START = capital.baseCapitalUsd + capital.injectedCapitalUsd;
  const dc = loadOrInitDailyCompound(cash);
  const todayPnL = cash - dc.startBalance;
  const aboveTarget = todayPnL >= dc.dailyTarget;
  const dailyProgressPct = dc.dailyTarget > 0 ? (todayPnL / dc.dailyTarget) * 100 : 0;

  return {
    simBalance:        Math.round(cash * 100) / 100,
    baseCapital:        Math.round(capital.baseCapitalUsd * 100) / 100,
    injectedCapital:    Math.round(capital.injectedCapitalUsd * 100) / 100,
    startingCapital:    Math.round(START * 100) / 100,
    realizedPnl:        Math.round((cash - START) * 100) / 100,
    totalDeployed:     Math.round(totalDeployed * 100) / 100,
    totalValue:        Math.round((cash + totalDeployed + moonbagTotalValue) * 100) / 100,
    totalPnL:          Math.round((cash - START) * 100) / 100,
    returnPct:         Math.round(((cash - START) / START) * 10000) / 100,
    openPositions:     openTrades.length,
    moonbagCount:      moonbagTrades.length,
    moonbagTotalValue: Math.round(moonbagTotalValue * 100) / 100,
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
    exitTimestamp:    null,
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

export interface PaperSellResult {
  trade: PaperTrade;
  proceedsUsd: number;
  pnlUsd: number;
  sellPrice: number;
  sellPct: number;
  logEntry: Record<string, unknown>;
}

export type BulkSellScope = "OPEN_POSITIONS" | "MOONBAGS" | "BOTH";

export interface BulkSellResult {
  scope: BulkSellScope;
  scopeLabel: string;
  sellPct: number;
  affectedCount: number;
  positions: Array<{
    tradeId: string;
    tokenSymbol: string;
    status: PaperTrade["status"];
    sellPrice: number;
    proceedsUsd: number;
    pnlUsd: number;
  }>;
  totalProceedsUsd: number;
  totalPnlUsd: number;
  balance: ReturnType<typeof getSimBalanceFull>;
  logEntry: Record<string, unknown>;
}

const BULK_SCOPE_LABELS: Record<BulkSellScope, string> = {
  OPEN_POSITIONS: "Open Positions",
  MOONBAGS: "Moonbags",
  BOTH: "Both",
};

function isBulkSellScope(value: unknown): value is BulkSellScope {
  return value === "OPEN_POSITIONS" || value === "MOONBAGS" || value === "BOTH";
}

/**
 * Execute one global paper exit at the latest stored/fetched token price.
 * Percentages apply to each selected position's current remaining size.
 */
export async function bulkSellPaperTrades(scope: BulkSellScope, sellPct: number): Promise<BulkSellResult> {
  if (!isBulkSellScope(scope)) throw new Error("scope must be OPEN_POSITIONS, MOONBAGS, or BOTH");
  if (!Number.isFinite(sellPct) || sellPct <= 0 || sellPct > 100) {
    throw new Error("sellPct must be greater than 0 and no more than 100");
  }

  const all = readJson<any[]>(PAPER_TRADES_FILE, []);
  const selected = all
    .map((raw, index) => ({ raw, index, status: resolveStatus(raw) as PaperTrade["status"] }))
    .filter(({ status }) => {
      const isOpen = status === "OPEN" || status === "PARTIAL EXIT";
      const isMoonbag = status === "MOONBAG";
      return scope === "OPEN_POSITIONS" ? isOpen : scope === "MOONBAGS" ? isMoonbag : isOpen || isMoonbag;
    });

  if (selected.length === 0) {
    throw new Error(`No positions available for ${BULK_SCOPE_LABELS[scope]}`);
  }

  const fraction = sellPct / 100;
  const positions: BulkSellResult["positions"] = [];
  const now = new Date().toISOString();

  for (const { raw, index, status } of selected) {
    const existing = { ...raw, status } as PaperTrade;
    const live = await fetchLiveData(existing.tokenMint);
    const sellPrice = live?.price ?? existing.currentPrice ?? existing.entryPrice;
    if (!Number.isFinite(sellPrice) || sellPrice <= 0) continue;

    const multiplier = sellPrice / existing.entryPrice;
    const previousPnl = existing.pnlUsd ?? 0;
    let proceedsUsd = 0;
    let pnlUsd = 0;

    if (status === "MOONBAG") {
      const heldSol = existing.remainingPositionSol ?? existing.amountSol ?? 0;
      const currentValueUsd = heldSol * 150 * multiplier;
      proceedsUsd = currentValueUsd * fraction;
      pnlUsd = proceedsUsd;
      const remainingSol = heldSol * (1 - fraction);
      all[index] = {
        ...raw,
        status: sellPct === 100 ? "MOONBAG EXIT" : "MOONBAG",
        amountSol: remainingSol,
        remainingPositionSol: remainingSol,
        currentPrice: sellPrice,
        currentValueUsd: currentValueUsd * (1 - fraction),
        moonbagAmountUsd: currentValueUsd * (1 - fraction),
        realizedProceedsUsd: (existing.realizedProceedsUsd ?? 0) + proceedsUsd,
        pnlUsd: previousPnl + pnlUsd,
        pnlSol: (previousPnl + pnlUsd) / 150,
        manualSellPct: sellPct,
        exitPrice: sellPrice,
        exitMultiplier: multiplier,
        exitTimestamp: sellPct === 100 ? now : existing.exitTimestamp,
      };
    } else {
      const remainingCostUsd = existing.positionSizeUsd;
      const amountSol = existing.amountSol;
      proceedsUsd = remainingCostUsd * multiplier * fraction;
      const costUsd = remainingCostUsd * fraction;
      pnlUsd = proceedsUsd - costUsd;
      const remainingFraction = 1 - fraction;
      const fullyClosed = sellPct === 100;
      all[index] = {
        ...raw,
        status: fullyClosed ? (previousPnl + pnlUsd >= 0 ? "WIN" : "LOSS") : "PARTIAL EXIT",
        positionSizeUsd: fullyClosed ? existing.positionSizeUsd : remainingCostUsd * remainingFraction,
        amountSol: fullyClosed ? amountSol : amountSol * remainingFraction,
        remainingPositionSol: fullyClosed ? 0 : amountSol * remainingFraction,
        currentPrice: sellPrice,
        exitPrice: sellPrice,
        exitMultiplier: multiplier,
        pnlUsd: previousPnl + pnlUsd,
        pnlSol: (previousPnl + pnlUsd) / 150,
        realizedProceedsUsd: (existing.realizedProceedsUsd ?? 0) + proceedsUsd,
        manualSellPct: sellPct,
        exitTimestamp: now,
      };
    }

    positions.push({
      tradeId: existing.id,
      tokenSymbol: existing.tokenSymbol,
      status: all[index].status,
      sellPrice,
      proceedsUsd,
      pnlUsd,
    });
  }

  if (positions.length === 0) throw new Error("No selected positions had a usable current price");
  writeJson(PAPER_TRADES_FILE, all);

  const totalProceedsUsd = positions.reduce((sum, position) => sum + position.proceedsUsd, 0);
  const totalPnlUsd = positions.reduce((sum, position) => sum + position.pnlUsd, 0);
  const scopeLabel = BULK_SCOPE_LABELS[scope];
  const action = `MANUAL EXIT — BULK (${scopeLabel})`;
  const logEntry = recordPaperEvent({
    action,
    source: "manual-bulk-sell",
    scope,
    scopeLabel,
    sellPct,
    affectedCount: positions.length,
    totalProceedsUsd,
    totalPnlUsd,
    positions,
  });
  logger.info({ scope, sellPct, affectedCount: positions.length, totalProceedsUsd, totalPnlUsd }, action);

  return {
    scope,
    scopeLabel,
    sellPct,
    affectedCount: positions.length,
    positions,
    totalProceedsUsd,
    totalPnlUsd,
    balance: getSimBalanceFull(),
    logEntry,
  };
}

export function sellPaperTrade(tradeId: string, sellPct: number, requestedPrice?: number): PaperSellResult {
  if (!tradeId || tradeId.length > 160) throw new Error("Invalid paper trade id");
  if (!Number.isFinite(sellPct) || sellPct <= 0 || sellPct > 100) {
    throw new Error("sellPct must be greater than 0 and no more than 100");
  }

  const all = readJson<any[]>(PAPER_TRADES_FILE, []);
  const index = all.findIndex((t) => t.id === tradeId);
  if (index === -1) throw new Error("Paper trade not found");
  const existing = { ...all[index], status: resolveStatus(all[index]) } as PaperTrade;
  if (existing.status !== "OPEN") throw new Error(`Paper trade is not open (status: ${existing.status})`);
  if (!Number.isFinite(existing.entryPrice) || existing.entryPrice <= 0) throw new Error("Paper trade has no valid entry price");

  const sellPrice = Number.isFinite(requestedPrice) && (requestedPrice as number) > 0
    ? requestedPrice as number
    : existing.currentPrice && existing.currentPrice > 0
      ? existing.currentPrice
      : existing.entryPrice;
  const fraction = sellPct / 100;
  const proceedsUsd = existing.positionSizeUsd * (sellPrice / existing.entryPrice) * fraction;
  const costUsd = existing.positionSizeUsd * fraction;
  const pnlUsd = proceedsUsd - costUsd;
  const now = new Date().toISOString();
  const closed = {
    ...all[index],
    status: sellPct === 100 ? (pnlUsd >= 0 ? "WIN" : "LOSS") : "PARTIAL EXIT",
    exitPrice: sellPrice,
    exitMultiplier: sellPrice / existing.entryPrice,
    pnlUsd,
    pnlSol: pnlUsd / 150,
    realizedProceedsUsd: proceedsUsd,
    manualSellPct: sellPct,
    exitTimestamp: now,
    ...(sellPct < 100 ? {
      positionSizeUsd: existing.positionSizeUsd * (1 - fraction),
      amountSol: existing.amountSol * (1 - fraction),
      remainingPositionSol: existing.amountSol * (1 - fraction),
    } : {}),
  };
  all[index] = closed;
  writeJson(PAPER_TRADES_FILE, all);

  const logEntry = recordPaperEvent({
    action: "SELL",
    source: "manual-paper-sell",
    tradeId,
    tokenMint: existing.tokenMint,
    tokenSymbol: existing.tokenSymbol,
    sellPct,
    sellPrice,
    proceedsUsd,
    pnlUsd,
    status: closed.status,
  });
  console.log(`[SIM] SELL ${existing.tokenSymbol} — ${sellPct}% at $${sellPrice.toFixed(8)} — proceeds $${proceedsUsd.toFixed(2)} — P&L ${pnlUsd >= 0 ? "+" : ""}$${pnlUsd.toFixed(2)}`);

  return {
    trade: { ...closed, status: resolveStatus(closed) } as PaperTrade,
    proceedsUsd,
    pnlUsd,
    sellPrice,
    sellPct,
    logEntry,
  };
}

// ── C2: live data fetcher (replaces price-only fetch) ────────────────────────
async function fetchLiveData(mint: string): Promise<{
  price: number; liquidityUsd: number; volume5m: number; buyTxns5m: number; sellTxns5m: number;
} | null> {
  try {
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
        remainingPositionSol: trade.amountSol * 0.5,
        remainingCostBasis:  0,
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
        ? rs * 150 * (currentMultiplier ?? 1) : mb.moonbagAmountUsd;
      return { ...mb, currentPrice: cp, currentMultiplier, currentValueUsd, delisted };
    }),
  );
}

// ── Daily report ──────────────────────────────────────────────────────────────
export function generateDailyReport(): DailyReport {
  const today     = getTodayUTC();
  const allTrades = getPaperTrades();
  const allToday  = allTrades.filter((t) => t.timestamp.startsWith(today));

  const wins   = allToday.filter((t) => t.status === "WIN" || t.status === "PARTIAL EXIT");
  const losses = allToday.filter((t) => t.status === "LOSS");
  const open   = allToday.filter((t) => t.status === "OPEN");

  const total = wins.length + losses.length;
  const winRate = total > 0 ? wins.length / total : 0;

  const avgWinSol  = wins.length > 0 ? wins.reduce((s, t) => s + (t.pnlSol ?? 0), 0) / wins.length : 0;
  const avgLossSol = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.pnlSol ?? 0), 0) / losses.length) : 0;
  const avgWinUsd  = wins.length > 0 ? wins.reduce((s, t) => s + (t.pnlUsd ?? 0), 0) / wins.length : 0;
  const avgLossUsd = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.pnlUsd ?? 0), 0) / losses.length) : 0;
  const expectancy = winRate * avgWinSol - (1 - winRate) * avgLossSol;

  const totalPnlSol = allToday.reduce((s, t) => s + (t.pnlSol ?? 0), 0);
  const totalPnlUsd = allToday.reduce((s, t) => s + (t.pnlUsd ?? 0), 0);

  const reasonCounts: Record<string, number> = {};
  allToday.filter((t) => t.status === "LOSS").forEach((t) => {
    const r = t.holderGrowthPattern ?? "Unknown";
    reasonCounts[r] = (reasonCounts[r] ?? 0) + 1;
  });
  const topFailureReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

  const biggestWin = wins.length > 0
    ? wins.sort((a, b) => (b.pnlUsd ?? 0) - (a.pnlUsd ?? 0)).map((t) => ({
        tokenSymbol: t.tokenSymbol,
        multiplier:  t.exitMultiplier ?? 0,
        pnlUsd:      t.pnlUsd ?? 0,
        pnlSol:      t.pnlSol ?? 0,
      }))[0] ?? null
    : null;

  const biggestLoss = losses.length > 0
    ? losses.sort((a, b) => (a.pnlUsd ?? 0) - (b.pnlUsd ?? 0)).map((t) => ({
        tokenSymbol: t.tokenSymbol,
        pnlUsd:      t.pnlUsd ?? 0,
        pnlSol:      t.pnlSol ?? 0,
        reason:      t.holderGrowthPattern ?? "Unknown",
      }))[0] ?? null
    : null;

  const simBal = getSimBalance();

  const report: DailyReport = {
    date:          today,
    totalTrades:   allToday.length,
    openTrades:    open.length,
    wins:          wins.length,
    losses:        losses.length,
    winRate,
    avgWinSol,
    avgLossSol,
    avgWinUsd,
    avgLossUsd,
    expectancy,
    topFailureReason,
    totalPnlSol,
    totalPnlUsd,
    simBalanceUsd: simBal.currentBalanceUsd,
    biggestWin,
    biggestLoss,
    isPaperMode: isPaperMode(),
  };

  writeJson(DAILY_REPORT_FILE, report);
  return report;
}

export function readDailyReport(): DailyReport | null {
  return readJson<DailyReport | null>(DAILY_REPORT_FILE, null);
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
