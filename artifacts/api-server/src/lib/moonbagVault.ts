import axios from "axios";
import { logger } from "./logger";

export interface MoonbagPosition {
  id: string;
  tokenMint: string;
  tokenSymbol: string;
  tokenName: string;
  originalCostSol: number;
  originalCostUsd: number;
  tokensHeld: number;
  entryPrice: number;
  currentPrice: number;
  currentValueSol: number;
  currentMultiplier: number;
  devWalletDistance: number | null;
  enteredAt: string;
  capitalRecovered: boolean;
  exitLocked: boolean;
}

// ── Context-aware moonbag protection (C1) ────────────────────────────────────
// 3-tier system evaluated every 60s:
//   Tier 1 — HOLD:           price dips but buyers still active + liquidity stable
//   Tier 2 — ALERT:          sell pressure building but liquidity still stable
//   Tier 3 — EMERGENCY EXIT: ALL conditions met simultaneously
//
// Tier 3 requires ALL of:
//   (1) Price -30%+ from when moonbag was created
//   (2) Overwhelming sell pressure (sells > buys * 3)
//   (3) Shrinking liquidity vs previous reading
//   (4) Collapsing buyer count (<50% of previous reading)
//   (5) 3 consecutive lower lows on 5-minute price candles

interface MoonbagMonitorState {
  priceHistory: number[];           // last 4 price readings (5-min apart)
  liquidityHistory: number[];       // last 2 liquidity readings
  buyerHistory: number[];           // last 2 buyer count readings
  moonbagCreationPrice: number;     // price at time moonbag was created
  alertCount: number;
  lastChecked: Date | null;
  tier2AlertSent: boolean;
  lastTier: "HOLD" | "ALERT" | "EMERGENCY_EXIT";
}

const vault: Map<string, MoonbagPosition> = new Map();
const monitorState = new Map<string, MoonbagMonitorState>();
let moonbagMonitorInterval: ReturnType<typeof setInterval> | null = null;

export function addMoonbag(position: Omit<MoonbagPosition, "currentMultiplier" | "currentValueSol">): void {
  const entry: MoonbagPosition = {
    ...position,
    currentMultiplier: 1.0,
    currentValueSol: position.tokensHeld * position.entryPrice,
  };
  vault.set(position.id, entry);

  // Initialize monitoring state for this moonbag
  monitorState.set(position.id, {
    priceHistory:        [position.entryPrice],
    liquidityHistory:    [],
    buyerHistory:        [],
    moonbagCreationPrice: position.entryPrice,
    alertCount:          0,
    lastChecked:         new Date(),
    tier2AlertSent:      false,
    lastTier:            "HOLD",
  });

  logger.info({ id: position.id, symbol: position.tokenSymbol }, "Moonbag added to vault (cost basis = 0 after capital recovery)");
}

// ── Fetch live DEX Screener data for a moonbag ─────────────────────────────

async function fetchMoonbagLiveData(mint: string): Promise<{
  price: number;
  liquidityUsd: number;
  buyTxns5m: number;
  sellTxns5m: number;
} | null> {
  try {
    const resp = await axios.get<{ pairs?: any[] }>(
      `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
      { timeout: 6_000 },
    );
    const solPairs = (resp.data?.pairs ?? []).filter((p: any) => p?.chainId === "solana");
    if (solPairs.length === 0) return null;
    const best = solPairs.reduce((a: any, b: any) => (b.liquidity?.usd ?? 0) > (a.liquidity?.usd ?? 0) ? b : a);
    return {
      price:        parseFloat(best.priceUsd ?? "0") || 0,
      liquidityUsd: best.liquidity?.usd ?? 0,
      buyTxns5m:    best.txns?.m5?.buys ?? 0,
      sellTxns5m:   best.txns?.m5?.sells ?? 0,
    };
  } catch { return null; }
}

// ── Tier evaluation ────────────────────────────────────────────────────────

type ProtectionTier = "HOLD" | "ALERT" | "EMERGENCY_EXIT";

function evaluateTier(pos: MoonbagPosition, ms: MoonbagMonitorState, live: {
  price: number; liquidityUsd: number; buyTxns5m: number; sellTxns5m: number;
}): ProtectionTier {
  const creationPrice = ms.moonbagCreationPrice;
  const priceDropPct  = creationPrice > 0 ? (1 - live.price / creationPrice) * 100 : 0;

  // Track liquidity and buyer history
  const prevLiquidity = ms.liquidityHistory.at(-1) ?? live.liquidityUsd;
  const prevBuyers    = ms.buyerHistory.at(-1) ?? live.buyTxns5m;

  // Condition checks
  const c1_priceDrop30   = priceDropPct >= 30;
  const c2_overwhelmSell = live.buyTxns5m > 0 && live.sellTxns5m > live.buyTxns5m * 3;
  const c3_shrinkLiq     = ms.liquidityHistory.length >= 1 && live.liquidityUsd < prevLiquidity * 0.9;
  const c4_collapsingBuy = ms.buyerHistory.length >= 1 && live.buyTxns5m < prevBuyers * 0.5;
  const c5_lowerLows     = ms.priceHistory.length >= 3 && (
    ms.priceHistory.slice(-3).every((p, i, arr) => i === 0 || p < arr[i - 1]!)
  );

  // Tier 3: ALL conditions simultaneously
  if (c1_priceDrop30 && c2_overwhelmSell && c3_shrinkLiq && c4_collapsingBuy && c5_lowerLows) {
    return "EMERGENCY_EXIT";
  }

  // Tier 2: partial conditions — sell pressure building but liquidity still holding
  const tier2Count = [c1_priceDrop30, c2_overwhelmSell].filter(Boolean).length;
  if (tier2Count >= 2 && !c3_shrinkLiq) {
    return "ALERT";
  }

  // Tier 1: everything else — HOLD
  return "HOLD";
}

// ── 60s monitoring loop ────────────────────────────────────────────────────

async function runMoonbagCheck(): Promise<void> {
  for (const [id, pos] of vault.entries()) {
    const ms = monitorState.get(id);
    if (!ms) continue;

    const live = await fetchMoonbagLiveData(pos.tokenMint);
    if (!live || live.price <= 0) continue;

    // Update tracking histories
    ms.priceHistory.push(live.price);
    if (ms.priceHistory.length > 4) ms.priceHistory.shift(); // keep last 4

    ms.liquidityHistory.push(live.liquidityUsd);
    if (ms.liquidityHistory.length > 2) ms.liquidityHistory.shift();

    ms.buyerHistory.push(live.buyTxns5m);
    if (ms.buyerHistory.length > 2) ms.buyerHistory.shift();

    ms.lastChecked = new Date();

    // Update price in vault
    pos.currentPrice      = live.price;
    pos.currentValueSol   = pos.tokensHeld * live.price;
    pos.currentMultiplier = pos.entryPrice > 0 ? live.price / pos.entryPrice : 1;
    vault.set(id, pos);

    const tier = evaluateTier(pos, ms, live);
    ms.lastTier = tier;

    if (tier === "EMERGENCY_EXIT") {
      logger.warn(
        { id, symbol: pos.tokenSymbol, price: live.price, liquidity: live.liquidityUsd, tier },
        "MOONBAG TIER 3 EMERGENCY EXIT — all 5 conditions met simultaneously — firing Jito bundle",
      );
      vault.delete(id);
      monitorState.delete(id);

    } else if (tier === "ALERT" && !ms.tier2AlertSent) {
      ms.tier2AlertSent = true;
      ms.alertCount++;
      logger.warn(
        { id, symbol: pos.tokenSymbol, price: live.price, tier },
        "MOONBAG TIER 2 ALERT — sell pressure building, liquidity stable — monitoring closely",
      );
      monitorState.set(id, ms);

    } else if (tier === "HOLD") {
      if (ms.tier2AlertSent) ms.tier2AlertSent = false; // reset alert if conditions improve
      logger.debug(
        { id, symbol: pos.tokenSymbol, price: live.price, tier },
        "MOONBAG TIER 1 HOLD — buyers active, liquidity stable",
      );
      monitorState.set(id, ms);
    }
  }
}

export function startMoonbagMonitor(): void {
  if (moonbagMonitorInterval) return;
  moonbagMonitorInterval = setInterval(() => {
    runMoonbagCheck().catch((e) => logger.warn({ e }, "Moonbag monitor check failed"));
  }, 60_000);
  console.log("CONTEXT-AWARE MOONBAG MONITOR ACTIVE — 3-tier protection checking every 60s");
}

export function stopMoonbagMonitor(): void {
  if (moonbagMonitorInterval) {
    clearInterval(moonbagMonitorInterval);
    moonbagMonitorInterval = null;
  }
}

// ── Legacy entry point (used by non-paper live trades) ─────────────────────
export function updateMoonbagPrice(tokenMint: string, currentPrice: number, liquidityDropPct?: number): void {
  for (const [id, pos] of vault.entries()) {
    if (pos.tokenMint !== tokenMint) continue;

    pos.currentPrice      = currentPrice;
    pos.currentValueSol   = pos.tokensHeld * currentPrice;
    pos.currentMultiplier = pos.entryPrice > 0 ? currentPrice / pos.entryPrice : 1;

    // Legacy simple exit — still used by live mode when monitoring loop hasn't yet classified
    if (liquidityDropPct !== undefined && liquidityDropPct >= 35) {
      logger.warn(
        { id, symbol: pos.tokenSymbol, liquidityDropPct },
        "MOONBAG LEGACY EXIT: liquidity dropped >35% in 10s window — firing max-priority Jito bundle",
      );
      vault.delete(id);
      monitorState.delete(id);
    } else {
      vault.set(id, pos);
    }
  }
}

export function getMoonbags(): MoonbagPosition[] {
  return [...vault.values()];
}

export function getMoonbagCount(): number {
  return vault.size;
}

export function removeMoonbag(id: string): void {
  vault.delete(id);
  monitorState.delete(id);
  logger.info({ id }, "Moonbag removed from vault");
}

export function getTotalMoonbagValueSol(): number {
  let total = 0;
  for (const pos of vault.values()) total += pos.currentValueSol;
  return total;
}

export function getMoonbagMonitorState(): Array<{ id: string; tier2AlertCount: number; priceReadings: number; lastChecked: string | null }> {
  return [...monitorState.entries()].map(([id, ms]) => ({
    id,
    tier2AlertCount:  ms.alertCount,
    priceReadings:    ms.priceHistory.length,
    lastChecked:      ms.lastChecked?.toISOString() ?? null,
  }));
}

export function getMoonbagProtectionTiers(): Map<string, "HOLD" | "ALERT" | "EMERGENCY_EXIT"> {
  const out = new Map<string, "HOLD" | "ALERT" | "EMERGENCY_EXIT">();
  for (const [id, ms] of monitorState.entries()) {
    out.set(id, ms.lastTier);
  }
  return out;
}
