import { Router } from "express";
import { db, skippedTokensTable, detectedTokensTable } from "@workspace/db";
import { desc, ne } from "drizzle-orm";
import { checkTokenSafety } from "../lib/rugcheck";
import { logger } from "../lib/logger";

const router = Router();

router.get("/tokens/skipped", async (req, res) => {
  try {
    const limit = parseInt(String(req.query.limit ?? "50"), 10);
    const tokens = await db
      .select()
      .from(skippedTokensTable)
      .orderBy(desc(skippedTokensTable.detectedAt))
      .limit(isNaN(limit) ? 50 : limit);

    res.json(tokens.map((t) => ({
      ...t,
      liquidityUsd: t.liquidityUsd !== null && t.liquidityUsd !== undefined
        ? Number(t.liquidityUsd)
        : null,
      marketCap: t.marketCap !== null && t.marketCap !== undefined   // Fix 4
        ? Number(t.marketCap)
        : null,
      safetyScore: t.safetyScore !== null && t.safetyScore !== undefined
        ? Number(t.safetyScore)
        : null,
      detectedAt: t.detectedAt.toISOString(),
    })));
  } catch (err) {
    logger.error({ err }, "GET /tokens/skipped failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/tokens/recent", async (req, res) => {
  try {
    const limit = parseInt(String(req.query.limit ?? "20"), 10);
    const tokens = await db
      .select()
      .from(detectedTokensTable)
      .where(ne(detectedTokensTable.safetyStatus, "risky"))
      .orderBy(desc(detectedTokensTable.detectedAt))
      .limit(isNaN(limit) ? 20 : limit);

    res.json(
      tokens.map((t) => ({
        ...t,
        failureLabel: t.failureLabel ?? null,          // Fix 3: specific badge
        marketCap:    t.marketCap    !== null ? Number(t.marketCap)    : null,  // Fix 4
        liquidityUsd: t.liquidityUsd !== null ? Number(t.liquidityUsd) : null,
        volume5m:     t.volume5m     !== null ? Number(t.volume5m)     : null,
        mintRevoked:  t.mintRevoked  ?? null,
        buyTxns5m:    t.buyTxns5m   ?? null,
        sellTxns5m:   t.sellTxns5m  ?? null,
        detectedAt:   t.detectedAt.toISOString(),
      })),
    );
  } catch (err) {
    logger.error({ err }, "GET /tokens/recent failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tokens/check-safety", async (req, res) => {
  try {
    const { tokenMint } = req.body;
    if (!tokenMint) return res.status(400).json({ error: "tokenMint is required" });

    const result = await checkTokenSafety(tokenMint);
    res.json({ tokenMint, ...result });
  } catch (err) {
    logger.error({ err }, "POST /tokens/check-safety failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
