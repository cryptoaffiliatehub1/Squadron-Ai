import { logger } from "./logger";
import { logWeightChange, generateDailyReport, isPaperMode } from "./paperTrading";
import { recordOutcome } from "./marketRegime";
import { recordRugMissed } from "./sessionStats";

export interface ScoringWeights {
  rugcheck: number;
  liquidity: number;
  volume: number;
  holderConcentration: number;
  momentum: number;
  aiScore: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  rugcheck: 30,
  liquidity: 25,
  volume: 20,
  holderConcentration: 15,
  momentum: 5,
  aiScore: 5,
};

let currentWeights: ScoringWeights = { ...DEFAULT_WEIGHTS };
const lossCategories: ("rug" | "exit_lag" | "volume_trap" | "regime_mismatch")[] = [];
let systemAtRisk = false;

export function getWeights(): ScoringWeights {
  return { ...currentWeights };
}

export function classifyLoss(category: "rug" | "exit_lag" | "volume_trap" | "regime_mismatch"): void {
  lossCategories.push(category);
  if (lossCategories.length > 50) lossCategories.shift();
  recordOutcome("loss");

  if (category === "rug") {
    recordOutcome("rug");
    recordRugMissed(); // Track rug that slipped through risk gate
  }
}

export function classifyWin(): void {
  lossCategories.push(undefined as unknown as "rug");
  recordOutcome("win");
}

export function getSessionRugMissedCount(): number {
  return lossCategories.filter((c) => c === "rug").length;
}

export async function runPostMortem(): Promise<void> {
  const total = lossCategories.length;
  if (total === 0) return;

  const rugs = lossCategories.filter((c) => c === "rug").length;
  const rugRate = rugs / total;

  if (rugRate > 0.3) {
    currentWeights.rugcheck = Math.min(currentWeights.rugcheck + 10, 60);
    logger.warn(
      { rugRate, newRugcheckWeight: currentWeights.rugcheck },
      "Post-mortem: Rug rate >30% — increasing RugCheck weight by 10%",
    );
    logWeightChange({
      timestamp: new Date().toISOString(),
      reason: `Rug rate ${(rugRate * 100).toFixed(0)}% exceeded 30% threshold`,
      weights: { ...currentWeights },
    });
  }

  const report = generateDailyReport();
  const expectancy = report.expectancy;

  if (expectancy < 0) {
    systemAtRisk = true;
    logger.error(
      { expectancy },
      "SYSTEM AT RISK: Negative expectancy detected. Review strategy immediately.",
    );
  } else {
    systemAtRisk = false;
  }

  logger.info(
    {
      rugRate: (rugRate * 100).toFixed(1) + "%",
      expectancy: expectancy.toFixed(4),
      weights: currentWeights,
      systemAtRisk,
    },
    "Post-mortem analysis complete",
  );
}

export function isSystemAtRisk(): boolean {
  return systemAtRisk;
}

let feedbackInterval: ReturnType<typeof setInterval> | null = null;

export function startFeedbackLoop(): void {
  if (feedbackInterval) return;
  feedbackInterval = setInterval(() => {
    runPostMortem().catch((err) => logger.error({ err }, "Feedback loop error"));
  }, 12 * 60 * 60 * 1000);
  logger.info("Self-improving feedback loop started (12h interval)");
}

export function stopFeedbackLoop(): void {
  if (feedbackInterval) {
    clearInterval(feedbackInterval);
    feedbackInterval = null;
  }
}
