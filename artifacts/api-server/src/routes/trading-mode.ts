import { Router } from "express";
import { getModeState, setTradingMode } from "../lib/tradingMode";
import { getWalletState } from "../lib/walletWatcher";
import { sendModeChangeAlert } from "../lib/reporting";
import { logger } from "../lib/logger";

const router = Router();

const MIN_SOL_FOR_LIVE = 0.01;

// FIX 2: GET /api/trading-mode — returns mode + wallet balance
router.get("/trading-mode", (_req, res) => {
  const wallet = getWalletState();
  res.json({
    ...getModeState(),
    solBalance: wallet.solBalance,
    usdBalance: wallet.usdBalance,
    solPrice: wallet.solPriceUsd,
  });
});

// FIX 2: POST /api/trading-mode — validates 0.01 SOL min before allowing live
router.post("/trading-mode", async (req, res) => {
  const { mode } = req.body as { mode?: string };
  if (mode !== "paper" && mode !== "live") {
    return res.status(400).json({ error: "mode must be 'paper' or 'live'" });
  }

  if (mode === "live") {
    const wallet = getWalletState();
    if (wallet.solBalance < MIN_SOL_FOR_LIVE) {
      return res.status(400).json({
        error: `INSUFFICIENT_BALANCE`,
        message: `Minimum ${MIN_SOL_FOR_LIVE} SOL required to enable live trading. Current balance: ${wallet.solBalance.toFixed(6)} SOL`,
        solBalance: wallet.solBalance,
        required: MIN_SOL_FOR_LIVE,
      });
    }
  }

  const { previous, current } = setTradingMode(mode, "dashboard-toggle");

  if (previous !== current) {
    const wallet = getWalletState();
    sendModeChangeAlert(current, wallet.solBalance).catch((err) =>
      logger.warn({ err }, "Mode change notification failed"),
    );
  }

  const wallet2 = getWalletState();
  return res.json({
    ...getModeState(),
    solBalance: wallet2.solBalance,
    usdBalance: wallet2.usdBalance,
    solPrice: wallet2.solPriceUsd,
  });
});

export default router;
