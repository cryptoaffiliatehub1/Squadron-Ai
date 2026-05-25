import fs from "fs";
import path from "path";
import { logger } from "./logger";

export interface PaperTrade {
  id: string;
  tokenMint: string;
  tokenSymbol: string;
  tokenName: string;
  type: "buy" | "sell";
  amountSol: number;
  entryPrice: number;
  exitPrice: number | null;
  pnlSol: number | null;
  pnlUsd: number | null;
  filtersPassedCount: number;
  filtersFailedCount: number;
  filterDetails: Record<string, boolean | string>;
  probabilityScore: number;
  regime: string;
  timestamp: string;
  exitTimestamp: string | null;
}

export interface DailyReport {
  date: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgWinSol: number;
  avgLossSol: number;
  expectancy: number;
  topFailureReason: string;
  totalPnlSol: number;
  // Biggest trades
  biggestWin: { tokenSymbol: string; multiplier: number; pnlSol: number } | null;
  biggestLoss: { tokenSymbol: string; pnlSol: number; reason: string } | null;
  isPaperMode: boolean;
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const PAPER_TRADES_FILE = path.join(DATA_DIR, "paper_trades.json");
const DAILY_REPORT_FILE = path.join(DATA_DIR, "daily_report.json");
const WEIGHTS_FILE = path.join(DATA_DIR, "weights_history.json");
const FAILED_REPORTS_DIR = path.join(DATA_DIR, "failed_reports");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown): void {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

export function isPaperMode(): boolean {
  // Delegate to tradingMode — env var is no longer source of truth
  try {
    const { isPaperMode: tm } = require("./tradingMode") as { isPaperMode: () => boolean };
    return tm();
  } catch {
    return true;
  }
}

export function recordPaperTrade(trade: PaperTrade): void {
  ensureDir(DATA_DIR);
  const trades = readJson<PaperTrade[]>(PAPER_TRADES_FILE, []);
  trades.push(trade);
  writeJson(PAPER_TRADES_FILE, trades);
  logger.info(
    { id: trade.id, symbol: trade.tokenSymbol, type: trade.type, amountSol: trade.amountSol },
    `[PAPER_TRADE] ${trade.type.toUpperCase()} ${trade.tokenSymbol} — ${trade.amountSol.toFixed(4)} SOL`,
  );
}

export function getPaperTrades(): PaperTrade[] {
  return readJson<PaperTrade[]>(PAPER_TRADES_FILE, []);
}

export function generateDailyReport(): DailyReport {
  const trades = getPaperTrades();
  const today = new Date().toISOString().split("T")[0]!;
  const todayTrades = trades.filter(
    (t) => t.exitTimestamp?.startsWith(today) || t.timestamp.startsWith(today),
  );

  const sells = todayTrades.filter((t) => t.type === "sell" && t.pnlSol !== null);
  const wins = sells.filter((t) => (t.pnlSol ?? 0) > 0);
  const losses = sells.filter((t) => (t.pnlSol ?? 0) <= 0);

  const avgWin =
    wins.length > 0 ? wins.reduce((s, t) => s + (t.pnlSol ?? 0), 0) / wins.length : 0;
  const avgLoss =
    losses.length > 0
      ? Math.abs(losses.reduce((s, t) => s + (t.pnlSol ?? 0), 0) / losses.length)
      : 0;
  const winRate = sells.length > 0 ? wins.length / sells.length : 0;
  const expectancy = avgWin * winRate - avgLoss * (1 - winRate);

  const failReasons: Record<string, number> = {};
  todayTrades.forEach((t) => {
    Object.entries(t.filterDetails).forEach(([k, v]) => {
      if (v === false) failReasons[k] = (failReasons[k] ?? 0) + 1;
    });
  });
  const topFailureReason =
    Object.entries(failReasons).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";
  const totalPnlSol = sells.reduce((s, t) => s + (t.pnlSol ?? 0), 0);

  // Biggest win/loss
  let biggestWin: DailyReport["biggestWin"] = null;
  let biggestLoss: DailyReport["biggestLoss"] = null;

  if (wins.length > 0) {
    const best = wins.reduce((a, b) => ((a.pnlSol ?? 0) >= (b.pnlSol ?? 0) ? a : b));
    const multiplier =
      best.entryPrice > 0 && best.exitPrice !== null
        ? (best.amountSol + (best.pnlSol ?? 0)) / best.amountSol
        : 0;
    biggestWin = { tokenSymbol: best.tokenSymbol, multiplier, pnlSol: best.pnlSol ?? 0 };
  }

  if (losses.length > 0) {
    const worst = losses.reduce((a, b) => ((a.pnlSol ?? 0) <= (b.pnlSol ?? 0) ? a : b));
    const reason =
      Object.entries(worst.filterDetails)
        .filter(([, v]) => v === false)
        .map(([k]) => k)[0] ?? "exit";
    biggestLoss = { tokenSymbol: worst.tokenSymbol, pnlSol: worst.pnlSol ?? 0, reason };
  }

  const report: DailyReport = {
    date: today,
    totalTrades: todayTrades.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    avgWinSol: avgWin,
    avgLossSol: avgLoss,
    expectancy,
    topFailureReason,
    totalPnlSol,
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
  const file = path.join(FAILED_REPORTS_DIR, `report_${name}.txt`);
  fs.writeFileSync(file, content, "utf-8");
  logger.info({ file }, "Failed report saved to disk");
}
