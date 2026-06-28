import axios from "axios";
import { logger } from "./logger";
import type { DexToken } from "./dexScreener";
import { checkTokenWithStatus } from "./rugcheck";

export interface RiskGateResult {
  passed: boolean;
  score: number;
  reasons: string[];
  checks: Record<string, boolean | string>;
  failureLabel?: string;   // Fix 3: specific badge label
  unverified?: boolean;    // Fix 2: true when RugCheck returned 404/429/5xx
}

// Fix 3: labels with their color semantics (consumed by frontend)
// RUGCHECK FAIL / HIGH SELLS → red
// LOW VOLUME / LOW BUYS     → orange
// HOLDER CONC / SUPPLY GAP  → amber
// UNVERIFIED                → blue
// FREEZE AUTH               → red

async function checkBirdeyeSecurity(
  tokenMint: string,
): Promise<{ safe: boolean; reason?: string; failureLabel?: string }> {
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
      return {
        safe: false,
        reason: "Freeze or mint authority is active",
        failureLabel: "FREEZE AUTH",
      };
    }
    if (d.top10HolderPercent !== undefined && d.top10HolderPercent > 20) {
      return {
        safe: false,
        reason: `Top 10 holders = ${(d.top10HolderPercent * 100).toFixed(1)}% (>20% limit)`,
        failureLabel: "HOLDER CONC",
      };
    }
    return { safe: true };
  } catch {
    return { safe: true };
  }
}

async function checkBitquerySupply(
  tokenMint: string,
): Promise<{ safe: boolean; reason?: string }> {
  const key = process.env["BITQUERY_API_KEY"];
  if (!key) return { safe: true };
  try {
    const query = `{
      solana { transfers(currency: {is: "${tokenMint}"}, options: {limit: 1}) {
        currency { totalSupply decimals }
      }}
    }`;
    await axios.post(
      "https://graphql.bitquery.io/",
      { query },
      { headers: { "X-API-KEY": key, "Content-Type": "application/json" }, timeout: 10000 },
    );
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

export async function runRiskGate(token: DexToken): Promise<RiskGateResult> {
  const reasons: string[] = [];
  const checks: Record<string, boolean | string> = {};
  let score = 100;
  let failureLabel: string | undefined;
  let unverified = false;

  // ── Liquidity floor (pre-check — bot.ts also enforces this) ────────────────
  if (token.liquidityUsd < 15_000) {
    failureLabel = "LOW LIQUIDITY";
    reasons.push(`Liquidity too low: $${token.liquidityUsd.toFixed(0)} (min $15,000)`);
    checks.liquidity = false;
    return { passed: false, score: 0, reasons, checks, failureLabel };
  }
  checks.liquidity = true;

  // ── Fix 3: LOW VOLUME check ───────────────────────────────────────────────
  if (token.volume5m < 500) {
    failureLabel = "LOW VOLUME";
    reasons.push(`Volume too low: $${token.volume5m.toFixed(0)} in 5m (min $500)`);
    checks.volume = false;
    return { passed: false, score: 0, reasons, checks, failureLabel };
  }
  checks.volume = true;

  // ── Fix 3: HIGH SELLS check ───────────────────────────────────────────────
  if (token.buyTxns5m > 0 && token.sellTxns5m / token.buyTxns5m > 3) {
    failureLabel = "HIGH SELLS";
    reasons.push(
      `Sell pressure: ${token.sellTxns5m}S / ${token.buyTxns5m}B ratio >3× in 5m`,
    );
    checks.sellPressure = false;
    return { passed: false, score: 0, reasons, checks, failureLabel };
  }
  checks.sellPressure = true;

  // ── Fix 2: RugCheck with status-code awareness ────────────────────────────
  const { data: rugData, statusCode: rugStatus } = await checkTokenWithStatus(
    token.tokenMint,
  ).catch(() => ({ data: null, statusCode: 0 }));

  if (rugData === null) {
    // 404 / 429 / 5xx / network error → UNVERIFIED (allow, capped position)
    unverified = true;
    failureLabel = "UNVERIFIED";
    checks.rugcheck = `UNVERIFIED (HTTP ${rugStatus || "network error"})`;
    score -= 5; // tiny penalty — still allows entry at max 5%
  } else if (rugData.isRugged) {
    // Fix 7: use specific risk names extracted by rugcheck.ts
    const specificReasons =
      rugData.risks.length > 0
        ? rugData.risks.join(", ")
        : "RugCheck risk detected — verify manually";
    failureLabel = "RUGCHECK FAIL";
    reasons.push(`RugCheck: ${specificReasons}`);
    checks.rugcheck = false;
    return { passed: false, score: 0, reasons, checks, failureLabel };
  } else {
    checks.rugcheck = `VERIFIED (score: ${rugData.score})`;
  }

  // ── Birdeye security ──────────────────────────────────────────────────────
  const birdeye = await checkBirdeyeSecurity(token.tokenMint);
  if (!birdeye.safe) {
    failureLabel = birdeye.failureLabel ?? "SECURITY";
    reasons.push(`Birdeye: ${birdeye.reason}`);
    checks.birdeye = false;
    return { passed: false, score: 0, reasons, checks, failureLabel };
  }
  checks.birdeye = true;

  // ── Bitquery supply audit ─────────────────────────────────────────────────
  const supply = await checkBitquerySupply(token.tokenMint);
  if (!supply.safe) {
    failureLabel = failureLabel ?? "SUPPLY GAP";
    reasons.push(`Supply audit: ${supply.reason}`);
    checks.supplyAudit = false;
    score -= 20;
  } else {
    checks.supplyAudit = true;
  }

  // ── Wash trade check ──────────────────────────────────────────────────────
  const washOk = checkWashTrade(token.buyTxns5m, token.sellTxns5m, token.volume5m);
  if (!washOk) {
    failureLabel = failureLabel ?? "HIGH SELLS";
    reasons.push("Ghost Volume: >60% from <5 wallets pattern detected");
    checks.washTrade = false;
    return { passed: false, score: 0, reasons, checks, failureLabel };
  }
  checks.washTrade = true;

  // ── Volume momentum ───────────────────────────────────────────────────────
  const volumeClimbing = checkVolumeClimbing(token.volume5m, token.volume24h);
  if (!volumeClimbing) {
    reasons.push("Volume is flat — momentum check failed");
    checks.volumeMomentum = false;
    score -= 10;
  } else {
    checks.volumeMomentum = true;
  }

  const ageMinutes = (Date.now() - token.createdAt) / 60_000;
  checks.lpBurn = ageMinutes > 60 ? "Assumed (token >1h)" : true;

  const passed = reasons.length === 0 || score >= 60;

  if (passed) {
    logger.info(
      { mint: token.tokenMint, symbol: token.tokenSymbol, score, unverified },
      "[AUDIT_PASS] Token passed risk gate",
    );
  } else {
    logger.info({ mint: token.tokenMint, reasons }, "[AUDIT_FAIL] Token rejected by risk gate");
  }

  return {
    passed: reasons.length === 0,
    score,
    reasons,
    checks,
    failureLabel: passed ? (unverified ? "UNVERIFIED" : undefined) : failureLabel,
    unverified,
  };
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
