import { Router } from "express";
import axios from "axios";
import { getWalletPublicKey, getSolBalance } from "../lib/solana";
import { logger } from "../lib/logger";
import { cache, CACHE_KEYS, CACHE_TTL } from "../lib/cache";

const router = Router();
const JUPITER_PRICE_API = "https://price.jup.ag/v6/price";
const SOL_MINT = "So11111111111111111111111111111111111111112";

async function getSolPriceUsd(): Promise<number> {
  try {
    const resp = await axios.get<{ data: Record<string, { price: number }> }>(
      JUPITER_PRICE_API,
      { params: { ids: SOL_MINT }, timeout: 8000 },
    );
    return resp.data?.data?.[SOL_MINT]?.price ?? 150;
  } catch {
    return 150;
  }
}

router.get("/wallet/balance", async (_req, res) => {
  try {
    const cached = cache.get<object>(CACHE_KEYS.WALLET_BALANCE);
    if (cached) return res.json(cached);

    const walletAddress = getWalletPublicKey();
    if (!walletAddress) {
      return res.json({
        walletAddress: null,
        solBalance: 0,
        usdValue: 0,
        maxTradeAmount: 0,
        tokens: [],
      });
    }

    const [solBalance, solPriceUsd] = await Promise.all([
      getSolBalance(walletAddress),
      getSolPriceUsd(),
    ]);

    const usdValue = solBalance * solPriceUsd;
    const maxTradeAmount = solBalance * 0.2;

    const result = {
      walletAddress,
      solBalance,
      usdValue,
      maxTradeAmount,
      tokens: [],
    };

    cache.set(CACHE_KEYS.WALLET_BALANCE, result, CACHE_TTL.WALLET_BALANCE);
    return res.json(result);
  } catch (err) {
    logger.error({ err }, "GET /wallet/balance failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/portfolio", async (_req, res) => {
  try {
    const walletAddress = getWalletPublicKey();
    if (!walletAddress) return res.json([]);

    return res.json([]);
  } catch (err) {
    logger.error({ err }, "GET /portfolio failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
