import { logger } from "./logger";

export type MarketRegime = "MANIA" | "CHOP" | "RUG_CYCLE" | "DEATH_ZONE";

export interface RegimeState {
  regime: MarketRegime;
  multiplier: number;
  description: string;
  detectedAt: Date;
  consecutiveRugs: number;
  recentWinRate: number;
}

const state: RegimeState = {
  regime: "CHOP",
  multiplier: 0.5,
  description: "Default startup state",
  detectedAt: new Date(),
  consecutiveRugs: 0,
  recentWinRate: 0.5,
};

const recentOutcomes: ("win" | "loss" | "rug")[] = [];

export function recordOutcome(outcome: "win" | "loss" | "rug"): void {
  recentOutcomes.push(outcome);
  if (recentOutcomes.length > 20) recentOutcomes.shift();

  if (outcome === "rug") {
    state.consecutiveRugs++;
  } else {
    state.consecutiveRugs = 0;
  }

  classifyRegime();
}

export function classifyRegime(): RegimeState {
  const wins = recentOutcomes.filter((o) => o === "win").length;
  const total = recentOutcomes.length;
  const rugs = recentOutcomes.filter((o) => o === "rug").length;
  const winRate = total > 0 ? wins / total : 0.5;
  const rugRate = total > 0 ? rugs / total : 0;

  state.recentWinRate = winRate;

  if (state.consecutiveRugs >= 3 || rugRate > 0.4) {
    state.regime = "RUG_CYCLE";
    state.multiplier = 0.1;
    state.description = `High rug frequency (${(rugRate * 100).toFixed(0)}% of recent trades)`;
  } else if (winRate > 0.65 && total >= 5) {
    state.regime = "MANIA";
    state.multiplier = 1.0;
    state.description = `High win rate (${(winRate * 100).toFixed(0)}%) — full throttle`;
  } else if (winRate < 0.25 && total >= 5) {
    state.regime = "DEATH_ZONE";
    state.multiplier = 0;
    state.description = "Extreme adverse conditions — bot hibernating";
  } else {
    state.regime = "CHOP";
    state.multiplier = 0.5;
    state.description = "Sideways market — reduced size";
  }

  state.detectedAt = new Date();
  logger.info(
    { regime: state.regime, multiplier: state.multiplier, winRate, consecutiveRugs: state.consecutiveRugs },
    `[MARKET_REGIME] ${state.regime} — ${state.description}`,
  );

  return { ...state };
}

export function getRegime(): RegimeState {
  return { ...state };
}

export function isHibernating(): boolean {
  return state.regime === "DEATH_ZONE";
}

export function getMultiplier(): number {
  return state.multiplier;
}
