import { Router } from "express";
import { startBot, stopBot, getBotState } from "../lib/bot";
import { logger } from "../lib/logger";

const router = Router();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const HELIUS_KEY = process.env.HELIUS_KEY;

router.get("/bot/status", (req, res) => {
  const state = getBotState();
  res.json({
    isRunning: state.isRunning,
    capitalRulePct: 20,
    safetyFilter: "Good",
    tradesExecutedToday: state.tradesExecutedToday,
    lastActivity: state.lastActivity ? state.lastActivity.toISOString() : null,
    walletConfigured: !!PRIVATE_KEY,
    helisConfigured: !!HELIUS_KEY,
  });
});

router.post("/bot/toggle", (req, res) => {
  const { running } = req.body;
  if (typeof running !== "boolean") {
    return res.status(400).json({ error: "running (boolean) is required" });
  }

  if (running) {
    startBot();
  } else {
    stopBot();
  }

  const state = getBotState();
  res.json({
    isRunning: state.isRunning,
    capitalRulePct: 20,
    safetyFilter: "Good",
    tradesExecutedToday: state.tradesExecutedToday,
    lastActivity: state.lastActivity ? state.lastActivity.toISOString() : null,
    walletConfigured: !!PRIVATE_KEY,
    helisConfigured: !!HELIUS_KEY,
  });
});

export default router;
