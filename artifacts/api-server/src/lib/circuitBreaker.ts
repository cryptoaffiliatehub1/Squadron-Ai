import { logger } from "./logger";
import { recordCircuitBreakerTrigger, recordConservativeMode } from "./sessionStats";

export type CircuitState =
  | "NORMAL"
  | "FORTRESS_LOCKED"
  | "OBSERVATION_MODE"
  | "PSYCHOLOGICAL_LOCKOUT"
  | "GLOBAL_FLOOR_HIT"
  | "LOW_BALANCE_PAUSE";

interface CircuitBreakerState {
  state: CircuitState;
  reason: string | null;
  lockedUntil: Date | null;
  startOfDayBalance: number;
  startOfLifeBalance: number | null;
  currentBalance: number;
  dailyGainPct: number;
  conservativeMode: boolean;
  consecutiveLosses: number;
  humanOverrideAt: Date | null;
  killSwitchHistory: Array<{ at: string; reason: string }>;
  dayStartAt: Date;
  fortressTriggerCount: number;
  conservativeModeTriggerCount: number;
}

const DAILY_GAIN_TARGET_PCT = 5;
const DAILY_LOSS_LIMIT_PCT = 10;
const GLOBAL_FLOOR_PCT = 50;
const CONSERVATIVE_MAX_PCT = 5;
const NORMAL_MAX_PCT = 20;

const state: CircuitBreakerState = {
  state: "NORMAL",
  reason: null,
  lockedUntil: null,
  startOfDayBalance: 0,
  startOfLifeBalance: null,
  currentBalance: 0,
  dailyGainPct: 0,
  conservativeMode: false,
  consecutiveLosses: 0,
  humanOverrideAt: null,
  killSwitchHistory: [],
  dayStartAt: new Date(),
  fortressTriggerCount: 0,
  conservativeModeTriggerCount: 0,
};

export function initializeBalances(balance: number): void {
  state.currentBalance = balance;
  state.startOfDayBalance = balance;
  if (state.startOfLifeBalance === null) {
    state.startOfLifeBalance = balance;
    logger.info({ balance }, "Circuit breaker: starting balance recorded");
  }
}

export function updateBalance(newBalance: number): void {
  state.currentBalance = newBalance;
  if (state.startOfDayBalance > 0) {
    state.dailyGainPct = ((newBalance - state.startOfDayBalance) / state.startOfDayBalance) * 100;
  }
  _checkThresholds();
}

function _checkThresholds(): void {
  if (state.state === "FORTRESS_LOCKED" || state.state === "GLOBAL_FLOOR_HIT") return;

  if (
    state.startOfLifeBalance !== null &&
    state.currentBalance < state.startOfLifeBalance * (GLOBAL_FLOOR_PCT / 100)
  ) {
    state.state = "GLOBAL_FLOOR_HIT";
    state.reason = `Balance dropped below ${GLOBAL_FLOOR_PCT}% of starting balance (${state.startOfLifeBalance.toFixed(4)} SOL). MANUAL RESTART REQUIRED.`;
    logger.error(
      { balance: state.currentBalance, floor: state.startOfLifeBalance },
      "GLOBAL FLOOR HIT — MANUAL RESTART REQUIRED",
    );
    return;
  }

  if (state.dailyGainPct <= -DAILY_LOSS_LIMIT_PCT) {
    engageFortress(`Daily loss limit of ${DAILY_LOSS_LIMIT_PCT}% reached`);
    return;
  }

  if (state.dailyGainPct >= DAILY_GAIN_TARGET_PCT && !state.conservativeMode) {
    state.conservativeMode = true;
    state.conservativeModeTriggerCount++;
    recordConservativeMode();
    logger.info(
      { dailyGainPct: state.dailyGainPct },
      `Daily ${DAILY_GAIN_TARGET_PCT}% target achieved — switching to Conservative Mode`,
    );
  }

  if (state.currentBalance < 0.001) {
    state.state = "LOW_BALANCE_PAUSE";
    state.reason = "Balance below 0.001 SOL — Jito tips may fail";
    logger.warn("LOW SOL BALANCE — pausing new entries");
  } else if (state.state === "LOW_BALANCE_PAUSE" && state.currentBalance >= 0.002) {
    state.state = "NORMAL";
    state.reason = null;
    logger.info("Balance recovered — resuming entries");
  }
}

export function engageFortress(reason: string): void {
  state.state = "FORTRESS_LOCKED";
  state.reason = reason;
  state.lockedUntil = new Date(Date.now() + 12 * 60 * 60 * 1000);
  state.killSwitchHistory.push({ at: new Date().toISOString(), reason });
  state.fortressTriggerCount++;
  recordCircuitBreakerTrigger();
  logger.error({ reason, lockedUntil: state.lockedUntil }, "FORTRESS LOCKED: DAILY LOSS LIMIT REACHED");
}

export function engageObservationMode(reason: string): void {
  state.state = "OBSERVATION_MODE";
  state.reason = reason;
  state.lockedUntil = new Date(Date.now() + 4 * 60 * 60 * 1000);
  logger.warn({ reason }, "OBSERVATION MODE: 4 hour pause");
}

export function recordTradeResult(isRug: boolean): void {
  if (isRug) {
    state.consecutiveLosses++;
    if (state.consecutiveLosses >= 3) {
      engageObservationMode(`${state.consecutiveLosses} consecutive rugs detected`);
    }
  } else {
    state.consecutiveLosses = 0;
  }
}

export function humanOverride(): void {
  state.humanOverrideAt = new Date();
  state.state = "PSYCHOLOGICAL_LOCKOUT";
  state.reason = "Human manual override — 2-hour psychological lockout";
  state.lockedUntil = new Date(Date.now() + 2 * 60 * 60 * 1000);
  state.killSwitchHistory.push({ at: new Date().toISOString(), reason: "Manual override" });
  logger.warn("PSYCHOLOGICAL LOCKOUT: 2-hour prevention from revenge trading");
}

export function resetFortress(): void {
  if (state.state === "GLOBAL_FLOOR_HIT") {
    logger.info("GLOBAL FLOOR: manual reset confirmed — resuming operations");
    state.startOfLifeBalance = state.currentBalance;
    state.startOfDayBalance = state.currentBalance;
  }
  state.state = "NORMAL";
  state.reason = null;
  state.lockedUntil = null;
  state.consecutiveLosses = 0;
  state.conservativeMode = false;
  logger.info("Circuit breaker reset");
}

export function resetDay(): void {
  state.startOfDayBalance = state.currentBalance;
  state.dailyGainPct = 0;
  state.conservativeMode = false;
  state.dayStartAt = new Date();
  if (state.state === "FORTRESS_LOCKED" && state.lockedUntil && Date.now() > state.lockedUntil.getTime()) {
    state.state = "NORMAL";
    state.reason = null;
  }
  logger.info("Circuit breaker: day reset");
}

export function canTrade(): boolean {
  if (state.lockedUntil && Date.now() < state.lockedUntil.getTime()) return false;
  return state.state === "NORMAL" || state.state === "OBSERVATION_MODE";
}

export function isHibernating(): boolean {
  return (
    state.state === "FORTRESS_LOCKED" ||
    state.state === "GLOBAL_FLOOR_HIT" ||
    state.state === "PSYCHOLOGICAL_LOCKOUT"
  );
}

export function getMaxEntryPct(): number {
  if (!canTrade()) return 0;
  return state.conservativeMode ? CONSERVATIVE_MAX_PCT : NORMAL_MAX_PCT;
}

export function getCircuitState(): CircuitBreakerState {
  return { ...state };
}
