import { logger } from "./logger";
import { getSolBalance, getWalletPublicKey, getRpcUrl } from "./solana";
import { initializeBalances, updateBalance } from "./circuitBreaker";
import { sendAlert } from "./reporting";
import { isPaperMode } from "./tradingMode";
import { initSessionDay, updateCurrentBalance } from "./sessionStats";

// ── Thresholds ──────────────────────────────────────────────────────────────
// Min balance to activate bot (user requirement: 0.005 SOL)
const MIN_BALANCE_FOR_START = 0.005;
const LOW_BALANCE_WARN = 0.005;
const LOW_BALANCE_RESUME = 0.006;
// Low-balance alert throttle: max once per 6 hours
const LOW_BALANCE_ALERT_INTERVAL_MS = 6 * 60 * 60 * 1000;

export type WalletWatcherStatus =
  | "WAITING_FOR_FUNDS"
  | "STARTING_UP"
  | "ACTIVE"
  | "LOW_BALANCE"
  | "NO_WALLET";

interface WalletState {
  status: WalletWatcherStatus;
  solBalance: number;
  usdBalance: number;
  walletAddress: string | null;
  lastChecked: Date | null;
  activated: boolean;
  solPriceUsd: number;
  waitingMessage: string;
}

const state: WalletState = {
  status: "WAITING_FOR_FUNDS",
  solBalance: 0,
  usdBalance: 0,
  walletAddress: null,
  lastChecked: null,
  activated: false,
  solPriceUsd: 150,
  waitingMessage: "WAITING FOR FUNDS — Deposit SOL to activate Squadron AI",
};

let onActivate: (() => Promise<void>) | null = null;
let watchInterval: ReturnType<typeof setInterval> | null = null;
let lastLowBalanceAlertAt: number | null = null;

async function fetchSolPrice(): Promise<number> {
  try {
    const { default: axios } = await import("axios");
    const resp = await axios.get<{ data: Record<string, { price: number }> }>(
      "https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112",
      { timeout: 5000 },
    );
    return resp.data?.data?.["So11111111111111111111111111111111111111112"]?.price ?? 150;
  } catch {
    return state.solPriceUsd;
  }
}

// ── Cold-start connection test ───────────────────────────────────────────────
async function runColdStartConnectionTest(walletAddress: string): Promise<void> {
  logger.info("[COLD_START] Running connection test...");
  try {
    // Verify which RPC we're using
    const rpcUrl = getRpcUrl();
    const maskedRpc = rpcUrl.replace(/api-key=[^&]+/, "api-key=***");
    logger.info({ rpc: maskedRpc }, "[COLD_START] RPC endpoint resolved");

    // Verify balance is readable
    const bal = await getSolBalance(walletAddress);
    logger.info(
      { balance: bal.toFixed(6) + " SOL" },
      "[COLD_START] ✓ RPC connection OK — wallet balance confirmed",
    );
  } catch (err) {
    logger.warn({ err }, "[COLD_START] RPC test FAILED — bot will attempt to start anyway");
  }
}

async function checkWallet(): Promise<void> {
  const walletAddress = getWalletPublicKey();
  if (!walletAddress) {
    state.status = "NO_WALLET";
    return;
  }

  state.walletAddress = walletAddress;
  state.lastChecked = new Date();

  const [solBalance, solPrice] = await Promise.all([
    getSolBalance(walletAddress).catch(() => 0),
    fetchSolPrice(),
  ]);

  state.solBalance = solBalance;
  state.solPriceUsd = solPrice;
  state.usdBalance = solBalance * solPrice;

  // Keep sessionStats balance in sync for reporting
  updateCurrentBalance(solBalance, solPrice);
  updateBalance(solBalance);

  // ── Low balance during active trading ──────────────────────────────────────
  if (solBalance < LOW_BALANCE_WARN && state.activated) {
    const wasAlreadyLow = state.status === "LOW_BALANCE";
    state.status = "LOW_BALANCE";
    state.waitingMessage = `LOW BALANCE — Pause active. Deposit SOL to resume (${solBalance.toFixed(6)} SOL)`;

    // Alert at most once per 6 hours
    const now = Date.now();
    if (!wasAlreadyLow || !lastLowBalanceAlertAt || now - lastLowBalanceAlertAt > LOW_BALANCE_ALERT_INTERVAL_MS) {
      lastLowBalanceAlertAt = now;
      logger.warn({ solBalance }, "LOW SOL BALANCE — pausing new entries only. Existing positions not closed.");
      await sendAlert(
        "⚠️ LOW SOL BALANCE",
        `Balance dropped to ${solBalance.toFixed(6)} SOL ($${state.usdBalance.toFixed(2)})\nNew entries paused. Existing positions remain open.\nDeposit SOL to resume trading.`,
      ).catch(() => {});
    }
    return;
  }

  // ── Recovered from low balance ─────────────────────────────────────────────
  if (state.status === "LOW_BALANCE" && solBalance >= LOW_BALANCE_RESUME) {
    state.status = "ACTIVE";
    state.waitingMessage = "";
    logger.info({ solBalance }, "Balance recovered — resuming new entries");
    return;
  }

  // ── First activation ───────────────────────────────────────────────────────
  if (!state.activated) {
    if (solBalance < MIN_BALANCE_FOR_START) {
      state.status = "WAITING_FOR_FUNDS";
      state.waitingMessage = `WAITING FOR FUNDS — Deposit SOL to activate Squadron AI (need ${MIN_BALANCE_FOR_START} SOL, have ${solBalance.toFixed(6)})`;
      logger.info({ solBalance, required: MIN_BALANCE_FOR_START }, "WAITING FOR FUNDS — Deposit SOL to activate Squadron AI");
    } else {
      state.status = "STARTING_UP";
      state.activated = true;

      // Record starting balance in session stats and circuit breaker
      initSessionDay(solBalance, solPrice);
      initializeBalances(solBalance);

      logger.info({ solBalance }, "FUNDS DETECTED — Running cold-start connection test");

      // Cold-start RPC + wallet verification
      await runColdStartConnectionTest(walletAddress);

      if (onActivate) {
        await onActivate();
      }

      state.status = "ACTIVE";
      state.waitingMessage = "";

      const isPaper = isPaperMode();
      const activationMsg = [
        `Squadron AI is now ${isPaper ? "PAPER TRADING" : "LIVE"} 🚀`,
        `Starting balance: ${solBalance.toFixed(4)} SOL ($${state.usdBalance.toFixed(2)})`,
        `RPC: ${getRpcUrl().includes("helius") ? "Helius (premium)" : "Public"}`,
        `Mode: ${isPaper ? "SIMULATION — no real trades" : "LIVE — real trades active"}`,
      ].join("\n");

      logger.info({ solBalance, mode: isPaper ? "paper" : "live" }, "Squadron AI activated");

      await sendAlert("Squadron AI is now LIVE", activationMsg).catch(() => {});
    }
  }
}

export function startWalletWatcher(activateCallback?: () => Promise<void>): void {
  if (watchInterval) return;

  onActivate = activateCallback ?? null;

  checkWallet().catch((err) => logger.error({ err }, "Wallet watcher initial check failed"));

  // Poll every 10 seconds using SOLANA_MAINNET_RPC (resolved in solana.ts)
  watchInterval = setInterval(() => {
    checkWallet().catch((err) => logger.error({ err }, "Wallet watcher check failed"));
  }, 10_000);

  logger.info(
    { rpc: getRpcUrl().includes("helius") ? "Helius" : "Public", pollIntervalSec: 10 },
    "Wallet watcher started (10s polling via SOLANA_MAINNET_RPC)",
  );
}

export function stopWalletWatcher(): void {
  if (watchInterval) {
    clearInterval(watchInterval);
    watchInterval = null;
  }
}

export function getWalletState(): WalletState {
  return { ...state };
}
