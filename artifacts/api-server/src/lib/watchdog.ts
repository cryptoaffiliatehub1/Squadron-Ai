import { logger } from "./logger";
import { getScannerState, startTripleRadarScanner, stopTripleRadarScanner } from "./scanner";
import type { TokenCallback } from "./scanner";

interface WatchdogState {
  running: boolean;
  scannerCrashCount: number;
  lastHeartbeat: Date | null;
  lastRestart: Date | null;
  wsLagWarnings: number;
}

const state: WatchdogState = {
  running: false,
  scannerCrashCount: 0,
  lastHeartbeat: null,
  lastRestart: null,
  wsLagWarnings: 0,
};

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let watchdogInterval: ReturnType<typeof setInterval> | null = null;
let onScanToken: TokenCallback | null = null;

export function recordHeartbeat(): void {
  state.lastHeartbeat = new Date();
}

function checkScannerHealth(): void {
  const scannerState = getScannerState();
  const now = Date.now();

  if (state.lastHeartbeat && now - state.lastHeartbeat.getTime() > 5_000) {
    logger.warn({ lastHeartbeat: state.lastHeartbeat }, "WATCHDOG: Scanner heartbeat stale — restarting scanner");
    state.scannerCrashCount++;
    state.lastRestart = new Date();

    try {
      stopTripleRadarScanner();
      if (onScanToken) {
        setTimeout(() => {
          startTripleRadarScanner(onScanToken!);
          logger.info("WATCHDOG: Scanner restarted successfully");
        }, 2000);
      }
    } catch (err) {
      logger.error({ err }, "WATCHDOG: Failed to restart scanner");
    }
    return;
  }

  if (!scannerState.pumpFunConnected && scannerState.activeSource === "pumpfun") {
    logger.warn("WATCHDOG: Pump.fun WS disconnected — failover to Birdeye detected by watchdog");
  }
}

export function startWatchdog(tokenCallback: TokenCallback): void {
  if (state.running) return;
  state.running = true;
  onScanToken = tokenCallback;

  heartbeatInterval = setInterval(() => {
    recordHeartbeat();
  }, 3_000);

  watchdogInterval = setInterval(() => {
    checkScannerHealth();
  }, 5_000);

  logger.info("WATCHDOG: Self-healing watchdog started — monitoring scanner process");
}

export function stopWatchdog(): void {
  state.running = false;
  if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
  if (watchdogInterval) { clearInterval(watchdogInterval); watchdogInterval = null; }
  logger.info("WATCHDOG: Stopped");
}

export function getWatchdogState(): WatchdogState {
  return { ...state };
}
