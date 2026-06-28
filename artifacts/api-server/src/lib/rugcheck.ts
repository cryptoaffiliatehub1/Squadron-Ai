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

// Fix 2: response envelope that exposes HTTP status code
export interface RugCheckResponse {
  data: RugCheckResult | null;
  statusCode: number;
}

export interface TokenSafetyResult {
  score: number;
  isGood: boolean;
  risks: string[];
  rawScore: number;
}

// Fix 2 + Fix 7: never throws — returns statusCode so caller distinguishes
// 404 (not indexed) / 429 (rate limit) / 5xx (server error) from real rug flags
export async function checkTokenWithStatus(tokenMint: string): Promise<RugCheckResponse> {
  try {
    const resp = await axios.get(`${RUGCHECK_BASE}/tokens/${tokenMint}/report/summary`, {
      timeout: 10_000,
      validateStatus: () => true, // intercept all HTTP codes without throwing
    });

    // 404 = not yet indexed, 429 = rate limited, 5xx = backend down → UNVERIFIED
    if (resp.status === 404 || resp.status === 429 || resp.status >= 500) {
      if (resp.status === 404) {
        console.log(`RUGCHECK 404 — UNVERIFIED not RISKY (${tokenMint.slice(0, 8)})`);
      }
      return { data: null, statusCode: resp.status };
    }

    const data = resp.data;
    const score = data?.score ?? 0;

    // Fix 7: extract specific risk names — try name → description → skip empty
    const risks: string[] = (data?.risks ?? [])
      .map((r: { name?: string; description?: string }) =>
        (r.name?.trim() || r.description?.trim() || "").replace(/\.$/, ""),
      )
      .filter((r: string) => r.length > 0);

    // If score is dangerously low but no named risks, use a generic specific reason
    if (risks.length === 0 && score < 300) {
      risks.push("RugCheck risk detected — verify manually");
    }

    const topHolderPct =
      (data?.topHolders ?? [])
        .slice(0, 10)
        .reduce((sum: number, h: { pct?: number }) => sum + (h.pct ?? 0), 0) * 100;

    return {
      statusCode: resp.status,
      data: {
        score,
        rating: data?.score_normalised ?? "unknown",
        risks,
        isRugged: score < 300 || risks.some((r: string) => /rug|honeypot|scam/i.test(r)),
        topHolderPct,
        holderCount: data?.totalHolders ?? 0,
      },
    };
  } catch (err) {
    logger.warn({ err, tokenMint }, "RugCheck API call failed (network error)");
    return { data: null, statusCode: 0 };
  }
}

// Backward-compat: used by checkTokenSafety and legacy callers
export async function checkToken(tokenMint: string): Promise<RugCheckResult | null> {
  const { data } = await checkTokenWithStatus(tokenMint);
  return data;
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
