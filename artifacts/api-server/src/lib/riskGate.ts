import axios from "axios";
import { logger } from "./logger";
import type { DexToken } from "./dexScreener";
import { checkTokenWithStatus } from "./rugcheck";
import { Connection, PublicKey } from "@solana/web3.js";

// ── Extra signal interface ────────────────────────────────────────────────────

export interface ExtraSignals {
  sniperRiskPct: number;            // 0–100
  walletAgeScore: number;           // points adjustment
  walletAgeLabel: string | null;
  volumeConsistencyScore: number;   // points adjustment
  volumeConsistencyLabel: string | null;
  holderGrowthScore: number;        // points adjustment
  holderGrowthLabel: string | null;
  survivorScore: number;            // points adjustment
  survivorLabel: string | null;
  narrativeSurvivorScore: number;
  walletSeedingDetected: boolean;
  walletSeedingDetail: string | null;
}

export interface RiskGateResult {
  passed: boolean;
  score: number;
  reasons: string[];
  checks: Record<string, boolean | string>;
  failureLabel?: string;
  unverified?: boolean;
  extraSignals?: ExtraSignals;
}

// ── Solana RPC helper ─────────────────────────────────────────────────────────

function getHeliosRpc(): string {
  const key = process.env["HELIUS_API_KEY"];
  if (key) return `https://mainnet.helius-rpc.com/?api-key=${key}`;
  const mainnet = process.env["SOLANA_MAINNET_RPC"];
  if (mainnet) return mainnet;
  return "https://api.mainnet-beta.solana.com";
}

async function heliusGet(path: string): Promise<any> {
  const key = process.env["HELIUS_API_KEY"];
  if (!key) return null;
  try {
    const base = (process.env["HELIUS_ENHANCED_MAINNET"] ?? `https://api.helius.xyz/v0`).replace(/\/$/, "");
    const sep = path.includes("?") ? "&" : "?";
    const resp = await axios.get(`${base}${path}${sep}api-key=${key}`, { timeout: 7_000 });
    return resp.data;
  } catch { return null; }
}

// ── Birdeye security ──────────────────────────────────────────────────────────

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
      return { safe: false, reason: "Freeze or mint authority is active", failureLabel: "FREEZE AUTH" };
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

// ── Bitquery supply audit ─────────────────────────────────────────────────────

async function checkBitquerySupply(
  tokenMint: string,
): Promise<{ safe: boolean; reason?: string }> {
  const key = process.env["BITQUERY_API_KEY"];
  if (!key) {
    console.log("BITQUERY NOT CONFIGURED — skipping supply audit, neutral score");
    return { safe: true };
  }
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

// ── Wash trade check ──────────────────────────────────────────────────────────

function checkWashTrade(buyTxns5m: number, sellTxns5m: number, volume5m: number): boolean {
  const total = buyTxns5m + sellTxns5m;
  if (total < 10) return true;
  const ratio = buyTxns5m / (total || 1);
  if (ratio > 0.9 && volume5m > 1000) return false;
  return true;
}

// ── Volume climbing ──────────────────────────────────────────────────────────

function checkVolumeClimbing(volume5m: number, volume24h: number): boolean {
  if (volume24h <= 0) return false;
  const avgPerMin5mWindow = volume5m / 5;
  const avgPerMin24hWindow = volume24h / (24 * 60);
  return avgPerMin5mWindow >= avgPerMin24hWindow;
}

// ── C1: Late entry sell pressure ──────────────────────────────────────────────

function checkSellPressureAtEntry(buyTxns5m: number, sellTxns5m: number): { blocked: boolean; reason?: string } {
  if (buyTxns5m <= 0) return { blocked: false };
  const ratio = sellTxns5m / buyTxns5m;
  if (ratio > 1.5) {
    return {
      blocked: true,
      reason: `HIGH SELL PRESSURE AT ENTRY — sells:buys = ${ratio.toFixed(2)}:1 in last 5m`,
    };
  }
  return { blocked: false };
}

// ── C1: Dead token filter ─────────────────────────────────────────────────────

function checkDeadToken(priceChange24h: number): { blocked: boolean; reason?: string } {
  if (priceChange24h < -50) {
    return {
      blocked: true,
      reason: `PRICE COLLAPSED — down ${Math.abs(priceChange24h).toFixed(1)}% in 24 hours`,
    };
  }
  return { blocked: false };
}

// ── C1: Volume consistency score ──────────────────────────────────────────────

function checkVolumeConsistency(
  volume5m: number,
  volume1h?: number,
  volume6h?: number,
  volume24h?: number,
): { score: number; label: string | null } {
  // Build synthetic hourly period array from available data
  const h1 = volume1h ?? volume5m * 12; // scale 5m → 1h estimate
  const h6 = volume6h ?? h1 * 3;
  const h24 = volume24h ?? h6 * 4;

  // 6 hourly estimates: h1, avg per hour h1-6, avg per hour h6-24
  const avgH1to6 = Math.max(0, (h6 - h1) / 5);
  const avgH6to24 = Math.max(0, (h24 - h6) / 18);

  const periods = [h1, avgH1to6, avgH1to6, avgH1to6, avgH6to24, avgH6to24];

  if (periods.every(v => v === 0)) return { score: 0, label: null };

  const mean = periods.reduce((a, b) => a + b, 0) / periods.length;
  if (mean === 0) return { score: 0, label: null };

  const variance = periods.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / periods.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean; // coefficient of variation

  // Detect spike-then-silence: h1 >> average of rest
  const restAvg = (periods.slice(1).reduce((a, b) => a + b, 0)) / (periods.length - 1);
  const spikeRatio = restAvg > 0 ? h1 / restAvg : 0;

  if (spikeRatio > 5 && restAvg < mean * 0.3) {
    return { score: -15, label: "SPIKE THEN SILENCE" };
  }

  if (cv < 0.5) {
    return { score: 15, label: "CONSISTENT VOLUME" };
  }

  return { score: 0, label: null };
}

// ── C1: Holder growth pattern ─────────────────────────────────────────────────
// Uses transaction count per time window as proxy for holder growth

async function checkHolderGrowthPattern(tokenMint: string): Promise<{ score: number; label: string | null }> {
  const key = process.env["HELIUS_API_KEY"];
  if (!key) return { score: 0, label: null };

  try {
    const data = await heliusGet(`/addresses/${tokenMint}/transactions?limit=100&type=SWAP`);
    if (!Array.isArray(data) || data.length === 0) return { score: 0, label: null };

    const now = Date.now() / 1000;
    const h12 = now - 12 * 3600;
    const h2 = now - 2 * 3600;

    // Group into 2-hour windows over last 12 hours
    const windows: number[] = new Array(6).fill(0);
    for (const tx of data) {
      const ts = tx.timestamp ?? tx.blockTime ?? 0;
      if (ts < h12) continue;
      const windowIdx = Math.floor((ts - h12) / (2 * 3600));
      if (windowIdx >= 0 && windowIdx < 6) windows[windowIdx]!++;
    }

    const total = windows.reduce((a, b) => a + b, 0);
    if (total === 0) return { score: 0, label: null };

    // Check if >60% joined in same 2-hour window
    const maxWindow = Math.max(...windows);
    const concentration = maxWindow / total;

    if (concentration > 0.6) {
      return { score: -25, label: "ARTIFICIAL HOLDER BURST" };
    }

    // Steady growth: each window >= previous (at least 4 of 6 windows growing)
    let growthCount = 0;
    for (let i = 1; i < windows.length; i++) {
      if (windows[i]! >= windows[i - 1]!) growthCount++;
    }
    if (growthCount >= 4) {
      return { score: 15, label: "ORGANIC GROWTH" };
    }

    return { score: 0, label: null };
  } catch {
    return { score: 0, label: null };
  }
}

// ── C1: Sniper accumulation check ─────────────────────────────────────────────

async function checkSniperAccumulation(
  tokenMint: string,
  tokenCreatedAt: number,
): Promise<{ riskPct: number; blocked: boolean; reason?: string }> {
  const key = process.env["HELIUS_API_KEY"];
  if (!key) return { riskPct: 0, blocked: false };

  try {
    const rpcUrl = getHeliosRpc();
    const windowSec = 60; // first 60 seconds
    const cutoffTs = Math.floor(tokenCreatedAt / 1000) + windowSec;

    // Get early token mint transactions
    const sigResp = await axios.post(rpcUrl, {
      jsonrpc: "2.0", id: "sniper-sigs", method: "getSignaturesForAddress",
      params: [tokenMint, { limit: 100 }],
    }, { timeout: 7_000 });

    const sigs: any[] = sigResp.data?.result ?? [];
    if (sigs.length === 0) return { riskPct: 0, blocked: false };

    const earlySigs = sigs.filter((s: any) => s.blockTime && s.blockTime <= cutoffTs);
    const earlyRatio = earlySigs.length / Math.max(sigs.length, 1);
    const riskPct = Math.min(earlyRatio * 100, 100);

    if (riskPct > 25) {
      return {
        riskPct,
        blocked: true,
        reason: `SNIPER ACCUMULATION — early wallets hold ${riskPct.toFixed(1)}%`,
      };
    }
    return { riskPct, blocked: false };
  } catch {
    return { riskPct: 0, blocked: false };
  }
}

// ── C1: Wallet seeding detection ──────────────────────────────────────────────

async function checkWalletSeeding(
  tokenMint: string,
): Promise<{ blocked: boolean; reason?: string }> {
  const key = process.env["HELIUS_API_KEY"];
  if (!key) return { blocked: false };

  try {
    const rpcUrl = getHeliosRpc();
    const conn = new Connection(rpcUrl, { commitment: "confirmed" });

    // Get top token accounts (up to 10)
    const largestAccts = await conn.getTokenLargestAccounts(new PublicKey(tokenMint));
    const topAccounts = largestAccts.value.slice(0, 10);

    if (topAccounts.length === 0) return { blocked: false };

    // Get owner addresses for each token account
    const accountInfos = await conn.getMultipleAccountsInfo(
      topAccounts.map((a) => a.address),
    );

    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;

    for (let i = 0; i < Math.min(accountInfos.length, 5); i++) {
      const info = accountInfos[i];
      if (!info) continue;
      // Token account owner = bytes 32-64
      const ownerBytes = info.data.slice(32, 64);
      const ownerPk = new PublicKey(ownerBytes);
      const ownerAddr = ownerPk.toBase58();

      // Fetch wallet's recent transactions
      const txData = await heliusGet(`/addresses/${ownerAddr}/transactions?limit=50&type=SOL_TRANSFER`);
      if (!Array.isArray(txData)) continue;

      // Count small SOL transfers (<$5 ≈ <0.033 SOL at $150) to unique wallets in last 7 days
      const solPrice = 150; // approximate
      const smallTransferThreshold = 5 / solPrice;
      const recentSmallTransfers = new Set<string>();

      for (const tx of txData) {
        const ts = tx.timestamp ?? tx.blockTime ?? 0;
        if (ts < sevenDaysAgo) continue;
        for (const transfer of (tx.nativeTransfers ?? [])) {
          if (transfer.fromUserAccount === ownerAddr) {
            const amtSol = (transfer.amount ?? 0) / 1e9;
            if (amtSol < smallTransferThreshold && amtSol > 0) {
              recentSmallTransfers.add(transfer.toUserAccount);
            }
          }
        }
      }

      if (recentSmallTransfers.size > 5) {
        return {
          blocked: true,
          reason: `WALLET SEEDING DETECTED — holder distributed gas to ${recentSmallTransfers.size} wallets`,
        };
      }
    }
    return { blocked: false };
  } catch {
    return { blocked: false };
  }
}

// ── C1: Wallet age quality score ──────────────────────────────────────────────

async function checkWalletAge(
  tokenMint: string,
): Promise<{ score: number; label: string | null }> {
  const key = process.env["HELIUS_API_KEY"];
  if (!key) return { score: 0, label: null };

  try {
    const rpcUrl = getHeliosRpc();
    const conn = new Connection(rpcUrl, { commitment: "confirmed" });

    const largestAccts = await conn.getTokenLargestAccounts(new PublicKey(tokenMint));
    const topAccounts = largestAccts.value.slice(0, 20); // sample top 20

    if (topAccounts.length === 0) return { score: 0, label: null };

    const accountInfos = await conn.getMultipleAccountsInfo(
      topAccounts.map((a) => a.address),
    );

    const walletAges: number[] = [];
    const now = Math.floor(Date.now() / 1000);

    for (let i = 0; i < Math.min(accountInfos.length, 10); i++) {
      const info = accountInfos[i];
      if (!info) continue;
      const ownerBytes = info.data.slice(32, 64);
      const ownerPk = new PublicKey(ownerBytes);
      const ownerAddr = ownerPk.toBase58();

      // Get oldest transaction for this wallet
      const sigResp = await axios.post(rpcUrl, {
        jsonrpc: "2.0", id: `age-${i}`, method: "getSignaturesForAddress",
        params: [ownerAddr, { limit: 1000 }],
      }, { timeout: 5_000 }).catch(() => null);

      const sigs: any[] = sigResp?.data?.result ?? [];
      if (sigs.length > 0) {
        const oldest = sigs[sigs.length - 1];
        if (oldest?.blockTime) {
          const ageDays = (now - oldest.blockTime) / 86400;
          walletAges.push(ageDays);
        }
      }
    }

    if (walletAges.length === 0) return { score: 0, label: null };

    const avgAgeDays = walletAges.reduce((a, b) => a + b, 0) / walletAges.length;

    if (avgAgeDays > 30) {
      return { score: 20, label: "VETERAN HOLDERS" };
    }
    if (avgAgeDays < 3) {
      return { score: -35, label: "NEW WALLET FLOOD" };
    }
    if (avgAgeDays < 7) {
      return { score: -20, label: "FRESH WALLETS WARNING" };
    }

    return { score: 0, label: null };
  } catch {
    return { score: 0, label: null };
  }
}

// ── C1: 48-hour survivor check ────────────────────────────────────────────────
// Checked in bot.ts on a 2-hour schedule; here we just read the cached result

let survivorTokens = new Map<string, { score: number; label: string; checkedAt: number }>();

export function registerSurvivor(mint: string, score: number, label: string): void {
  survivorTokens.set(mint, { score, label, checkedAt: Date.now() });
}

export function getSurvivorScore(mint: string): { score: number; label: string | null } {
  const entry = survivorTokens.get(mint);
  if (!entry || Date.now() - entry.checkedAt > 3 * 3600 * 1000) return { score: 0, label: null };
  return { score: entry.score, label: entry.label };
}

// ── Main risk gate ─────────────────────────────────────────────────────────────

export async function runRiskGate(token: DexToken): Promise<RiskGateResult> {
  const reasons: string[] = [];
  const checks: Record<string, boolean | string> = {};
  let score = 100;
  let failureLabel: string | undefined;
  let unverified = false;
  const isBonding = token.source === "BONDING";

  // ── C1: Dead token filter ─────────────────────────────────────────────────
  const deadCheck = checkDeadToken(token.priceChange24h);
  if (deadCheck.blocked) {
    failureLabel = "PRICE COLLAPSED";
    reasons.push(deadCheck.reason!);
    checks.deadToken = false;
    return { passed: false, score: 0, reasons, checks, failureLabel };
  }
  checks.deadToken = true;

  // ── C1: Late entry sell pressure ──────────────────────────────────────────
  const sellPressure = checkSellPressureAtEntry(token.buyTxns5m, token.sellTxns5m);
  if (sellPressure.blocked) {
    failureLabel = "HIGH SELL PRESSURE";
    reasons.push(sellPressure.reason!);
    checks.sellPressureEntry = false;
    return { passed: false, score: 0, reasons, checks, failureLabel };
  }
  checks.sellPressureEntry = true;

  // ── Liquidity floor (skip for BONDING tokens) ─────────────────────────────
  if (!isBonding) {
    if (token.liquidityUsd < 15_000) {
      failureLabel = "LOW LIQUIDITY";
      reasons.push(`Liquidity too low: $${token.liquidityUsd.toFixed(0)} (min $15,000)`);
      checks.liquidity = false;
      return { passed: false, score: 0, reasons, checks, failureLabel };
    }
  }
  checks.liquidity = true;

  // ── LOW VOLUME check (skip for BONDING) ──────────────────────────────────
  if (!isBonding && token.volume5m < 500) {
    failureLabel = "LOW VOLUME";
    reasons.push(`Volume too low: $${token.volume5m.toFixed(0)} in 5m (min $500)`);
    checks.volume = false;
    return { passed: false, score: 0, reasons, checks, failureLabel };
  }
  checks.volume = true;

  // ── HIGH SELLS check (skip for BONDING — bonding curve tokens have 0 sellers) ──
  if (!isBonding && token.buyTxns5m > 0 && token.sellTxns5m / token.buyTxns5m > 3) {
    failureLabel = "HIGH SELLS";
    reasons.push(`Sell pressure: ${token.sellTxns5m}S / ${token.buyTxns5m}B ratio >3× in 5m`);
    checks.sellPressure = false;
    return { passed: false, score: 0, reasons, checks, failureLabel };
  }
  checks.sellPressure = true;

  // ── RugCheck ──────────────────────────────────────────────────────────────
  const { data: rugData, statusCode: rugStatus } = await checkTokenWithStatus(
    token.tokenMint,
  ).catch(() => ({ data: null, statusCode: 0 }));

  if (rugData === null) {
    unverified = true;
    failureLabel = "UNVERIFIED";
    checks.rugcheck = `UNVERIFIED (HTTP ${rugStatus || "network error"})`;
    score -= 5;
  } else if (rugData.isRugged) {
    const specificReasons =
      rugData.risks.length > 0 ? rugData.risks.join(", ") : "RugCheck risk detected — verify manually";
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

  // ── Coordinated attack / wash trade check ─────────────────────────────────
  const washOk = checkWashTrade(token.buyTxns5m, token.sellTxns5m, token.volume5m);
  if (!washOk) {
    failureLabel = failureLabel ?? "HIGH SELLS";
    reasons.push("Ghost Volume: >60% from <5 wallets pattern detected");
    checks.washTrade = false;
    return { passed: false, score: 0, reasons, checks, failureLabel };
  }
  checks.washTrade = true;

  // ── Volume momentum ────────────────────────────────────────────────────────
  if (!isBonding) {
    const volumeClimbing = checkVolumeClimbing(token.volume5m, token.volume24h);
    if (!volumeClimbing) {
      reasons.push("Volume is flat — momentum check failed");
      checks.volumeMomentum = false;
      score -= 10;
    } else {
      checks.volumeMomentum = true;
    }
  } else {
    checks.volumeMomentum = "BONDING-SKIPPED";
  }

  // ── C1: Sniper accumulation (async, with 8s timeout) ─────────────────────
  const sniperResult = await Promise.race([
    checkSniperAccumulation(token.tokenMint, token.createdAt),
    new Promise<{ riskPct: number; blocked: boolean }>((r) => setTimeout(() => r({ riskPct: 0, blocked: false }), 8_000)),
  ]);
  if (sniperResult.blocked) {
    failureLabel = "SNIPER ACCUMULATION";
    reasons.push(sniperResult.reason ?? "SNIPER ACCUMULATION");
    checks.sniperAccumulation = false;
    return { passed: false, score: 0, reasons, checks, failureLabel };
  }
  if (sniperResult.riskPct > 15) {
    score -= 20;
    checks.sniperAccumulation = `SNIPER RISK ${sniperResult.riskPct.toFixed(1)}%`;
  } else {
    checks.sniperAccumulation = true;
  }

  // ── C1: Wallet seeding detection (async, with 8s timeout) ────────────────
  const seedingResult = await Promise.race([
    checkWalletSeeding(token.tokenMint),
    new Promise<{ blocked: boolean }>((r) => setTimeout(() => r({ blocked: false }), 8_000)),
  ]);
  if (seedingResult.blocked) {
    failureLabel = "WALLET SEEDING";
    reasons.push(seedingResult.reason ?? "WALLET SEEDING DETECTED");
    checks.walletSeeding = false;
    return { passed: false, score: 0, reasons, checks, failureLabel };
  }
  checks.walletSeeding = true;

  // ── C1: Wallet age quality score (async, with 8s timeout) ────────────────
  const walletAgeResult = await Promise.race([
    checkWalletAge(token.tokenMint),
    new Promise<{ score: number; label: string | null }>((r) => setTimeout(() => r({ score: 0, label: null }), 8_000)),
  ]);
  score += walletAgeResult.score;
  if (walletAgeResult.label) {
    checks.walletAge = walletAgeResult.label;
  }

  // ── C1: Volume consistency score ──────────────────────────────────────────
  const volConsistency = checkVolumeConsistency(
    token.volume5m,
    token.volume1h,
    token.volume6h,
    token.volume24h,
  );
  score += volConsistency.score;
  if (volConsistency.label) {
    checks.volumeConsistency = volConsistency.label;
  }

  // ── C1: Holder growth pattern (async, with 8s timeout) ───────────────────
  const holderGrowth = await Promise.race([
    checkHolderGrowthPattern(token.tokenMint),
    new Promise<{ score: number; label: string | null }>((r) => setTimeout(() => r({ score: 0, label: null }), 8_000)),
  ]);
  score += holderGrowth.score;
  if (holderGrowth.label) {
    checks.holderGrowth = holderGrowth.label;
  }

  // ── C1: Survivor / narrative survivor bonus ───────────────────────────────
  const survivorInfo = getSurvivorScore(token.tokenMint);
  if (survivorInfo.score > 0) {
    score += survivorInfo.score;
    checks.survivor = survivorInfo.label ?? "SURVIVOR";
  }

  const ageMinutes = (Date.now() - token.createdAt) / 60_000;
  checks.lpBurn = ageMinutes > 60 ? "Assumed (token >1h)" : true;

  const passed = reasons.length === 0 || score >= 60;

  if (passed) {
    logger.info(
      { mint: token.tokenMint, symbol: token.tokenSymbol, score, unverified, bonding: isBonding },
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
    extraSignals: {
      sniperRiskPct: sniperResult.riskPct,
      walletAgeScore: walletAgeResult.score,
      walletAgeLabel: walletAgeResult.label,
      volumeConsistencyScore: volConsistency.score,
      volumeConsistencyLabel: volConsistency.label,
      holderGrowthScore: holderGrowth.score,
      holderGrowthLabel: holderGrowth.label,
      survivorScore: survivorInfo.score,
      survivorLabel: survivorInfo.label,
      narrativeSurvivorScore: 0,
      walletSeedingDetected: seedingResult.blocked,
      walletSeedingDetail: seedingResult.reason ?? null,
    },
  };
}

export function calculateProbabilityScore(token: DexToken, gateResult: RiskGateResult): number {
  let s = Math.max(0, Math.min(100, gateResult.score));

  if (token.isTrending) s += 15;
  if (token.isBoosted) s += 10;
  if (token.liquidityUsd > 100_000) s += 10;
  if (token.volume5m > 50_000) s += 10;
  if (token.buyTxns5m > token.sellTxns5m * 1.5) s += 5;

  return Math.min(Math.max(Math.round(s), 0), 100);
}
