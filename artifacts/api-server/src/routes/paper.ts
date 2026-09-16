import { Router } from "express";
import {
  getPaperTrades,
  generateDailyReport,
  readDailyReport,
  getSimBalanceFull,
  getPaperStats,
  getMoonbagsWithPrices,
  sellPaperTrade,
  bulkSellPaperTrades,
  addCapitalInjection,
  getCapitalSummary,
} from "../lib/paperTrading";
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

router.get("/paper/history", (_req, res) => {
  try {
    const stats = getPaperStats();
    const trades = getPaperTrades()
      .sort((a, b) => new Date(b.exitTimestamp ?? b.timestamp).getTime() - new Date(a.exitTimestamp ?? a.timestamp).getTime());
    res.json({ trades, ...stats, capital: getCapitalSummary() });
  } catch (err) {
    logger.error({ err }, "GET /paper/history failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/paper/moonbags", async (_req, res) => {
  try {
    res.json(await getMoonbagsWithPrices());
  } catch (err) {
    logger.error({ err }, "GET /paper/moonbags failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/paper/sell", (req, res) => {
  try {
    const percentage = Number(req.body?.percentage);
    const scope = req.body?.scope as "open" | "moonbags" | "all" | undefined;
    if (req.body?.id) {
      return res.json({
        trades: sellPaperTrade(String(req.body.id), percentage),
        sold: [String(req.body.id)],
        errors: [],
      });
    }
    if (!scope || !["open", "moonbags", "all"].includes(scope)) {
      return res.status(400).json({ error: "scope must be open, moonbags, or all" });
    }
    return res.json(bulkSellPaperTrades(scope, percentage));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sell failed";
    logger.warn({ err }, "POST /paper/sell failed");
    return res.status(400).json({ error: message });
  }
});

router.post("/paper/capital-injection", (req, res) => {
  try {
    const injection = addCapitalInjection(Number(req.body?.amountUsd), req.body?.note);
    res.json({ injection, capital: getCapitalSummary(), balance: getSimBalanceFull() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Capital injection failed";
    logger.warn({ err }, "POST /paper/capital-injection failed");
    res.status(400).json({ error: message });
  }
});

router.get("/paper/report", (_req, res) => {
  try {
    const stored = readDailyReport();
    const report = stored?.allTime && stored?.today ? stored : generateDailyReport();
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
