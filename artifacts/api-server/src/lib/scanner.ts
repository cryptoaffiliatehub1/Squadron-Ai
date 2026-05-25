import axios from "axios";
import { logger } from "./logger";
import { getRotatedHeaders } from "./headerFactory";
import type { DexToken } from "./dexScreener";
import { setScannerOnline } from "./systemReadiness";

export type ScannerSource = "dexscreener" | "pumpfun" | "birdeye";

interface ScannerState {
  activeSource: ScannerSource;
  dexScreenerRateLimited: boolean;
  dexScreenerRateLimitedUntil: Date | null;
  pumpFunConnected: boolean;
  lastDexProbe: Date | null;
  lastSuccessfulScan: Date | null;
  rateLimitResetAt: Date | null;
  wsReconnectAttempts: number;
  failoverLog: Array<{ from: ScannerSource; to: ScannerSource; at: string; reason: string }>;
}

const state: ScannerState = {
  activeSource: "dexscreener",
  dexScreenerRateLimited: false,
  dexScreenerRateLimitedUntil: null,
  pumpFunConnected: false,
  lastDexProbe: null,
  lastSuccessfulScan: null,
  rateLimitResetAt: null,
  wsReconnectAttempts: 0,
  failoverLog: [],
};

export type TokenCallback = (token: Partial<DexToken>) => Promise<void>;

let onToken: TokenCallback | null = null;
let scanInterval: ReturnType<typeof setInterval> | null = null;
let probeInterval: ReturnType<typeof setInterval> | null = null;
let dailyResetTimeout: ReturnType<typeof setTimeout> | null = null;
let pumpFunWs: unknown = null;

function failover(to: ScannerSource, reason: string): void {
  const from = state.activeSource;
  state.activeSource = to;
  state.failoverLog.push({ from, to, at: new Date().toISOString(), reason });
  logger.warn({ from, to, reason }, `[SCANNER_FAILOVER] ${from} → ${to}: ${reason}`);
}

// ── FIX 1: Rebuild DEX Screener parser ──────────────────────────────────────
// Step 1: fetch token-profiles to get boosted/trending token addresses + icons
// Step 2: batch-fetch /latest/dex/tokens/{addresses} for full pair data
// Step 3: merge and parse — never discard a token, use safe defaults for nulls
// Secondary fallback: search endpoint where pairs come at top level

interface ProfileRaw {
  chainId: string;
  tokenAddress: string;
  icon?: string;
  symbol?: string;
  name?: string;
}

interface PairDataRaw {
  chainId: string;
  dexId?: string;
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number; m5?: number };
  priceChange?: { h24?: number };
  txns?: { m5?: { buys?: number; sells?: number } };
  pairCreatedAt?: number;
  info?: { imageUrl?: string };
  boosts?: { active?: number };
}

function parsePairToToken(
  tokenAddress: string,
  pair: PairDataRaw | undefined,
  profile: ProfileRaw,
): Partial<DexToken> {
  const logoUrl = pair?.info?.imageUrl ?? profile?.icon ?? "";
  return {
    tokenMint: tokenAddress,
    tokenSymbol: pair?.baseToken?.symbol ?? profile?.symbol ?? "?",
    tokenName: pair?.baseToken?.name ?? profile?.name ?? "Unknown",
    logoUrl: logoUrl || undefined,
    liquidityUsd: parseFloat(String(pair?.liquidity?.usd ?? 0)) || 0,
    priceUsd: parseFloat(pair?.priceUsd ?? "0") || 0,
    volume24h: Number(pair?.volume?.h24 ?? 0),
    volume5m: parseFloat(String(pair?.volume?.m5 ?? 0)) || 0,
    priceChange24h: Number(pair?.priceChange?.h24 ?? 0),
    pairAddress: pair?.pairAddress ?? "",
    dexId: pair?.dexId ?? "dexscreener",
    chainId: "solana",
    createdAt: pair?.pairCreatedAt ?? Date.now(),
    isBoosted: (pair?.boosts?.active ?? 0) > 0,
    isTrending: true,
    buyTxns5m: pair?.txns?.m5?.buys ?? 0,
    sellTxns5m: pair?.txns?.m5?.sells ?? 0,
  };
}

async function fetchPairsForAddresses(addresses: string[]): Promise<Map<string, PairDataRaw>> {
  const pairsMap = new Map<string, PairDataRaw>();
  if (addresses.length === 0) return pairsMap;

  // Batch in groups of 30 (DEX Screener limit)
  const chunks: string[][] = [];
  for (let i = 0; i < addresses.length; i += 30) {
    chunks.push(addresses.slice(i, i + 30));
  }

  await Promise.allSettled(
    chunks.map(async (chunk) => {
      const resp = await axios.get<{ pairs?: PairDataRaw[] }>(
        `https://api.dexscreener.com/latest/dex/tokens/${chunk.join(",")}`,
        { headers: getRotatedHeaders(), timeout: 12_000 },
      );
      for (const pair of resp.data?.pairs ?? []) {
        if (pair?.chainId !== "solana") continue;
        const addr = pair?.baseToken?.address;
        if (!addr) continue;
        // Keep the highest-liquidity pair for each token
        const existing = pairsMap.get(addr);
        if (!existing || (pair.liquidity?.usd ?? 0) > (existing.liquidity?.usd ?? 0)) {
          pairsMap.set(addr, pair);
        }
      }
    }),
  );

  return pairsMap;
}

async function searchFallbackParser(): Promise<Partial<DexToken>[]> {
  // Secondary fallback: search endpoint where pairs array comes at the top level
  try {
    const resp = await axios.get<{ pairs?: PairDataRaw[] }>(
      "https://api.dexscreener.com/latest/dex/search?q=solana&order=h6_volume",
      { headers: getRotatedHeaders(), timeout: 10_000 },
    );
    const pairs = resp.data?.pairs ?? [];
    return pairs
      .filter((p) => p?.chainId === "solana")
      .slice(0, 30)
      .map((p) => parsePairToToken(p?.baseToken?.address ?? "", p, {} as ProfileRaw));
  } catch {
    return [];
  }
}

async function scanDexScreener(): Promise<Partial<DexToken>[]> {
  try {
    const profileResp = await axios.get<ProfileRaw[] | unknown>(
      "https://api.dexscreener.com/token-profiles/latest/v1",
      { headers: getRotatedHeaders(), timeout: 10_000 },
    );

    if (profileResp.status === 429 || profileResp.status === 403 || profileResp.status === 500) {
      state.dexScreenerRateLimited = true;
      state.dexScreenerRateLimitedUntil = new Date(Date.now() + 10 * 60 * 1000);
      failover("pumpfun", `DEX Screener returned ${profileResp.status}`);
      return [];
    }

    const profiles: ProfileRaw[] = Array.isArray(profileResp.data) ? profileResp.data : [];
    const solanaProfiles = profiles.filter((p) => p?.chainId === "solana");

    if (solanaProfiles.length === 0) {
      // No profiles → try search endpoint fallback
      const fallback = await searchFallbackParser();
      if (fallback.length > 0) {
        state.lastSuccessfulScan = new Date();
        return fallback;
      }
      return [];
    }

    // Step 2: batch-fetch pair data for full details
    const addresses = solanaProfiles
      .map((p) => p.tokenAddress)
      .filter((a): a is string => !!a);

    const pairsMap = await fetchPairsForAddresses(addresses);

    state.lastSuccessfulScan = new Date();

    // Step 3: build token list — never discard, safe defaults for nulls
    const tokens = solanaProfiles.map((profile) => {
      const addr = profile.tokenAddress ?? "";
      const pair = pairsMap.get(addr);
      return parsePairToToken(addr, pair, profile);
    });

    // FIX 1: Log first 3 successfully parsed tokens to confirm parser works
    tokens.slice(0, 3).forEach((t, i) => {
      logger.info(
        {
          index: i + 1,
          name: t.tokenName,
          symbol: t.tokenSymbol,
          liquidityUsd: t.liquidityUsd,
          volume5m: t.volume5m,
          mint: t.tokenMint?.slice(0, 8),
        },
        `[PARSER_CHECK] Token ${i + 1} parsed successfully`,
      );
    });

    return tokens;
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 429 || status === 403 || status === 500) {
      state.dexScreenerRateLimited = true;
      state.dexScreenerRateLimitedUntil = new Date(Date.now() + 10 * 60 * 1000);
      failover("pumpfun", `DEX Screener HTTP ${status}`);
    } else {
      logger.warn({ err: err?.message }, "[SCANNER] DEX Screener scan error — trying search fallback");
      // Try search fallback before giving up
      const fallback = await searchFallbackParser();
      if (fallback.length > 0) {
        state.lastSuccessfulScan = new Date();
        return fallback;
      }
    }
    return [];
  }
}
// ── End FIX 1 ────────────────────────────────────────────────────────────────

async function scanBirdeye(): Promise<Partial<DexToken>[]> {
  const key = process.env["BIRDEYE_API_KEY"];
  if (!key) return [];
  try {
    const resp = await axios.get("https://public-api.birdeye.so/defi/v2/tokens/new_listing?limit=20&chain=solana", {
      headers: { "X-API-KEY": key, ...getRotatedHeaders() },
      timeout: 10_000,
    });
    const items = resp.data?.data?.items ?? [];
    state.lastSuccessfulScan = new Date();
    return items.map((t: any) => ({
      tokenMint: t.address ?? "",
      tokenSymbol: t.symbol ?? "?",
      tokenName: t.name ?? "Unknown",
      logoUrl: t.logoURI ?? undefined,
      liquidityUsd: t.liquidity ?? 0,
      priceUsd: t.price ?? 0,
      volume24h: t.volume24h ?? 0,
      volume5m: 0,
      priceChange24h: t.priceChange24h ?? 0,
      pairAddress: "",
      dexId: "birdeye",
      chainId: "solana",
      createdAt: Date.now(),
      isBoosted: false,
      isTrending: false,
      buyTxns5m: 0,
      sellTxns5m: 0,
    }));
  } catch (err) {
    logger.warn({ err }, "[SCANNER] Birdeye scan failed");
    return [];
  }
}

async function probeDexScreener(): Promise<boolean> {
  try {
    const resp = await axios.get("https://api.dexscreener.com/token-profiles/latest/v1", {
      headers: getRotatedHeaders(),
      timeout: 8000,
      validateStatus: (s) => s < 400,
    });
    state.lastDexProbe = new Date();
    return resp.status === 200;
  } catch {
    return false;
  }
}

function connectPumpFun(): void {
  if (pumpFunWs) return;
  try {
    const WebSocket = (globalThis as any).WebSocket ?? require("ws");
    const ws = new WebSocket("wss://pumpportal.fun/api/data");

    ws.onopen = () => {
      state.pumpFunConnected = true;
      state.wsReconnectAttempts = 0;
      ws.send(JSON.stringify({ method: "subscribeNewToken" }));
      logger.info("[SCANNER] Pump.fun WebSocket connected");
    };

    ws.onmessage = async (event: { data: string }) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.mint && onToken) {
          await onToken({
            tokenMint: data.mint,
            tokenSymbol: data.symbol ?? "?",
            tokenName: data.name ?? "Unknown",
            logoUrl: data.imageUri ?? undefined,
            liquidityUsd: data.vSolInBondingCurve ?? 0,
            priceUsd: 0,
            volume24h: 0,
            volume5m: 0,
            priceChange24h: 0,
            pairAddress: data.bondingCurveKey ?? "",
            dexId: "pumpfun",
            chainId: "solana",
            createdAt: Date.now(),
            isBoosted: false,
            isTrending: false,
            buyTxns5m: 0,
            sellTxns5m: 0,
          });
        }
      } catch {}
    };

    ws.onerror = () => {
      state.pumpFunConnected = false;
      pumpFunWs = null;
      state.wsReconnectAttempts++;
      if (state.wsReconnectAttempts > 3 && state.activeSource === "pumpfun") {
        failover("birdeye", "Pump.fun WebSocket failed repeatedly");
      }
      setTimeout(() => connectPumpFun(), Math.min(5000 * state.wsReconnectAttempts, 30000));
    };

    ws.onclose = () => {
      state.pumpFunConnected = false;
      pumpFunWs = null;
      setTimeout(() => connectPumpFun(), 5000);
    };

    pumpFunWs = ws;
  } catch (err) {
    logger.warn({ err }, "[SCANNER] Pump.fun WebSocket unavailable — using HTTP polling");
    if (state.activeSource === "pumpfun") failover("birdeye", "WebSocket not available");
  }
}

async function runScanCycle(): Promise<void> {
  let tokens: Partial<DexToken>[] = [];

  if (
    state.dexScreenerRateLimited &&
    state.dexScreenerRateLimitedUntil &&
    Date.now() > state.dexScreenerRateLimitedUntil.getTime()
  ) {
    state.dexScreenerRateLimited = false;
    failover("dexscreener", "Rate limit window expired — resuming DEX Screener");
  }

  switch (state.activeSource) {
    case "dexscreener":
      tokens = await scanDexScreener();
      break;
    case "pumpfun":
      connectPumpFun();
      break;
    case "birdeye":
      tokens = await scanBirdeye();
      break;
  }

  if (onToken) {
    for (const token of tokens) {
      if (token.tokenMint) {
        await onToken(token).catch((err) =>
          logger.error({ err, mint: token.tokenMint }, "Scanner: token callback error"),
        );
      }
    }
  }

  logger.info(
    { source: state.activeSource, tokenCount: tokens.length },
    `[SCANNING] Scan cycle complete`,
  );
}

function scheduleDailyReset(): void {
  const now = new Date();
  const nextReset = new Date(now);
  nextReset.setUTCHours(23, 59, 0, 0);
  if (nextReset <= now) nextReset.setUTCDate(nextReset.getUTCDate() + 1);
  const ms = nextReset.getTime() - now.getTime();

  dailyResetTimeout = setTimeout(() => {
    state.dexScreenerRateLimited = false;
    state.dexScreenerRateLimitedUntil = null;
    state.activeSource = "dexscreener";
    logger.info("[SCANNER] Daily reset: rate-limit flags cleared, DEX Screener restored as primary");
    scheduleDailyReset();
  }, ms);
}

export function startTripleRadarScanner(callback: TokenCallback): void {
  if (scanInterval) return;
  onToken = callback;

  runScanCycle().catch((e) => logger.error({ e }, "Scanner: initial cycle failed"));
  scanInterval = setInterval(
    () => runScanCycle().catch((e) => logger.error({ e }, "Scanner cycle error")),
    8_000,
  );

  probeInterval = setInterval(async () => {
    if (state.activeSource !== "dexscreener") {
      const ok = await probeDexScreener();
      if (ok) failover("dexscreener", "DEX Screener recovered (30m probe)");
    }
  }, 30 * 60 * 1000);

  scheduleDailyReset();
  setScannerOnline(true);
  logger.info(
    "[SCANNER] Triple-radar scanner started — DEX Screener primary, Pump.fun secondary, Birdeye tertiary",
  );
}

export function stopTripleRadarScanner(): void {
  if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
  if (probeInterval) { clearInterval(probeInterval); probeInterval = null; }
  if (dailyResetTimeout) { clearTimeout(dailyResetTimeout); dailyResetTimeout = null; }
  setScannerOnline(false);
  logger.info("[SCANNER] Triple-radar scanner stopped");
}

export function getScannerState(): ScannerState {
  return { ...state };
}
