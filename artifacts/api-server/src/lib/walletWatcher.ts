import { logger } from "./logger";
import { getSolBalance, getWalletPublicKey } from "./solana";
import { initializeBalances, updateBalance } from "./circuitBreaker";
import { sendAlert } from "./reporting";

const MIN_BALANCE_FOR_START = 0.00005;
const LOW_BALANCE_WARN = 0.001;
const LOW_BALANCE_RESUME = 0.002;

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
}

const state: WalletState = {
  status: "WAITING_FOR_FUNDS",
  solBalance: 0,
  usdBalance: 0,
  walletAddress: null,
  lastChecked: null,
  activated: false,
  solPriceUsd: 150,
};

let onActivate: (() => Promise<void>) | null = null;
let watchInterval: ReturnType<typeof setInterval> | null = null;

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

  updateBalance(solBalance);

  if (solBalance < LOW_BALANCE_WARN && state.activated) {
    const wasAlreadyLow = state.status === "LOW_BALANCE";
    state.status = "LOW_BALANCE";
    if (!wasAlreadyLow) {
      logger.warn({ solBalance }, "LOW SOL BALANCE — pausing new entries. Please top up to resume.");
      await sendAlert(
        "LOW SOL BALANCE WARNING",
        `LOW SOL BALANCE — Jito tips may fail. Please top up your wallet. Current: ${solBalance.toFixed(6)} SOL`,
      ).catch(() => {});
    }
    return;
  }

  if (state.status === "LOW_BALANCE" && solBalance >= LOW_BALANCE_RESUME) {
    state.status = "ACTIVE";
    logger.info("Balance recovered — resuming entries");
    return;
  }

  if (!state.activated) {
    if (solBalance < MIN_BALANCE_FOR_START) {
      state.status = "WAITING_FOR_FUNDS";
      logger.info({ solBalance }, "WAITING FOR FUNDS — Deposit SOL to activate Squadron AI");
    } else {
      state.status = "STARTING_UP";
      state.activated = true;
      initializeBalances(solBalance);

      logger.info({ solBalance }, "FUNDS DETECTED — Running System Readiness Check");

      if (onActivate) {
        await onActivate();
      }

      state.status = "ACTIVE";

      const isPaper = process.env["PAPER_TRADE"] !== "false";
      await sendAlert(
        "Squadron AI is now LIVE",
        `Squadron AI is now ${isPaper ? "PAPER TRADING" : "LIVE"} — Starting balance: ${solBalance.toFixed(4)} SOL ($${state.usdBalance.toFixed(2)})`,
      ).catch(() => {});
    }
  }
}

export function startWalletWatcher(activateCallback?: () => Promise<void>): void {
  if (watchInterval) return;

  onActivate = activateCallback ?? null;

  checkWallet().catch((err) => logger.error({ err }, "Wallet watcher initial check failed"));

  watchInterval = setInterval(() => {
    checkWallet().catch((err) => logger.error({ err }, "Wallet watcher check failed"));
  }, 10_000);

  logger.info("Wallet watcher started (10s polling)");
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
