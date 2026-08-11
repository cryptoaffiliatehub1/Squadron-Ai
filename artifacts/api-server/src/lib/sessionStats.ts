/**
 * sessionStats.ts — per-day runtime data tracker
 * Single source of truth for: balance, rug stats, Jito tips, circuit triggers.
 * No circular deps — nothing else in this module imports other lib files.
 */
import fs from "fs";
import path from "path";
import { logger } from "./logger";

export interface SessionStats {
  date: string;
  dayStartBalance: number;
  dayStartAt: string;
  lastKnownBalance: number;
  solPriceUsd: number;
  rugsCaught: number;
  rugsMissed: number;
  jitoTipsPaidSol: number;
  jitoTipCount: number;
  circuitBreakerTriggers: number;
  conservativeModeTriggers: number;
}

export interface DailySnapshot {
  date: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnlSol: number;
  pnlUsd: number;
  pnlPct: number;
  startBalanceSol: number;
  endBalanceSol: number;
  rugsCaught: number;
  rugsMissed: number;
  biggestWin: { tokenSymbol: string; multiplier: number; pnlSol: number } | null;
  biggestLoss: { tokenSymbol: string; pnlSol: number; reason: string } | null;
  jitoTipAvgSol: number;
  jitoTipCount: number;
  regime: string;
  circuitBreakerTriggers: number;
  conservativeModeTriggers: number;
  isPaperMode: boolean;
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const SESSION_FILE = path.join(DATA_DIR, "session_stats.json");
const DAILY_REPORTS_DIR = path.join(DATA_DIR, "daily_reports");

function ensureDir(dir: string): void {
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

const todayStr = new Date().toISOString().split("T")[0]!;

let _stats: SessionStats = {
  date: todayStr,
  dayStartBalance: 0,
  dayStartAt: new Date().toISOString(),
  lastKnownBalance: 0,
  solPriceUsd: 150,
  rugsCaught: 0,
  rugsMissed: 0,
  jitoTipsPaidSol: 0,
  jitoTipCount: 0,
  circuitBreakerTriggers: 0,
  conservativeModeTriggers: 0,
};

// Load persisted stats on startup (same day only)
(function load() {
  const saved = readJson<SessionStats | null>(SESSION_FILE, null);
  if (saved && saved.date === todayStr) {
    _stats = saved;
    logger.info({ date: _stats.date, rugsCaught: _stats.rugsCaught }, "Session stats loaded from disk");
  }
})();

function persist(): void {
  try {
    ensureDir(DATA_DIR);
    fs.writeFileSync(SESSION_FILE, JSON.stringify(_stats, null, 2), "utf-8");
  } catch { /* silently ignore */ }
}

// ── Public API ───────────────────────────────────────────────────────────────

export function initSessionDay(balance: number, solPrice = 150): void {
  _stats.dayStartBalance = balance;
  _stats.dayStartAt = new Date().toISOString();
  _stats.lastKnownBalance = balance;
  _stats.solPriceUsd = solPrice;
  persist();
  logger.info({ balance, solPrice }, "[SESSION] Day initialized — starting balance recorded");
}

export function updateCurrentBalance(balance: number, solPrice?: number): void {
  _stats.lastKnownBalance = balance;
  if (solPrice !== undefined && solPrice > 0) _stats.solPriceUsd = solPrice;
  persist();
}

export function recordJitoTip(tipSol: number): void {
  if (tipSol > 0) {
    _stats.jitoTipsPaidSol += tipSol;
    _stats.jitoTipCount++;
    persist();
  }
}

export function recordSkippedToken(isLikelyRug: boolean): void {
  if (isLikelyRug) {
    _stats.rugsCaught++;
    persist();
  }
}

export function recordRugMissed(): void {
  _stats.rugsMissed++;
  persist();
}

export function recordCircuitBreakerTrigger(): void {
  _stats.circuitBreakerTriggers++;
  persist();
}

export function recordConservativeMode(): void {
  _stats.conservativeModeTriggers++;
  persist();
}

export function getSessionStats(): SessionStats {
  return { ..._stats };
}

export function getJitoTipAvg(): number {
  return _stats.jitoTipCount > 0 ? _stats.jitoTipsPaidSol / _stats.jitoTipCount : 0;
}

// ── Daily snapshot archive (used by weekly/monthly reports) ──────────────────

export function saveDailySnapshot(snapshot: DailySnapshot): void {
  try {
    ensureDir(DAILY_REPORTS_DIR);
    const file = path.join(DAILY_REPORTS_DIR, `${snapshot.date}.json`);
    fs.writeFileSync(file, JSON.stringify(snapshot, null, 2), "utf-8");
    logger.info({ date: snapshot.date }, "[SESSION] Daily snapshot archived");
  } catch (err) {
    logger.warn({ err }, "Failed to save daily snapshot");
  }
}

export function getDailySnapshots(days: number): DailySnapshot[] {
  try {
    ensureDir(DAILY_REPORTS_DIR);
    const files = fs.readdirSync(DAILY_REPORTS_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, days);
    return files
      .map((f) => readJson<DailySnapshot | null>(path.join(DAILY_REPORTS_DIR, f), null))
      .filter((s): s is DailySnapshot => s !== null)
      .reverse();
  } catch {
    return [];
  }
}

export function getMonthSnapshots(year: number, month: number): DailySnapshot[] {
  try {
    ensureDir(DAILY_REPORTS_DIR);
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    const files = fs.readdirSync(DAILY_REPORTS_DIR)
      .filter((f) => f.startsWith(prefix) && f.endsWith(".json"))
      .sort();
    return files
      .map((f) => readJson<DailySnapshot | null>(path.join(DAILY_REPORTS_DIR, f), null))
      .filter((s): s is DailySnapshot => s !== null);
  } catch {
    return [];
  }
}
