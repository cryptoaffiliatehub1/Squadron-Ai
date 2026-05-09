import axios from "axios";
import { logger } from "./logger";

const RUGCHECK_BASE = "https://api.rugcheck.xyz/v1";

export interface RugCheckResult {
  score: number;
  rating: string;
  risks: string[];
  isRugged: boolean;
  topHolderPct: number;
  holderCount: number;
}

export interface TokenSafetyResult {
  score: number;
  isGood: boolean;
  risks: string[];
  rawScore: number;
}

export async function checkToken(tokenMint: string): Promise<RugCheckResult | null> {
  try {
    const resp = await axios.get(`${RUGCHECK_BASE}/tokens/${tokenMint}/report/summary`, {
      timeout: 10_000,
    });

    const data = resp.data;
    const score = data?.score ?? 0;
    const risks: string[] = (data?.risks ?? []).map((r: { name: string }) => r.name);
    const topHolderPct =
      (data?.topHolders ?? [])
        .slice(0, 10)
        .reduce((sum: number, h: { pct: number }) => sum + (h.pct ?? 0), 0) * 100;

    return {
      score,
      rating: data?.score_normalised ?? "unknown",
      risks,
      isRugged: score < 300 || risks.some((r) => r.toLowerCase().includes("rug")),
      topHolderPct,
      holderCount: data?.totalHolders ?? 0,
    };
  } catch (err) {
    logger.warn({ err, tokenMint }, "RugCheck API call failed");
    return null;
  }
}

export async function checkTokenSafety(tokenMint: string): Promise<TokenSafetyResult> {
  const result = await checkToken(tokenMint);
  if (!result) {
    return { score: 0, isGood: false, risks: ["Unable to fetch safety data"], rawScore: 0 };
  }
  return {
    score: result.score,
    isGood: !result.isRugged && result.score >= 400,
    risks: result.risks,
    rawScore: result.score,
  };
}
