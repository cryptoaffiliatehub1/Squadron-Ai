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

// ── DEX Screener parser ──────────────────────────────────────────────────────
// CONFIRMED real API shapes (verified by live curl):
//
// GET /token-profiles/latest/v1  →  array of:
//   { chainId, tokenAddress, icon, header, openGraph, links, cto, updatedAt }
//   *** NO pairs, NO name, NO symbol inside the profile object ***
//
// GET /latest/dex/tokens/{addr}  →  { schemaVersion, pairs: [ ... ] }
//   pairs[0]: { chainId, dexId, pairAddress, baseToken: {address,name,symbol},
//               priceUsd, liquidity: {usd}, volume: {h24,h6,h1,m5},
//               txns: {m5:{buys,sells}}, priceChange: {h24}, pairCreatedAt }
//   *** NO info field on pairs — logo comes from the profile object only ***

// Guard so the raw dump fires only once per process lifetime
let _rawDumped = false;

interface ProfileRaw {
  chainId: string;
  tokenAddress: string;
  icon?: string;    // token logo URL  ← this is the logo source
  header?: string;  // banner image URL (fallback logo)
}

interface PairDataRaw {
  chainId: string;
  dexId?: string;
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string | number;
  liquidity?: { usd?: number };
  volume?: { h24?: number; m5?: number };
  priceChange?: { h24?: number };
  txns?: { m5?: { buys?: number; sells?: number } };
  pairCreatedAt?: number;
}

function buildToken(
  tokenAddress: string,
  pair: PairDataRaw | undefined,
  iconUrl: string | undefined,
): Partial<DexToken> {
  // Logo comes from the profile icon/header — pairs have no info field
  const logoUrl = iconUrl || undefined;

  // Name/symbol come exclusively from pair.baseToken — never from the profile
  const rawName = pair?.baseToken?.name?.trim();
  const tokenName = rawName || tokenAddress.slice(0, 8);

  const rawSymbol = pair?.baseToken?.symbol?.trim();
  const tokenSymbol = rawSymbol || "?";

  // Liquidity: NaN → 0 but still emit the token so it shows as a card
  const rawLiq = Number(pair?.liquidity?.usd ?? 0);
  const liquidityUsd = isFinite(rawLiq) ? rawLiq : 0;

  return {
    tokenMint: tokenAddress,
    tokenSymbol,
    tokenName,
    logoUrl,
    liquidityUsd,
    priceUsd: Number(pair?.priceUsd ?? 0) || 0,
    volume24h: Number(pair?.volume?.h24 ?? 0),
    volume5m: Number(pair?.volume?.m5 ?? 0),
    priceChange24h: Number(pair?.priceChange?.h24 ?? 0),
    pairAddress: pair?.pairAddress ?? "",
    dexId: pair?.dexId ?? "dexscreener",
    chainId: "solana",
    createdAt: pair?.pairCreatedAt ?? Date.now(),
    isBoosted: false,
    isTrending: true,
    buyTxns5m: pair?.txns?.m5?.buys ?? 0,
    sellTxns5m: pair?.txns?.m5?.sells ?? 0,
  };
}

// Fetch the best (highest-liquidity) Solana pair for a token address
async function fetchBestPair(tokenAddress: string): Promise<PairDataRaw | undefined> {
  try {
    const resp = await axios.get<{ pairs?: PairDataRaw[] }>(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      { headers: getRotatedHeaders(), timeout: 8_000 },
    );
    const solanaPairs = (resp.data?.pairs ?? []).filter((p) => p?.chainId === "solana");
    if (solanaPairs.length === 0) return undefined;
    return solanaPairs.reduce((best, p) =>
      (p.liquidity?.usd ?? 0) > (best.liquidity?.usd ?? 0) ? p : best,
    );
  } catch {
    return undefined;
  }
}

// Batch-fetch pairs for up to 30 addresses at a time
async function fetchPairsForAddresses(addresses: string[]): Promise<Map<string, PairDataRaw>> {
  const pairsMap = new Map<string, PairDataRaw>();
  if (addresses.length === 0) return pairsMap;

  const chunks: string[][] = [];
  for (let i = 0; i < addresses.length; i += 30) chunks.push(addresses.slice(i, i + 30));

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
  try {
    const resp = await axios.get<{ pairs?: PairDataRaw[] }>(
      "https://api.dexscreener.com/latest/dex/search?q=solana&order=h6_volume",
      { headers: getRotatedHeaders(), timeout: 10_000 },
    );
    return (resp.data?.pairs ?? [])
      .filter((p) => p?.chainId === "solana")
      .slice(0, 30)
      .map((p) => buildToken(p?.baseToken?.address ?? "", p, undefined));
  } catch {
    return [];
  }
}

async function scanDexScreener(): Promise<Partial<DexToken>[]> {
  try {
    const profileResp = await axios.get<unknown>(
      "https://api.dexscreener.com/token-profiles/latest/v1",
      { headers: getRotatedHeaders(), timeout: 10_000 },
    );

    // Dump raw response ONCE on startup — confirms actual field names in production logs
    if (!_rawDumped) {
      _rawDumped = true;
      const sample = Array.isArray(profileResp.data) ? (profileResp.data as unknown[]).slice(0, 2) : profileResp.data;
      console.log("[RAW_PROFILE_DUMP]", JSON.stringify(sample, null, 2));
    }

    if (profileResp.status === 429 || profileResp.status === 403 || profileResp.status === 500) {
      state.dexScreenerRateLimited = true;
      state.dexScreenerRateLimitedUntil = new Date(Date.now() + 10 * 60 * 1000);
      failover("pumpfun", `DEX Screener returned ${profileResp.status}`);
      return [];
    }

    const profiles: ProfileRaw[] = Array.isArray(profileResp.data) ? profileResp.data : [];
    const solanaProfiles = profiles.filter((p) => p?.chainId === "solana");

    if (solanaProfiles.length === 0) {
      const fallback = await searchFallbackParser();
      if (fallback.length > 0) { state.lastSuccessfulScan = new Date(); return fallback; }
      return [];
    }

    // Batch-fetch pair data for all token addresses
    const addresses = solanaProfiles.map((p) => p.tokenAddress).filter(Boolean) as string[];
    const pairsMap = await fetchPairsForAddresses(addresses);

    state.lastSuccessfulScan = new Date();

    // Build token list — never discard, always emit even with no pair data
    const tokens = solanaProfiles.map((profile) => {
      const addr = profile.tokenAddress ?? "";
      const pair = pairsMap.get(addr);
      return buildToken(addr, pair, profile.icon ?? profile.header);
    });

    // Print first token with real name to confirm parser is working
    const first = tokens.find((t) => t.tokenName && t.tokenName.length > 8);
    if (first) {
      console.log(
        `[PARSER_OK] ${first.tokenName} (${first.tokenSymbol}) — liq: $${first.liquidityUsd?.toFixed(0)} | vol5m: $${first.volume5m?.toFixed(0)}`,
      );
    }

    return tokens;
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 429 || status === 403 || status === 500) {
      state.dexScreenerRateLimited = true;
      state.dexScreenerRateLimitedUntil = new Date(Date.now() + 10 * 60 * 1000);
      failover("pumpfun", `DEX Screener HTTP ${status}`);
    } else {
      logger.warn({ err: err?.message }, "[SCANNER] DEX Screener scan error — trying search fallback");
      const fallback = await searchFallbackParser();
      if (fallback.length > 0) { state.lastSuccessfulScan = new Date(); return fallback; }
    }
    return [];
  }
}
// ── End DEX Screener parser ───────────────────────────────────────────────────

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
        if (!data?.mint || !onToken) return;

        // WS gives us name/symbol/imageUri immediately — use them as defaults
        const solPriceUsd = parseFloat(process.env["SOL_PRICE_USD"] ?? "") || 150;
        const wsMarketCapUsd = (Number(data.marketCapSol ?? 0)) * solPriceUsd;
        const wsName = (data.name ?? "").trim() || String(data.mint).slice(0, 8);
        const wsSymbol = (data.symbol ?? "").trim() || "?";

        // Enrich with full DEX Screener pair data for the mint address
        const pair = await fetchBestPair(data.mint);

        const tokenName = pair?.baseToken?.name?.trim() || wsName;
        const tokenSymbol = pair?.baseToken?.symbol?.trim() || wsSymbol;
        const liquidityUsd = pair?.liquidity?.usd ?? wsMarketCapUsd;

        await onToken({
          tokenMint: data.mint,
          tokenSymbol,
          tokenName,
          logoUrl: data.imageUri ?? undefined,
          liquidityUsd,
          priceUsd: Number(pair?.priceUsd ?? 0),
          volume24h: Number(pair?.volume?.h24 ?? 0),
          volume5m: Number(pair?.volume?.m5 ?? 0),
          priceChange24h: Number(pair?.priceChange?.h24 ?? 0),
          pairAddress: pair?.pairAddress ?? data.bondingCurveKey ?? "",
          dexId: "pumpfun",
          chainId: "solana",
          createdAt: Date.now(),
          isBoosted: false,
          isTrending: false,
          buyTxns5m: pair?.txns?.m5?.buys ?? 0,
          sellTxns5m: pair?.txns?.m5?.sells ?? 0,
        });
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
  console.log("PARSER FIX COMPLETE");
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
