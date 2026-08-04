import fs from "fs";
import path from "path";
import { logger } from "./logger";

export type TradingModeValue = "paper" | "live";

interface TradingModeFile {
  mode: TradingModeValue;
  switchedAt: string;
  switchedBy: string;
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const MODE_FILE = path.join(DATA_DIR, "trading_mode.json");

let _mode: TradingModeValue = "paper";
let _switchedAt: string = new Date().toISOString();

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadTradingMode(): TradingModeValue {
  try {
    ensureDir();
    if (!fs.existsSync(MODE_FILE)) {
      saveTradingMode("paper", "default-first-launch");
      return "paper";
    }
    const raw = fs.readFileSync(MODE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as TradingModeFile;
    _mode = parsed.mode === "live" ? "live" : "paper";
    _switchedAt = parsed.switchedAt ?? new Date().toISOString();
    logger.info({ mode: _mode }, "Trading mode loaded from disk");
    return _mode;
  } catch (err) {
    logger.warn({ err }, "Could not load trading_mode.json — defaulting to paper");
    _mode = "paper";
    return "paper";
  }
}

function saveTradingMode(mode: TradingModeValue, by: string): void {
  ensureDir();
  const data: TradingModeFile = { mode, switchedAt: new Date().toISOString(), switchedBy: by };
  fs.writeFileSync(MODE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function isPaperMode(): boolean {
  return _mode === "paper";
}

export function getCurrentMode(): TradingModeValue {
  return _mode;
}

export function getModeState(): { mode: TradingModeValue; switchedAt: string } {
  return { mode: _mode, switchedAt: _switchedAt };
}

export function setTradingMode(newMode: TradingModeValue, by = "api"): { previous: TradingModeValue; current: TradingModeValue } {
  const previous = _mode;
  _mode = newMode;
  _switchedAt = new Date().toISOString();
  saveTradingMode(newMode, by);
  logger.info({ previous, current: newMode, by }, `Trading mode switched: ${previous} → ${newMode}`);
  return { previous, current: newMode };
}
