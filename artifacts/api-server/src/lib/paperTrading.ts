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
  type: "buy";
  status: "OPEN" | "WIN" | "LOSS" | "MOONBAG";
  amountSol: number;
  positionSizeUsd: number;
  tier: string;
  entryPrice: number;
  targetPrice: number;      // entryPrice * 2.5 — golden exit trigger
  stopLoss: number;         // entryPrice * 0.7 — stop-loss trigger
  exitPrice: number | null;
  exitMultiplier: number | null;
  pnlSol: number | null;
  pnlUsd: number | null;
  moonbagAmountUsd: number | null;  // 50% of exit value when status === "MOONBAG"
  filtersPassedCount: number;
  filtersFailedCount: number;
  filterDetails: Record<string, boolean | string>;
  probabilityScore: number;
  regime: string;
  timestamp: string;
  exitTimestamp: string | null;
  relaxedMode?: boolean;
  // C1: extra signal fields captured at entry
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
}

export interface DailyReport {
  date: string;
  totalTrades: number;   // Fix 3: ALL entries (OPEN + WIN + LOSS + MOONBAG)
  openTrades: number;
  wins: number;
  losses: number;
  winRate: number;       // Fix 3: WIN / (WIN + LOSS) — OPEN excluded
  avgWinSol: number;
  avgLossSol: number;
  expectancy: number;
  topFailureReason: string;
  totalPnlSol: number;
  totalPnlUsd: number;
  simBalanceUsd: number; // Fix 4: $100 starting balance tracker
  biggestWin: { tokenSymbol: string; multiplier: number; pnlUsd: number } | null;
  biggestLoss: { tokenSymbol: string; pnlUsd: number; reason: string } | null;
  isPaperMode: boolean;
}

export interface SimBalance {
  startingBalanceUsd: number;
  currentBalanceUsd: number;
  lockedInOpenUsd: number;
  realizedPnlUsd: number;
  pnlPct: number;
}

// ── File paths ────────────────────────────────────────────────────────────────

const DATA_DIR          = path.resolve(process.cwd(), "data");
const PAPER_TRADES_FILE = path.join(DATA_DIR, "paper_trades.json");
const DAILY_REPORT_FILE = path.join(DATA_DIR, "daily_report.json");
const WEIGHTS_FILE      = path.join(DATA_DIR, "weights_history.json");
const FAILED_REPORTS_DIR = path.join(DATA_DIR, "failed_reports");

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

// Backward-compat: old trades had no status field
function resolveStatus(t: any): "OPEN" | "WIN" | "LOSS" | "MOONBAG" {
  if (t.status) return t.status as "OPEN" | "WIN" | "LOSS" | "MOONBAG";
  if (t.exitTimestamp && t.pnlSol !== null) return t.pnlSol > 0 ? "WIN" : "LOSS";
  return "OPEN";
}

export function isPaperMode(): boolean {
  try {
    const { isPaperMode: tm } = require("./tradingMode") as { isPaperMode: () => boolean };
    return tm();
  } catch { return true; }
}

// ── Fix 9: relaxed sim mode ───────────────────────────────────────────────────
export function noRecentPaperTrades(windowMinutes = 30): boolean {
  try {
    const trades = readJson<any[]>(PAPER_TRADES_FILE, []);
    const cutoff = Date.now() - windowMinutes * 60_000;
    return trades.filter((t) => new Date(t.timestamp).getTime() > cutoff).length === 0;
  } catch { return true; }
}

// ── Fix 1: dedup — one open trade per mint ────────────────────────────────────
export function hasOpenPaperTrade(mint: string): boolean {
  try {
    const trades = readJson<any[]>(PAPER_TRADES_FILE, []);
    return trades.some(
      (t) => t.tokenMint === mint && resolveStatus(t) === "OPEN",
    );
  } catch { return false; }
}

// ── Read helpers ──────────────────────────────────────────────────────────────
export function getPaperTrades(): PaperTrade[] {
  const raw = readJson<any[]>(PAPER_TRADES_FILE, []);
  return raw.map((t) => ({ ...t, status: resolveStatus(t) })) as PaperTrade[];
}

export function getOpenTrades(): PaperTrade[] {
  return getPaperTrades().filter((t) => t.status === "OPEN");
}

export function getMoonbagTrades(): PaperTrade[] {
  return getPaperTrades().filter((t) => t.status === "MOONBAG");
}

// ── Fix 4: simulated balance tracker — starts at $100 ─────────────────────────
export function getSimBalance(): SimBalance {
  const START = 100;
  const trades = getPaperTrades();

  let lockedInOpenUsd = 0;
  let realizedPnlUsd  = 0;

  for (const t of trades) {
    if (t.status === "OPEN") {
      lockedInOpenUsd += t.positionSizeUsd;
    } else if (t.status === "WIN" || t.status === "MOONBAG") {
      // WIN: sold 50% at 2.5× → cash = 1.25 * posSize, net PnL = +0.25 * posSize
      realizedPnlUsd += (t.pnlUsd ?? t.positionSizeUsd * 0.25);
    } else if (t.status === "LOSS") {
      // LOSS: sold 100% at 0.7× → net PnL = -0.3 * posSize
      realizedPnlUsd += (t.pnlUsd ?? -(t.positionSizeUsd * 0.3));
    }
  }

  const currentBalanceUsd = START + realizedPnlUsd - lockedInOpenUsd;
  const pnlPct = ((currentBalanceUsd - START) / START) * 100;

  return { startingBalanceUsd: START, currentBalanceUsd, lockedInOpenUsd, realizedPnlUsd, pnlPct };
}

// ── Record a new paper trade (Fix 1: skip if already open) ────────────────────
export function recordPaperTrade(trade: Omit<PaperTrade, "status" | "targetPrice" | "stopLoss" | "exitMultiplier" | "moonbagAmountUsd"> & { entryPrice: number }): void {
  ensureDir(DATA_DIR);

  if (hasOpenPaperTrade(trade.tokenMint)) {
    console.log(`DUPLICATE TRADE SKIPPED — ${trade.tokenName}`);
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

  const tag = (trade as any).relaxedMode ? "[SIM-RELAXED]" : "[PAPER_TRADE]";
  logger.info(
    { id: full.id, symbol: full.tokenSymbol, positionSizeUsd: full.positionSizeUsd, status: "OPEN" },
    `${tag} BUY ${full.tokenSymbol} — ${full.amountSol.toFixed(4)} SOL ($${full.positionSizeUsd})`,
  );
}

// ── Fix 5: price fetcher for exit engine ─────────────────────────────────────
async function fetchCurrentPrice(mint: string): Promise<number | null> {
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
    return isFinite(price) && price > 0 ? price : null;
  } catch { return null; }
}

// ── Fix 5: exit engine — runs every 60s ──────────────────────────────────────
let exitEngineInterval: ReturnType<typeof setInterval> | null = null;

async function runExitCheck(): Promise<void> {
  const open = getOpenTrades();
  if (open.length === 0) return;

  for (const trade of open) {
    if (!trade.entryPrice || trade.entryPrice <= 0) continue;

    const currentPrice = await fetchCurrentPrice(trade.tokenMint);
    if (currentPrice === null) continue;

    const multiplier    = currentPrice / trade.entryPrice;
    const targetPrice   = trade.targetPrice || trade.entryPrice * 2.5;
    const stopLossPrice = trade.stopLoss  || trade.entryPrice * 0.7;

    if (currentPrice >= targetPrice) {
      // ── Golden exit: sell 50%, move 50% to MOONBAG ─────────────────────
      const exitValue50Pct  = trade.positionSizeUsd * multiplier * 0.5;
      const pnlUsd          = exitValue50Pct - trade.positionSizeUsd;   // net of cost
      const moonbagAmountUsd = trade.positionSizeUsd * multiplier * 0.5; // unrealized vault value
      const now = new Date().toISOString();

      const trades = readJson<any[]>(PAPER_TRADES_FILE, []);
      const idx    = trades.findIndex((t: any) => t.id === trade.id);
      if (idx === -1) continue;

      // WIN record — records the 50% that was sold
      trades[idx] = {
        ...trades[idx],
        status:           "WIN",
        exitPrice:        currentPrice,
        exitMultiplier:   multiplier,
        pnlUsd,
        pnlSol:           pnlUsd / 150,
        exitTimestamp:    now,
      };

      // MOONBAG record — the other 50% moves to vault with $0 cost basis
      const moonbagEntry: PaperTrade = {
        ...(trades[idx] as any),
        id:               `mb_${trade.id}`,
        status:           "MOONBAG",
        positionSizeUsd:  0,   // cost basis $0 — already recovered
        pnlUsd:           moonbagAmountUsd,
        pnlSol:           moonbagAmountUsd / 150,
        moonbagAmountUsd,
        exitPrice:        null,
        exitMultiplier:   multiplier,
        exitTimestamp:    null,
        timestamp:        now,
      };
      trades.push(moonbagEntry);
      writeJson(PAPER_TRADES_FILE, trades);

      console.log(
        `PAPER EXIT WIN — ${trade.tokenName} | entry $${trade.entryPrice.toFixed(6)} → exit $${currentPrice.toFixed(6)} | ${multiplier.toFixed(2)}× | PnL +$${pnlUsd.toFixed(2)} | 50% moonbag $${moonbagAmountUsd.toFixed(2)}`,
      );

    } else if (currentPrice <= stopLossPrice) {
      // ── Stop loss: sell 100% ────────────────────────────────────────────
      const exitValueUsd = trade.positionSizeUsd * multiplier;
      const pnlUsd       = exitValueUsd - trade.positionSizeUsd;  // negative
      const now = new Date().toISOString();

      const trades = readJson<any[]>(PAPER_TRADES_FILE, []);
      const idx    = trades.findIndex((t: any) => t.id === trade.id);
      if (idx === -1) continue;

      trades[idx] = {
        ...trades[idx],
        status:           "LOSS",
        exitPrice:        currentPrice,
        exitMultiplier:   multiplier,
        pnlUsd,
        pnlSol:           pnlUsd / 150,
        exitTimestamp:    now,
      };
      writeJson(PAPER_TRADES_FILE, trades);

      console.log(
        `PAPER EXIT LOSS — ${trade.tokenName} | entry $${trade.entryPrice.toFixed(6)} → exit $${currentPrice.toFixed(6)} | ${multiplier.toFixed(2)}× | PnL $${pnlUsd.toFixed(2)}`,
      );
    }
  }
}

export function startExitEngine(): void {
  if (exitEngineInterval) return;
  exitEngineInterval = setInterval(() => {
    runExitCheck().catch((e) => logger.warn({ e }, "[EXIT_ENGINE] Price check error"));
  }, 60_000);
  // C1: start context-aware moonbag monitor alongside exit engine
  startMoonbagMonitor();
  console.log("EXIT ENGINE ACTIVE — checking prices every 60s");
}

export function stopExitEngine(): void {
  if (exitEngineInterval) { clearInterval(exitEngineInterval); exitEngineInterval = null; }
  stopMoonbagMonitor();
}

// ── Fix 8: Moonbag with live price ───────────────────────────────────────────
export async function getMoonbagsWithPrices(): Promise<Array<PaperTrade & { currentPrice: number | null; currentMultiplier: number | null; currentValueUsd: number | null; delisted: boolean }>> {
  const moonbags = getMoonbagTrades();
  return Promise.all(
    moonbags.map(async (mb) => {
      const currentPrice = await fetchCurrentPrice(mb.tokenMint);
      const delisted     = currentPrice === null;
      const currentMultiplier = currentPrice != null && mb.entryPrice > 0
        ? currentPrice / mb.entryPrice
        : null;
      const currentValueUsd = currentPrice != null && mb.moonbagAmountUsd != null
        ? mb.moonbagAmountUsd * (currentMultiplier ?? 1)
        : mb.moonbagAmountUsd;
      return { ...mb, currentPrice, currentMultiplier, currentValueUsd, delisted };
    }),
  );
}

// ── Fix 3: generateDailyReport — correct counters ────────────────────────────
export function generateDailyReport(): DailyReport {
  const trades = getPaperTrades();
  const today  = new Date().toISOString().split("T")[0]!;

  // Count ALL entries regardless of status
  const allToday = trades.filter(
    (t) => t.timestamp.startsWith(today) || t.exitTimestamp?.startsWith(today),
  );

  const wins   = allToday.filter((t) => t.status === "WIN");
  const losses = allToday.filter((t) => t.status === "LOSS");
  const open   = allToday.filter((t) => t.status === "OPEN");

  const avgWinSol  = wins.length   > 0 ? wins.reduce((s, t) => s + (t.pnlSol ?? 0), 0) / wins.length   : 0;
  const avgLossSol = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.pnlSol ?? 0), 0) / losses.length) : 0;

  // Fix 3: win rate = WIN / (WIN + LOSS), OPEN not counted
  const decided = wins.length + losses.length;
  const winRate = decided > 0 ? wins.length / decided : 0;
  const expectancy = avgWinSol * winRate - avgLossSol * (1 - winRate);
  const totalPnlSol = [...wins, ...losses].reduce((s, t) => s + (t.pnlSol ?? 0), 0);
  const totalPnlUsd = [...wins, ...losses].reduce((s, t) => s + (t.pnlUsd ?? 0), 0);

  const failReasons: Record<string, number> = {};
  allToday.forEach((t) => {
    Object.entries(t.filterDetails ?? {}).forEach(([k, v]) => {
      if (v === false) failReasons[k] = (failReasons[k] ?? 0) + 1;
    });
  });
  const topFailureReason = Object.entries(failReasons).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";

  let biggestWin: DailyReport["biggestWin"]   = null;
  let biggestLoss: DailyReport["biggestLoss"] = null;

  if (wins.length > 0) {
    const best = wins.reduce((a, b) => ((a.pnlUsd ?? 0) >= (b.pnlUsd ?? 0) ? a : b));
    biggestWin = { tokenSymbol: best.tokenSymbol, multiplier: best.exitMultiplier ?? 0, pnlUsd: best.pnlUsd ?? 0 };
  }
  if (losses.length > 0) {
    const worst  = losses.reduce((a, b) => ((a.pnlUsd ?? 0) <= (b.pnlUsd ?? 0) ? a : b));
    const reason = Object.entries(worst.filterDetails ?? {}).filter(([, v]) => v === false).map(([k]) => k)[0] ?? "exit";
    biggestLoss  = { tokenSymbol: worst.tokenSymbol, pnlUsd: worst.pnlUsd ?? 0, reason };
  }

  const simBal = getSimBalance();

  const report: DailyReport = {
    date:             today,
    totalTrades:      allToday.length,   // Fix 3: ALL entries
    openTrades:       open.length,
    wins:             wins.length,
    losses:           losses.length,
    winRate,
    avgWinSol,
    avgLossSol,
    expectancy,
    topFailureReason,
    totalPnlSol,
    totalPnlUsd,
    simBalanceUsd:    simBal.currentBalanceUsd,
    biggestWin,
    biggestLoss,
    isPaperMode:      isPaperMode(),
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
