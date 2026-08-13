import { Router } from "express";
import {
  getPaperTrades,
  generateDailyReport,
  readDailyReport,
  getSimBalanceFull,
  sellPaperTrade,
  applyOneTimeCapitalInjection,
  getSimCapitalBreakdown,
  getPaperTradeLog,
  recordPaperTrade,
  getSimBalance,
  bulkSellPaperTrades,
  type BulkSellScope,
} from "../lib/paperTrading";
import { calculatePaperPositionSizeAtBalance } from "../lib/positionSizer";
import { getWalletState } from "../lib/walletWatcher";
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

// Test-only fixture creator used for live API verification. It goes through
// the same persisted PaperTrade store as a bot entry, without requiring a
// real wallet balance or an external token scan to pass at test time.
router.post("/test/paper-open", (_req, res) => {
  try {
    const entryBalanceUsd = getSimBalance().currentBalanceUsd;
    const solPriceUsd = getWalletState().solPriceUsd || 150;
    const sizing = calculatePaperPositionSizeAtBalance(entryBalanceUsd, solPriceUsd, 80);
    const id = `proof_sell_${Date.now()}`;
    const entryPrice = 1;
    recordPaperTrade({
      id,
      tokenMint: "So11111111111111111111111111111111111111112",
      tokenSymbol: "PROOF",
      tokenName: "Paper Sell Proof",
      type: "buy",
      amountSol: sizing.amountSol,
      positionSizeUsd: sizing.amountUsd,
      tier: "PROOF",
      entryPrice,
      exitPrice: null,
      pnlSol: null,
      pnlUsd: null,
      filtersPassedCount: 1,
      filtersFailedCount: 0,
      filterDetails: { controlledProof: true },
      probabilityScore: 80,
      regime: "PROOF",
      timestamp: new Date().toISOString(),
      exitTimestamp: null,
    });
    const trade = getPaperTrades().find((t) => t.id === id);
    if (!trade) return res.status(409).json({ error: "Could not create controlled paper position" });
    return res.json({
      success: true,
      trade,
      entryBalanceUsd,
      positionSizeUsd: sizing.amountUsd,
      entryPct: entryBalanceUsd > 0 ? sizing.amountUsd / entryBalanceUsd * 100 : 0,
    });
  } catch (err) {
    logger.error({ err }, "POST /test/paper-open failed");
    return res.status(500).json({ error: "Controlled paper position creation failed" });
  }
});

// Canonical paper sell route. The frontend must call this JSON endpoint rather
// than a UI path, otherwise the web server returns index.html (<!DOCTYPE...).
router.post("/paper/trades/:id/sell", (req, res) => {
  try {
    const sellPct = Number(req.body?.sellPct ?? req.body?.percentage);
    const requestedPrice = req.body?.sellPrice ?? req.body?.price;
    const result = sellPaperTrade(req.params.id, sellPct, requestedPrice == null ? undefined : Number(requestedPrice));
    res.json({
      success: true,
      route: "POST /api/paper/trades/:id/sell",
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Paper sell failed";
    logger.warn({ err, tradeId: req.params.id }, "POST /paper/trades/:id/sell failed");
    const status = /not found/i.test(message) ? 404 : /not open|invalid|must be|no more/i.test(message) ? 400 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

router.post("/sim/bulk-sell", async (req, res) => {
  try {
    const scope = req.body?.scope as BulkSellScope;
    const sellPct = Number(req.body?.sellPct ?? req.body?.percentage);
    const result = await bulkSellPaperTrades(scope, sellPct);
    return res.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bulk paper sell failed";
    logger.warn({ err }, "POST /sim/bulk-sell failed");
    return res.status(/no positions/i.test(message) ? 400 : 500).json({ success: false, error: message });
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

// Idempotent Batch 1 simulation funding operation.
router.post("/sim/capital-injection", (_req, res) => {
  try {
    res.json({ success: true, ...applyOneTimeCapitalInjection(), balance: getSimBalanceFull() });
  } catch (err) {
    logger.error({ err }, "POST /sim/capital-injection failed");
    res.status(500).json({ error: "Capital injection failed" });
  }
});

router.get("/sim/capital", (_req, res) => {
  res.json(getSimCapitalBreakdown());
});

router.get("/paper/log", (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit ?? 50) || 50, 1), 500);
  res.json(getPaperTradeLog(limit));
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
