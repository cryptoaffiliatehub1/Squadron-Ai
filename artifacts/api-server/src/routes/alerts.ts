import { Router } from "express";
import { db, priceAlertsTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

function serializeAlert(a: typeof priceAlertsTable.$inferSelect) {
  return {
    id: a.id,
    tokenMint: a.tokenMint,
    tokenSymbol: a.tokenSymbol,
    tokenName: a.tokenName,
    targetPrice: Number(a.targetPrice),
    direction: a.direction,
    isTriggered: a.isTriggered,
    triggeredAt: a.triggeredAt ? a.triggeredAt.toISOString() : null,
    currentPrice: null as number | null,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/alerts", async (req, res) => {
  try {
    const alerts = await db
      .select()
      .from(priceAlertsTable)
      .orderBy(desc(priceAlertsTable.createdAt));

    const { getPriceCacheForAlerts } = await import("../lib/alertChecker");
    const priceMap = getPriceCacheForAlerts();

    res.json(
      alerts.map((a) => ({
        ...serializeAlert(a),
        currentPrice: priceMap[a.tokenMint] ?? null,
      })),
    );
  } catch (err) {
    logger.error({ err }, "GET /alerts failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/alerts", async (req, res) => {
  try {
    const { tokenMint, tokenSymbol, tokenName, targetPrice, direction } = req.body;
    if (!tokenMint || !tokenSymbol || !tokenName || !targetPrice || !direction) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [created] = await db
      .insert(priceAlertsTable)
      .values({
        tokenMint,
        tokenSymbol,
        tokenName,
        targetPrice: String(targetPrice),
        direction,
      })
      .returning();

    return res.status(201).json(serializeAlert(created));
  } catch (err) {
    logger.error({ err }, "POST /alerts failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/alerts/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    await db.delete(priceAlertsTable).where(eq(priceAlertsTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "DELETE /alerts failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
