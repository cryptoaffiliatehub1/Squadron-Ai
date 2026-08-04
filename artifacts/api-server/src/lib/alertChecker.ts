
import axios from "axios";
import { logger } from "./logger";
import { db, priceAlertsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { cache, CACHE_KEYS, CACHE_TTL } from "./cache";

const JUPITER_PRICE_API = "https://price.jup.ag/v6/price";

const livePriceMap: Record<string, number> = {};

export function getPriceCacheForAlerts(): Record<string, number> {
  return { ...livePriceMap };
}

async function fetchPricesForAlerts(mints: string[]): Promise<Record<string, number>> {
  if (mints.length === 0) return {};
  const key = CACHE_KEYS.JUPITER_PRICES(mints.sort().join(","));
  const cached = cache.get<Record<string, number>>(key);
  if (cached) return cached;

  try {
    const resp = await axios.get<{ data: Record<string, { price: number }> }>(
      JUPITER_PRICE_API,
      { params: { ids: mints.join(",") }, timeout: 8000 },
    );
    const result: Record<string, number> = {};
    for (const [mint, data] of Object.entries(resp.data?.data ?? {})) {
      result[mint] = data.price ?? 0;
    }
    cache.set(key, result, CACHE_TTL.JUPITER_PRICES);
    return result;
  } catch (err) {
    logger.warn({ err }, "Alert checker: Jupiter price fetch failed");
    return {};
  }
}

async function checkAlerts(): Promise<void> {
  try {
    const activeAlerts = await db
      .select()
      .from(priceAlertsTable)
      .where(sql`${priceAlertsTable.isTriggered} = false`);

    if (activeAlerts.length === 0) return;

    const mints = [...new Set(activeAlerts.map((a) => a.tokenMint))];
    const prices = await fetchPricesForAlerts(mints);

    for (const [mint, price] of Object.entries(prices)) {
      livePriceMap[mint] = price;
    }

    for (const alert of activeAlerts) {
      const currentPrice = prices[alert.tokenMint];
      if (currentPrice === undefined) continue;

      const targetPrice = Number(alert.targetPrice);
      const triggered =
        alert.direction === "above"
          ? currentPrice >= targetPrice
          : currentPrice <= targetPrice;

      if (triggered) {
        logger.info(
          { tokenMint: alert.tokenMint, currentPrice, targetPrice, direction: alert.direction },
          "Price alert triggered",
        );
        await db
          .update(priceAlertsTable)
          .set({ isTriggered: true, triggeredAt: new Date() })
          .where(eq(priceAlertsTable.id, alert.id));
      }
    }
  } catch (err) {
    logger.error({ err }, "Alert checker error");
  }
}

let checkerInterval: ReturnType<typeof setInterval> | null = null;

export function startAlertChecker(): void {
  if (checkerInterval) return;
  checkAlerts().catch(() => {});
  checkerInterval = setInterval(() => {
    checkAlerts().catch(() => {});
  }, 30_000);
  logger.info("Price alert checker started (30s interval)");
}

export function stopAlertChecker(): void {
  if (checkerInterval) {
    clearInterval(checkerInterval);
    checkerInterval = null;
  }
}
