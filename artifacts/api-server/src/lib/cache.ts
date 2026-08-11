export const CACHE_KEYS = {
  JUPITER_PRICES: (ids: string) => `jupiter_prices:${ids}`,
  TOKEN_RISK: (mint: string) => `token_risk:${mint}`,
  WALLET_BALANCE: "wallet_balance",
  PNL_SUMMARY: "pnl_summary",
};

export const CACHE_TTL = {
  JUPITER_PRICES: 15,
  TOKEN_RISK: 300,
  WALLET_BALANCE: 10,
  PNL_SUMMARY: 30,
};

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class SimpleCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export const cache = new SimpleCache();
