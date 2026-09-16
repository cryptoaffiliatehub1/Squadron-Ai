import { getMultiplier, getRegime } from "./marketRegime";
import { getMaxEntryPct, getCircuitState } from "./circuitBreaker";
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
const PAPER_TRADE_SOL = 1.0;

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

  // In paper mode: scale off live sim balance (USD→SOL via live price) so position
  // sizing reflects actual portfolio growth AND uses the real SOL price each entry.
  let effectiveBalance: number;
  if (paperMode) {
    const { getSimBalance } = require("./paperTrading") as {
      getSimBalance: () => { currentBalanceUsd: number };
    };
    const simUsd = getSimBalance().currentBalanceUsd;
    effectiveBalance = solPriceUsd > 0 && simUsd > 0 ? simUsd / solPriceUsd : PAPER_TRADE_SOL;
  } else {
    effectiveBalance = walletBalanceSol;
  }

  const regime = getRegime();
  const regimeMultiplier = getMultiplier();
  const maxPct = getMaxEntryPct();
  const pScore = Math.min(Math.max(probabilityScore, 0), 100);

  const rawPct = (pScore / 100) * regimeMultiplier * 100;
  const cappedPct = Math.min(rawPct, maxPct);
  const cappedByRule = rawPct > maxPct;

  const amountSol = effectiveBalance * (cappedPct / 100);
  const amountUsd = amountSol * solPriceUsd;

  const result: PositionSize = {
    amountSol,
    amountUsd,
    pctOfWallet: cappedPct,
    regimeMultiplier,
    probabilityScore: pScore,
    cappedByRule,
    reason: cappedByRule ? `Capped at ${maxPct}% (20% rule or conservative mode)` : `Score ${pScore} × ${regime.regime} (${regimeMultiplier}×)`,
  };

  logger.info(result, "[POSITION_SIZER] Calculated entry size");
  console.log(
    `POSITION SIZER: SOL@$${solPriceUsd.toFixed(2)} | ${
      paperMode
        ? `sim_usd=$${(effectiveBalance * solPriceUsd).toFixed(2)}`
        : `wallet=${effectiveBalance.toFixed(4)}SOL`
    } | score=${pScore} | ${regime.regime}×${regimeMultiplier} → $${amountUsd.toFixed(2)} (${amountSol.toFixed(4)}SOL)`,
  );
  return result;
}
