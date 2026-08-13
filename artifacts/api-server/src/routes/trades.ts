import { Router } from "express";
import { db, tradesTable, skippedTokensTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import { cache, CACHE_KEYS, CACHE_TTL } from "../lib/cache";
import { logger } from "../lib/logger";

const router = Router();

function serializeTrade(t: typeof tradesTable.$inferSelect) {
  return {
    ...t,
    amountSol: Number(t.amountSol),
    amountTokens: Number(t.amountTokens),
    priceUsd: Number(t.priceUsd),
    pnlUsd: t.pnlUsd !== null ? Number(t.pnlUsd) : null,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/trades", async (req, res) => {
  try {
    const limit = parseInt(String(req.query.limit ?? "50"), 10);
    const offset = parseInt(String(req.query.offset ?? "0"), 10);

    const trades = await db
      .select()
      .from(tradesTable)
      .orderBy(desc(tradesTable.createdAt))
      .limit(isNaN(limit) ? 50 : limit)
      .offset(isNaN(offset) ? 0 : offset);

    res.json(trades.map(serializeTrade));
  } catch (err) {
    logger.error({ err }, "GET /trades failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/trades/pnl", async (req, res) => {
  try {
    const cached = cache.get<object>(CACHE_KEYS.PNL_SUMMARY);
    if (cached) return res.json(cached);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [allTrades, dailyTrades] = await Promise.all([
      db.select().from(tradesTable).where(sql`${tradesTable.status} = 'success'`),
      db
        .select()
        .from(tradesTable)
        .where(sql`${tradesTable.status} = 'success' AND ${tradesTable.createdAt} >= ${today}`),
    ]);

    const allTimePnlUsd = allTrades.reduce((sum, t) => sum + Number(t.pnlUsd ?? 0), 0);
    const dailyPnlUsd = dailyTrades.reduce((sum, t) => sum + Number(t.pnlUsd ?? 0), 0);
    const dailySolStake = dailyTrades.reduce(
      (sum, t) => sum + (t.type === "buy" ? Number(t.amountSol) : 0),
      0,
    );
    const dailyPnlPct = dailySolStake > 0 ? (dailyPnlUsd / dailySolStake) * 100 : 0;

    const result = {
      dailyPnlUsd,
      dailyPnlPct,
      allTimePnlUsd,
      totalTradesCount: allTrades.length,
      winningTradesCount: allTrades.filter((t) => Number(t.pnlUsd ?? 0) > 0).length,
      losingTradesCount: allTrades.filter((t) => Number(t.pnlUsd ?? 0) < 0).length,
      dailyTradesCount: dailyTrades.length,
    };

    cache.set(CACHE_KEYS.PNL_SUMMARY, result, CACHE_TTL.PNL_SUMMARY);
    return res.json(result);
  } catch (err) {
    logger.error({ err }, "GET /trades/pnl failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/trades/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid trade id" });

    const { notes, tag } = req.body;

    const [updated] = await db
      .update(tradesTable)
      .set({
        ...(notes !== undefined ? { notes: notes ?? null } : {}),
        ...(tag !== undefined ? { tag: tag ?? null } : {}),
      })
      .where(eq(tradesTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Trade not found" });

    cache.invalidate(CACHE_KEYS.PNL_SUMMARY);
    return res.json(serializeTrade(updated));
  } catch (err) {
    logger.error({ err }, "PATCH /trades/:id failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/history", async (req, res) => {
  try {
    const limit = parseInt(String(req.query.limit ?? "100"), 10);

    const [trades, skipped] = await Promise.all([
      db.select().from(tradesTable).orderBy(desc(tradesTable.createdAt)).limit(limit),
      db.select().from(skippedTokensTable).orderBy(desc(skippedTokensTable.detectedAt)).limit(limit),
    ]);

    type HistoryEntry = {
      id: number;
      kind: "trade" | "rejected";
      tokenMint: string;
      tokenSymbol: string;
      tokenName: string;
      outcome: string;
      amountSol: number | null;
      pnlUsd: number | null;
      txSignature: string | null;
      reason: string | null;
      safetyScore: string | null;
      notes: string | null;
      tag: string | null;
      status: string | null;
      timestamp: string;
    };

    const tradeEntries: HistoryEntry[] = trades.map((t) => ({
      id: t.id,
      kind: "trade",
      tokenMint: t.tokenMint,
      tokenSymbol: t.tokenSymbol,
      tokenName: t.tokenName,
      outcome: t.type,
      amountSol: Number(t.amountSol),
      pnlUsd: t.pnlUsd !== null ? Number(t.pnlUsd) : null,
      txSignature: t.txSignature,
      reason: null,
      safetyScore: null,
      notes: t.notes ?? null,
      tag: t.tag ?? null,
      status: t.status,
      timestamp: t.createdAt.toISOString(),
    }));

    const rejectedEntries: HistoryEntry[] = skipped.map((s) => ({
      id: s.id,
      kind: "rejected",
      tokenMint: s.tokenMint,
      tokenSymbol: s.tokenSymbol,
      tokenName: s.tokenName,
      outcome: "REJECTED",
      amountSol: null,
      pnlUsd: null,
      txSignature: null,
      reason: s.reason,
      safetyScore: s.safetyScore ?? null,
      notes: null,
      tag: null,
      status: null,
      timestamp: s.detectedAt.toISOString(),
    }));

    const combined = [...tradeEntries, ...rejectedEntries]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    res.json(combined);
  } catch (err) {
    logger.error({ err }, "GET /history failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
