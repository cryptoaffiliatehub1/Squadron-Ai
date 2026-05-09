import { Router } from "express";
import { getPaperTrades, generateDailyReport, readDailyReport } from "../lib/paperTrading";
import { logger } from "../lib/logger";

const router = Router();

router.get("/paper/trades", (_req, res) => {
  try {
    res.json(getPaperTrades());
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

export default router;
