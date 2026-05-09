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

async function scanDexScreener(): Promise<Partial<DexToken>[]> {
  try {
    const resp = await axios.get<{ pairs?: unknown[] }>(
      "https://api.dexscreener.com/token-profiles/latest/v1",
      { headers: getRotatedHeaders(), timeout: 10_000 },
    );

    if (resp.status === 429 || resp.status === 403 || resp.status === 500) {
      state.dexScreenerRateLimited = true;
      state.dexScreenerRateLimitedUntil = new Date(Date.now() + 10 * 60 * 1000);
      failover("pumpfun", `DEX Screener returned ${resp.status}`);
      return [];
    }

    const profiles = Array.isArray(resp.data) ? resp.data : [];
    state.lastSuccessfulScan = new Date();

    return profiles
      .filter((p: any) => p?.chainId === "solana")
      .map((p: any) => ({
        tokenMint: p?.tokenAddress ?? "",
        tokenSymbol: p?.symbol ?? "?",
        tokenName: p?.name ?? "Unknown",
        liquidityUsd: 0,
        priceUsd: 0,
        volume24h: 0,
        volume5m: 0,
        priceChange24h: 0,
        pairAddress: "",
        dexId: "dexscreener",
        chainId: "solana",
        createdAt: Date.now(),
        isBoosted: true,
        isTrending: true,
        buyTxns5m: 0,
        sellTxns5m: 0,
      }));
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 429 || status === 403 || status === 500) {
      state.dexScreenerRateLimited = true;
      state.dexScreenerRateLimitedUntil = new Date(Date.now() + 10 * 60 * 1000);
      failover("pumpfun", `DEX Screener HTTP ${status}`);
    }
    return [];
  }
}

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
            liquidityUsd: data.vSolInBondingCurve ?? 0,
            priceUsd: data.traderPublicKey ? 0 : 0,
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

  if (state.dexScreenerRateLimited && state.dexScreenerRateLimitedUntil && Date.now() > state.dexScreenerRateLimitedUntil.getTime()) {
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
        await onToken(token).catch((err) => logger.error({ err, mint: token.tokenMint }, "Scanner: token callback error"));
      }
    }
  }

  logger.info({ source: state.activeSource, tokenCount: tokens.length }, `[SCANNING] Scan cycle complete`);
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
  scanInterval = setInterval(() => runScanCycle().catch((e) => logger.error({ e }, "Scanner cycle error")), 8_000);

  probeInterval = setInterval(async () => {
    if (state.activeSource !== "dexscreener") {
      const ok = await probeDexScreener();
      if (ok) failover("dexscreener", "DEX Screener recovered (30m probe)");
    }
  }, 30 * 60 * 1000);

  scheduleDailyReset();
  setScannerOnline(true);
  logger.info("[SCANNER] Triple-radar scanner started — DEX Screener primary, Pump.fun secondary, Birdeye tertiary");
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
