
import { checkToken } from "./rugcheck";
import { logger } from "./logger";

export interface RiskFilterResult {
  passed: boolean;
  reason?: string;
  rugScore?: number;
  topHolderPct?: number;
  holderCount?: number;
  risks?: string[];
}

export interface RiskFilterConfig {
  minHolders?: number;
  maxTopHolderPct?: number;
  minRugScore?: number;
  skipRisks?: string[];
}

const DEFAULT_CONFIG: Required<RiskFilterConfig> = {
  minHolders: 100,
  maxTopHolderPct: 50,
  minRugScore: 400,
  skipRisks: ["rug pull", "honeypot", "freeze authority"],
};

export async function filterTokenByRisk(
  tokenMint: string,
  config: RiskFilterConfig = {},
): Promise<RiskFilterResult> {
  const opts = { ...DEFAULT_CONFIG, ...config };

  const result = await checkToken(tokenMint);
  if (!result) {
    logger.warn({ tokenMint }, "Risk filter: RugCheck returned null, passing by default");
    return { passed: true };
  }

  if (result.score < opts.minRugScore) {
    return {
      passed: false,
      reason: `Rug score too low: ${result.score} < ${opts.minRugScore}`,
      rugScore: result.score,
      topHolderPct: result.topHolderPct,
      holderCount: result.holderCount,
      risks: result.risks,
    };
  }

  if (result.holderCount < opts.minHolders) {
    return {
      passed: false,
      reason: `Holder count too low: ${result.holderCount} < ${opts.minHolders}`,
      rugScore: result.score,
      topHolderPct: result.topHolderPct,
      holderCount: result.holderCount,
      risks: result.risks,
    };
  }

  if (result.topHolderPct > opts.maxTopHolderPct) {
    return {
      passed: false,
      reason: `Top holder concentration too high: ${result.topHolderPct.toFixed(1)}% > ${opts.maxTopHolderPct}%`,
      rugScore: result.score,
      topHolderPct: result.topHolderPct,
      holderCount: result.holderCount,
      risks: result.risks,
    };
  }

  const dangerousRisk = result.risks.find((r) =>
    opts.skipRisks.some((s) => r.toLowerCase().includes(s.toLowerCase())),
  );
  if (dangerousRisk) {
    return {
      passed: false,
      reason: `Dangerous risk flag: ${dangerousRisk}`,
      rugScore: result.score,
      topHolderPct: result.topHolderPct,
      holderCount: result.holderCount,
      risks: result.risks,
    };
  }

  return {
    passed: true,
    rugScore: result.score,
    topHolderPct: result.topHolderPct,
    holderCount: result.holderCount,
    risks: result.risks,
  };
}
