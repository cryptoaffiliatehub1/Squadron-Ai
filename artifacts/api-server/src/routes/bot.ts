import { Router } from "express";
import { startBot, stopBot, getBotState, getFullSystemState, restartScanner } from "../lib/bot";
import { getReadinessReport } from "../lib/systemReadiness";
import { getCircuitState, resetFortress, humanOverride, engageFortress } from "../lib/circuitBreaker";
import { getMoonbags, getTotalMoonbagValueSol, getMoonbagProtectionTiers } from "../lib/moonbagVault";
import { getScannerState } from "../lib/scanner";
import { getWatchdogState } from "../lib/watchdog";
import { getRegime } from "../lib/marketRegime";
import { getWalletState } from "../lib/walletWatcher";
import { isSystemAtRisk, getWeights } from "../lib/feedbackLoop";
import { stopBot as _stop } from "../lib/bot";
import { logger } from "../lib/logger";

const router = Router();

router.get("/bot/status", (_req, res) => {
  const state = getBotState();
  const wallet = getWalletState();
  const circuit = getCircuitState();
  const scanner = getScannerState();

  // Fix 8: scannerOnline = scanner has had at least one successful scan
  const scannerOnline = scanner.lastSuccessfulScan !== null;

  res.json({
    isRunning: state.isRunning,
    scannerOnline,                                    // Fix 8: true when triple-radar is scanning
    capitalRulePct: 20,
    safetyFilter: "Good",
    tradesExecutedToday: state.tradesExecutedToday,
    lastActivity: state.lastActivity ? state.lastActivity.toISOString() : null,
    walletConfigured: !!process.env["SOLANA_PRIVATE_KEY"] || !!process.env["PRIVATE_KEY"],
    heliusConfigured: !!process.env["HELIUS_API_KEY"] || !!process.env["HELIUS_KEY"],
    paperMode: (require("../lib/tradingMode") as { isPaperMode: () => boolean }).isPaperMode(),
    walletStatus: wallet.status,
    circuitState: circuit.state,
    conservativeMode: circuit.conservativeMode,
    dailyGainPct: circuit.dailyGainPct,
    network: "mainnet",
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
  const scanner = getScannerState();
  res.json({
    isRunning: state.isRunning,
    scannerOnline: scanner.lastSuccessfulScan !== null,
    tradesExecutedToday: state.tradesExecutedToday,
    lastActivity: state.lastActivity ? state.lastActivity.toISOString() : null,
  });
});

router.get("/system/status", (_req, res) => {
  res.json(getFullSystemState());
});

router.get("/system/readiness", (_req, res) => {
  res.json(getReadinessReport());
});

router.post("/system/kill-switch", (req, res) => {
  logger.warn("KILL SWITCH ACTIVATED — stopping all trading activity");
  stopBot();
  engageFortress("Manual kill switch activated by operator");
  res.json({ success: true, message: "Kill switch engaged — all positions halted, scanner stopped" });
});

router.post("/system/reset-fortress", (_req, res) => {
  resetFortress();
  res.json({ success: true, message: "Fortress reset — manual confirmation accepted" });
});

router.post("/system/human-override", (_req, res) => {
  humanOverride();
  res.json({ success: true, message: "Human override recorded — 2-hour psychological lockout active" });
});

router.get("/moonbags", (_req, res) => {
  const moonbags = getMoonbags();
  const tiers = getMoonbagProtectionTiers();
  res.json({
    count: moonbags.length,
    totalValueSol: getTotalMoonbagValueSol(),
    positions: moonbags.map((m) => ({
      ...m,
      protectionTier: tiers.get(m.id) ?? "HOLD",
    })),
  });
});

router.get("/regime", (_req, res) => {
  res.json(getRegime());
});

router.get("/circuit", (_req, res) => {
  res.json(getCircuitState());
});

router.get("/scanner/status", (_req, res) => {
  res.json(getScannerState());
});

router.get("/watchdog/status", (_req, res) => {
  res.json(getWatchdogState());
});

router.get("/weights", (_req, res) => {
  res.json({ weights: getWeights(), systemAtRisk: isSystemAtRisk() });
});

// C1: POST /api/bot/restart — re-initialises scanner without stopping the bot
router.post("/bot/restart", (_req, res) => {
  logger.info("BOT RESTART requested via API — restarting scanner");
  restartScanner();
  const state = getBotState();
  const scanner = getScannerState();
  res.json({
    success: true,
    message: "Scanner restart initiated — AUTO-RESTART sequence active",
    isRunning: state.isRunning,
    scannerOnline: scanner.lastSuccessfulScan !== null,
  });
});

export default router;
