import { getMultiplier, getRegime } from "./marketRegime";
import { logger } from "./logger";

export interface PositionSize {
  amountSol: number;
  amountUsd: number;
  pctOfWallet: number;
  regimeMultiplier: number;
  probabilityScore: number;
  cappedByRule: boolean;
  reason: string;
}

const MAX_OPEN_POSITIONS = 3;
const EXACT_ENTRY_PCT = 0.20;

let openPositionsCount = 0;

export function getOpenPositionCount(): number {
  return openPositionsCount;
}

export function incrementOpenPositions(): void {
  openPositionsCount = Math.min(openPositionsCount + 1, MAX_OPEN_POSITIONS);
}

export function decrementOpenPositions(): void {
  openPositionsCount = Math.max(openPositionsCount - 1, 0);
}

export function canOpenNewPosition(): boolean {
  return openPositionsCount < MAX_OPEN_POSITIONS;
}

export function calculatePositionSize(
  walletBalanceSol: number,
  solPriceUsd: number,
  probabilityScore: number,
): PositionSize {
  const { isPaperMode } = require("./tradingMode") as { isPaperMode: () => boolean };
  const paperMode = isPaperMode();

  // The USD allocation is always exactly 20% of available cash. SOL is only
  // the execution-unit conversion and must not influence the USD allocation.
  let availableCashUsd: number;
  if (paperMode) {
    const { getAvailableCashUsd } = require("./paperTrading") as {
      getAvailableCashUsd: () => number;
    };
    const simUsd = getAvailableCashUsd();
    availableCashUsd = Number.isFinite(simUsd) && simUsd > 0 ? simUsd : 0;
  } else {
    const walletUsd = walletBalanceSol * solPriceUsd;
    availableCashUsd = Number.isFinite(walletUsd) && walletUsd > 0 ? walletUsd : 0;
  }

  const regime = getRegime();
  const regimeMultiplier = getMultiplier();
  const pScore = Math.min(Math.max(probabilityScore, 0), 100);
  const amountUsd = availableCashUsd * EXACT_ENTRY_PCT;
  const amountSol = solPriceUsd > 0 ? amountUsd / solPriceUsd : 0;

  const result: PositionSize = {
    amountSol,
    amountUsd,
    pctOfWallet: EXACT_ENTRY_PCT * 100,
    regimeMultiplier,
    probabilityScore: pScore,
    cappedByRule: false,
    reason: `Exact 20% of available cash (${regime.regime} context; score ${pScore} is eligibility metadata)`,
  };

  logger.info(result, "[POSITION_SIZER] Calculated entry size");
  console.log(
    `POSITION SIZER: SOL@$${solPriceUsd.toFixed(2)} | ${
      paperMode
        ? `sim_cash=$${availableCashUsd.toFixed(2)}`
        : `wallet_cash=$${availableCashUsd.toFixed(2)}`
    } | exact_pct=20.00% | score=${pScore} | ${regime.regime}×${regimeMultiplier} → $${amountUsd.toFixed(2)} (${amountSol.toFixed(4)}SOL)`,
  );
  return result;
}
