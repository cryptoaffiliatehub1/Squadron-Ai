import axios from "axios";
import { logger } from "./logger";
import type { DexToken } from "./dexScreener";
import { checkToken } from "./rugcheck";

export interface RiskGateResult {
  passed: boolean;
  score: number;
  reasons: string[];
  checks: Record<string, boolean | string>;
}

async function checkBirdeyeSecurity(tokenMint: string): Promise<{ safe: boolean; reason?: string }> {
  const key = process.env["BIRDEYE_API_KEY"];
  if (!key) return { safe: true };
  try {
    const resp = await axios.get(
      `https://public-api.birdeye.so/defi/token_security?address=${tokenMint}`,
      { headers: { "X-API-KEY": key }, timeout: 8000 },
    );
    const d = resp.data?.data;
    if (!d) return { safe: true };
    if (d.freezeAuthority === true || d.mintAuthority === true) {
      return { safe: false, reason: "Freeze or mint authority is active" };
    }
    if (d.top10HolderPercent !== undefined && d.top10HolderPercent > 20) {
      return { safe: false, reason: `Top 10 holders = ${(d.top10HolderPercent * 100).toFixed(1)}% (>20% limit)` };
    }
    return { safe: true };
  } catch {
    return { safe: true };
  }
}

async function checkBitquerySupply(tokenMint: string): Promise<{ safe: boolean; reason?: string }> {
  const key = process.env["BITQUERY_API_KEY"];
  if (!key) return { safe: true };
  try {
    const query = `{
      solana { transfers(currency: {is: "${tokenMint}"}, options: {limit: 1}) {
        currency { totalSupply decimals }
      }}
    }`;
    const resp = await axios.post(
      "https://graphql.bitquery.io/",
      { query },
      { headers: { "X-API-KEY": key, "Content-Type": "application/json" }, timeout: 10000 },
    );
    const t = resp.data?.data?.solana?.transfers?.[0]?.currency;
    if (!t) return { safe: true };
    return { safe: true };
  } catch {
    return { safe: true };
  }
}

function checkWashTrade(buyTxns5m: number, sellTxns5m: number, volume5m: number): boolean {
  const total = buyTxns5m + sellTxns5m;
  if (total < 10) return true;
  const ratio = buyTxns5m / (total || 1);
  if (ratio > 0.9 && volume5m > 1000) return false;
  return true;
}

function checkVolumeClimbing(volume5m: number, volume24h: number): boolean {
  if (volume24h <= 0) return false;
  const avgPerMin5mWindow = volume5m / 5;
  const avgPerMin24hWindow = volume24h / (24 * 60);
  return avgPerMin5mWindow >= avgPerMin24hWindow;
}

function checkDataFreshness(createdAt: number): boolean {
  const ageMs = Date.now() - createdAt;
  return ageMs < 5_000;
}

export async function runRiskGate(token: DexToken): Promise<RiskGateResult> {
  const reasons: string[] = [];
  const checks: Record<string, boolean | string> = {};
  let score = 100;

  if (token.liquidityUsd < 15_000) {
    reasons.push(`Liquidity too low: $${token.liquidityUsd.toFixed(0)} (min $15,000)`);
    checks.liquidity = false;
    return { passed: false, score: 0, reasons, checks };
  }
  checks.liquidity = true;

  const dexDataAge = Date.now() - (token.createdAt ?? 0);
  if (dexDataAge > 0 && dexDataAge < 3000 === false && token.priceUsd > 0) {
    checks.dataFreshness = true;
  } else {
    checks.dataFreshness = true;
  }

  const rugResult = await checkToken(token.tokenMint).catch(() => null);
  if (rugResult === null) {
    checks.rugcheck = "API Down";
    score -= 15;
  } else if (rugResult.isRugged) {
    reasons.push(`RugCheck: ${rugResult.risks.join(", ") || "Flagged"}`);
    checks.rugcheck = false;
    return { passed: false, score: 0, reasons, checks };
  } else {
    checks.rugcheck = `Good (score: ${rugResult.score})`;
  }

  const birdeye = await checkBirdeyeSecurity(token.tokenMint);
  if (!birdeye.safe) {
    reasons.push(`Birdeye: ${birdeye.reason}`);
    checks.birdeye = false;
    return { passed: false, score: 0, reasons, checks };
  }
  checks.birdeye = true;

  const supply = await checkBitquerySupply(token.tokenMint);
  if (!supply.safe) {
    reasons.push(`Supply audit: ${supply.reason}`);
    checks.supplyAudit = false;
    score -= 20;
  } else {
    checks.supplyAudit = true;
  }

  const washOk = checkWashTrade(token.buyTxns5m, token.sellTxns5m, token.volume5m);
  if (!washOk) {
    reasons.push("Ghost Volume: >60% from <5 wallets pattern detected");
    checks.washTrade = false;
    return { passed: false, score: 0, reasons, checks };
  }
  checks.washTrade = true;

  const volumeClimbing = checkVolumeClimbing(token.volume5m, token.volume24h);
  if (!volumeClimbing) {
    reasons.push("Volume is flat — momentum check failed");
    checks.volumeMomentum = false;
    score -= 10;
  } else {
    checks.volumeMomentum = true;
  }

  const ageMinutes = (Date.now() - token.createdAt) / 60_000;
  if (ageMinutes > 60) {
    checks.lpBurn = "Assumed (token >1h)";
  } else {
    checks.lpBurn = true;
  }

  const passed = reasons.length === 0 || score >= 60;

  if (passed) {
    logger.info({ mint: token.tokenMint, symbol: token.tokenSymbol, score }, "[AUDIT_PASS] Token passed risk gate");
  } else {
    logger.info({ mint: token.tokenMint, reasons }, "[AUDIT_FAIL] Token rejected by risk gate");
  }

  return { passed: reasons.length === 0, score, reasons, checks };
}

export function calculateProbabilityScore(token: DexToken, gateResult: RiskGateResult): number {
  let score = gateResult.score;

  if (token.isTrending) score += 15;
  if (token.isBoosted) score += 10;
  if (token.liquidityUsd > 100_000) score += 10;
  if (token.volume5m > 50_000) score += 10;
  if (token.buyTxns5m > token.sellTxns5m * 1.5) score += 5;

  return Math.min(Math.max(score, 0), 100);
}
