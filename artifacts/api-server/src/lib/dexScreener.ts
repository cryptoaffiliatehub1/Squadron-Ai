
import axios from "axios";
import { logger } from "./logger";

const DEX_BASE = "https://api.dexscreener.com";

export interface DexToken {
  tokenMint: string;
  tokenName: string;
  tokenSymbol: string;
  liquidityUsd: number;
  priceUsd: number;
  volume24h: number;
  volume5m: number;
  priceChange24h: number;
  pairAddress: string;
  dexId: string;
  chainId: string;
  createdAt: number;
  isBoosted?: boolean;
  isTrending?: boolean;
  buyTxns5m: number;
  sellTxns5m: number;
}

export interface ScannerFilter {
  minLiquidityUsd?: number;
  minVolume24h?: number;
  maxAgeMinutes?: number;
  chainId?: string;
}

const DEFAULT_FILTER: Required<ScannerFilter> = {
  minLiquidityUsd: 10_000,
  minVolume24h: 0,
  maxAgeMinutes: Infinity,
  chainId: "solana",
};

interface BoostedTokenRaw {
  chainId: string;
  tokenAddress: string;
  amount?: number;
  totalAmount?: number;
}

async function getBoostedMints(): Promise<Set<string>> {
  try {
    const [top, latest] = await Promise.all([
      axios.get<BoostedTokenRaw[]>(`${DEX_BASE}/token-boosts/top/v1`, { timeout: 8_000 }),
      axios.get<BoostedTokenRaw[]>(`${DEX_BASE}/token-boosts/latest/v1`, { timeout: 8_000 }),
    ]);
    const all = [...(top.data ?? []), ...(latest.data ?? [])];
    return new Set(
      all
        .filter((t) => t.chainId === "solana")
        .map((t) => t.tokenAddress.toLowerCase()),
    );
  } catch (err) {
    logger.warn({ err }, "DEX Screener boost fetch failed — continuing without boost filter");
    return new Set();
  }
}

interface PairRaw {
  baseToken: { address: string; name: string; symbol: string };
  liquidity?: { usd?: number };
  volume?: { h24?: number; m5?: number };
  priceUsd?: string;
  priceChange?: { h24?: number };
  pairAddress: string;
  dexId: string;
  chainId: string;
  pairCreatedAt?: number;
  boosts?: { active?: number };
  txns?: {
    m5?: { buys?: number; sells?: number };
    h1?: { buys?: number; sells?: number };
    h6?: { buys?: number; sells?: number };
    h24?: { buys?: number; sells?: number };
  };
}

function pairToToken(p: PairRaw, boostedMints: Set<string>, isTrending: boolean): DexToken {
  return {
    tokenMint: p.baseToken.address,
    tokenName: p.baseToken.name,
    tokenSymbol: p.baseToken.symbol,
    liquidityUsd: p.liquidity?.usd ?? 0,
    priceUsd: parseFloat(p.priceUsd ?? "0"),
    volume24h: p.volume?.h24 ?? 0,
    volume5m: p.volume?.m5 ?? 0,
    priceChange24h: p.priceChange?.h24 ?? 0,
    pairAddress: p.pairAddress,
    dexId: p.dexId,
    chainId: p.chainId,
    createdAt: p.pairCreatedAt ?? Date.now(),
    isBoosted: (p.boosts?.active ?? 0) > 0 || boostedMints.has(p.baseToken.address.toLowerCase()),
    isTrending,
    buyTxns5m: p.txns?.m5?.buys ?? 0,
    sellTxns5m: p.txns?.m5?.sells ?? 0,
  };
}

export async function scanTrendingAndBoosted(
  filter: ScannerFilter = {},
  limit = 50,
): Promise<DexToken[]> {
  const opts = { ...DEFAULT_FILTER, ...filter };

  const [boostedMints, trendingResp] = await Promise.all([
    getBoostedMints(),
    axios
      .get<{ pairs: PairRaw[] }>(`${DEX_BASE}/latest/dex/search?q=solana&order=trending`, {
        timeout: 10_000,
      })
      .catch(() => null),
  ]);

  const now = Date.now();
  const seen = new Set<string>();
  const tokens: DexToken[] = [];

  for (const p of trendingResp?.data?.pairs ?? []) {
    if (p.chainId !== opts.chainId) continue;
    const liq = p.liquidity?.usd ?? 0;
    const vol = p.volume?.h24 ?? 0;
    const ageMin = p.pairCreatedAt ? (now - p.pairCreatedAt) / 60_000 : 0;
    if (
      liq < opts.minLiquidityUsd ||
      vol < opts.minVolume24h ||
      (opts.maxAgeMinutes !== Infinity && ageMin > opts.maxAgeMinutes)
    )
      continue;
    if (seen.has(p.baseToken.address)) continue;
    seen.add(p.baseToken.address);
    tokens.push(pairToToken(p, boostedMints, true));
  }

  if (boostedMints.size > 0 && tokens.length < limit) {
    const mintList = [...boostedMints].slice(0, 30).join(",");
    try {
      const boostedResp = await axios.get<{ pairs: PairRaw[] }>(
        `${DEX_BASE}/latest/dex/tokens/${mintList}`,
        { timeout: 10_000 },
      );
      for (const p of boostedResp.data?.pairs ?? []) {
        if (p.chainId !== opts.chainId) continue;
        const liq = p.liquidity?.usd ?? 0;
        if (liq < opts.minLiquidityUsd) continue;
        if (seen.has(p.baseToken.address)) continue;
        seen.add(p.baseToken.address);
        tokens.push(pairToToken(p, boostedMints, false));
      }
    } catch (err) {
      logger.warn({ err }, "DEX Screener boosted pair lookup failed");
    }
  }

  tokens.sort((a, b) => b.liquidityUsd - a.liquidityUsd);
  const result = tokens.slice(0, limit);

  logger.info(
    { trending: trendingResp?.data?.pairs?.length ?? 0, boosted: boostedMints.size, afterFilter: result.length },
    "DEX Screener fire scan complete",
  );

  return result;
}

export async function getTokenDexData(tokenMint: string): Promise<DexToken | null> {
  try {
    const resp = await axios.get<{ pairs: PairRaw[] }>(
      `${DEX_BASE}/latest/dex/tokens/${tokenMint}`,
      { timeout: 8_000 },
    );
    const solPairs = (resp.data?.pairs ?? []).filter((p) => p.chainId === "solana");
    if (solPairs.length === 0) return null;
    solPairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
    return pairToToken(solPairs[0], new Set(), false);
  } catch (err) {
    logger.warn({ err, tokenMint }, "DEX Screener single token lookup failed");
    return null;
  }
}

let scannerTimer: ReturnType<typeof setInterval> | null = null;
const SCAN_INTERVAL_MS = 60_000;

export function startDexScreenerScanner(
  onToken: (mint: string, name: string, symbol: string, liquidityUsd: number) => Promise<void>,
): void {
  if (scannerTimer) return;

  const seenMints = new Set<string>();

  async function runScan() {
    const tokens = await scanTrendingAndBoosted({ minLiquidityUsd: 10_000 });
    let newCount = 0;
    for (const t of tokens) {
      if (seenMints.has(t.tokenMint)) continue;
      seenMints.add(t.tokenMint);
      newCount++;
      await onToken(t.tokenMint, t.tokenName, t.tokenSymbol, t.liquidityUsd).catch(
        (err: Error) => logger.error({ err, mint: t.tokenMint }, "DEX scanner: error in onToken"),
      );
    }
    if (newCount > 0) logger.info({ newCount }, "DEX scanner: new tokens queued for risk check");
  }

  runScan().catch((err: Error) => logger.error({ err }, "DEX scanner: initial scan failed"));
  scannerTimer = setInterval(() => {
    runScan().catch((err: Error) => logger.error({ err }, "DEX scanner: scan failed"));
  }, SCAN_INTERVAL_MS);

  logger.info({ intervalMs: SCAN_INTERVAL_MS }, "DEX Screener trending/boosted scanner started");
}

export function stopDexScreenerScanner(): void {
  if (scannerTimer) {
    clearInterval(scannerTimer);
    scannerTimer = null;
    logger.info("DEX Screener scanner stopped");
  }
}
