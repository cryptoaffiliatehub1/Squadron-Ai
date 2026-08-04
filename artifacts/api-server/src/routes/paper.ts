import { Router } from "express";
import { getPaperTrades, generateDailyReport, readDailyReport, getSimBalanceFull } from "../lib/paperTrading";
import { logger } from "../lib/logger";

const router = Router();

// Normalize probabilityScore: old data stored it as an object {score,breakdown,...};
// new data stores it as a plain integer. Coerce to integer for the frontend.
function normalizeScore(raw: unknown): number {
  if (typeof raw === "number") return Math.round(raw);
  if (raw && typeof raw === "object" && typeof (raw as any).score === "number") {
    return Math.round((raw as any).score);
  }
  return 0;
}

router.get("/paper/trades", (_req, res) => {
  try {
    const trades = getPaperTrades().map((t) => ({
      ...t,
      probabilityScore: normalizeScore(t.probabilityScore),
    }));
    res.json(trades);
  } catch (err) {
    logger.error({ err }, "GET /paper/trades failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/paper/report", (_req, res) => {
  try {
    const report = readDailyReport() ?? generateDailyReport();
    res.json(report);
  } catch (err) {
    logger.error({ err }, "GET /paper/report failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/paper/generate-report", (_req, res) => {
  try {
    const report = generateDailyReport();
    res.json(report);
  } catch (err) {
    logger.error({ err }, "POST /paper/generate-report failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// C2: GET /sim/balance — complete simulated balance snapshot
router.get("/sim/balance", (_req, res) => {
  try {
    res.json(getSimBalanceFull());
  } catch (err) {
    logger.error({ err }, "GET /sim/balance failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
