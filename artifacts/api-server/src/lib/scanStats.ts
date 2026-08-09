import fs from "fs";
import path from "path";
import { logger } from "./logger";

// ── Persistent cumulative scan funnel tracker ─────────────────────────────────
// Written to data/scan_stats.json, survives restarts and redeploys.
// Batched (3s debounce) to avoid file thrash on high-frequency gate events.

const DATA_DIR        = path.resolve(process.cwd(), "data");
const SCAN_STATS_FILE = path.join(DATA_DIR, "scan_stats.json");

export interface DayStat {
  date:                string;
  tokensScanned:       number;  // entered the risk gate
  passedLiquidity:     number;  // cleared $15k liquidity floor
  passedRugCheck:      number;  // cleared rug + birdeye checks
  passedWalletChecks:  number;  // cleared sniper + seeding + age checks
  passedAllGates:      number;  // final risk gate PASS
  actualEntries:       number;  // paper/live buy executed
}

export type ScanGate =
  | "scanned"
  | "passedLiquidity"
  | "passedRugCheck"
  | "passedWalletChecks"
  | "passedAllGates"
  | "actualEntries";

interface ScanStatsStore {
  daily:       Record<string, DayStat>;
  lastUpdated: string;
}

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readStore(): ScanStatsStore {
  try {
    if (!fs.existsSync(SCAN_STATS_FILE)) return { daily: {}, lastUpdated: new Date().toISOString() };
    return JSON.parse(fs.readFileSync(SCAN_STATS_FILE, "utf-8")) as ScanStatsStore;
  } catch {
    return { daily: {}, lastUpdated: new Date().toISOString() };
  }
}

function writeStore(store: ScanStatsStore): void {
  ensureDir(DATA_DIR);
  store.lastUpdated = new Date().toISOString();
  fs.writeFileSync(SCAN_STATS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function emptyDay(date: string): DayStat {
  return {
    date, tokensScanned: 0, passedLiquidity: 0, passedRugCheck: 0,
    passedWalletChecks: 0, passedAllGates: 0, actualEntries: 0,
  };
}

// ── Batched flush — accumulates increments, writes every 3s ──────────────────
let _timer: ReturnType<typeof setTimeout> | null = null;
const _pending = new Map<string, Partial<Record<ScanGate, number>>>();

function flushPending(): void {
  if (_pending.size === 0) return;
  try {
    const store = readStore();
    for (const [key, delta] of _pending) {
      if (!store.daily[key]) store.daily[key] = emptyDay(key);
      const day = store.daily[key];
      if (delta.scanned)            day.tokensScanned      += delta.scanned;
      if (delta.passedLiquidity)    day.passedLiquidity    += delta.passedLiquidity;
      if (delta.passedRugCheck)     day.passedRugCheck     += delta.passedRugCheck;
      if (delta.passedWalletChecks) day.passedWalletChecks += delta.passedWalletChecks;
      if (delta.passedAllGates)     day.passedAllGates     += delta.passedAllGates;
      if (delta.actualEntries)      day.actualEntries      += delta.actualEntries;
    }
    _pending.clear();
    writeStore(store);
  } catch (err) {
    logger.warn({ err }, "[SCAN_STATS] Flush failed");
  }
}

export function incrementGate(gate: ScanGate, count = 1): void {
  const key = getTodayKey();
  if (!_pending.has(key)) _pending.set(key, {});
  const delta = _pending.get(key)!;
  delta[gate] = (delta[gate] ?? 0) + count;
  if (!_timer) {
    _timer = setTimeout(() => { _timer = null; flushPending(); }, 3_000);
  }
}

export function getScanStats(): { today: DayStat; week: DayStat; daily: DayStat[] } {
  // Force flush so caller sees latest pending increments
  if (_timer) { clearTimeout(_timer); _timer = null; }
  flushPending();

  const store    = readStore();
  const todayKey = getTodayKey();
  const today    = store.daily[todayKey] ?? emptyDay(todayKey);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffKey = cutoff.toISOString().split("T")[0];

  const week = emptyDay("last-7d");
  const daily: DayStat[] = [];

  for (const [key, day] of Object.entries(store.daily)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7)) {
    if (key >= cutoffKey) {
      week.tokensScanned      += day.tokensScanned;
      week.passedLiquidity    += day.passedLiquidity;
      week.passedRugCheck     += day.passedRugCheck;
      week.passedWalletChecks += day.passedWalletChecks;
      week.passedAllGates     += day.passedAllGates;
      week.actualEntries      += day.actualEntries;
      daily.push(day);
    }
  }

  return { today, week, daily: daily.sort((a, b) => b.date.localeCompare(a.date)) };
}
