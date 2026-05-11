import { Router } from "express";
import { getModeState, setTradingMode, isPaperMode } from "../lib/tradingMode";
import { getWalletState } from "../lib/walletWatcher";
import { sendModeChangeAlert } from "../lib/reporting";
import { logger } from "../lib/logger";

const router = Router();

router.get("/trading-mode", (_req, res) => {
  res.json(getModeState());
});

router.post("/trading-mode", async (req, res) => {
  const { mode } = req.body as { mode?: string };
  if (mode !== "paper" && mode !== "live") {
    return res.status(400).json({ error: "mode must be 'paper' or 'live'" });
  }

  const { previous, current } = setTradingMode(mode, "dashboard-toggle");

  if (previous !== current) {
    const wallet = getWalletState();
    sendModeChangeAlert(current, wallet.solBalance).catch((err) =>
      logger.warn({ err }, "Mode change notification failed"),
    );
  }

  res.json(getModeState());
});

export default router;
