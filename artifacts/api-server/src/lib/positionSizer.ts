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
const PAPER_ENTRY_PCT = 20;

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

export function calculatePaperPositionSizeAtBalance(
  simBalanceUsd: number,
  solPriceUsd: number,
  probabilityScore: number,
): PositionSize {
  const safeBalance = Math.max(0, Number(simBalanceUsd) || 0);
  const amountUsd = safeBalance * (PAPER_ENTRY_PCT / 100);
  const amountSol = solPriceUsd > 0 ? amountUsd / solPriceUsd : 0;
  const pScore = Math.min(Math.max(probabilityScore, 0), 100);
  return {
    amountSol,
    amountUsd,
    pctOfWallet: PAPER_ENTRY_PCT,
    regimeMultiplier: 1,
    probabilityScore: pScore,
    cappedByRule: true,
    reason: `Paper mode: exactly ${PAPER_ENTRY_PCT}% of current sim balance ($${safeBalance.toFixed(2)})`,
  };
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
  if (paperMode) {
    const { getSimBalance } = require("./paperTrading") as {
      getSimBalance: () => { currentBalanceUsd: number };
    };
    const simUsd = getSimBalance().currentBalanceUsd;
    const result = calculatePaperPositionSizeAtBalance(simUsd, solPriceUsd, probabilityScore);
    logger.info(result, "[POSITION_SIZER] Calculated exact paper entry size");
    console.log(
      `POSITION SIZER: PAPER sim_usd=$${simUsd.toFixed(2)} | entry_pct=${PAPER_ENTRY_PCT}% → $${result.amountUsd.toFixed(2)} (${result.amountSol.toFixed(4)}SOL)`,
    );
    return result;
  } else {
    const effectiveBalance = walletBalanceSol;
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
      `POSITION SIZER: SOL@$${solPriceUsd.toFixed(2)} | wallet=${effectiveBalance.toFixed(4)}SOL | score=${pScore} | ${regime.regime}×${regimeMultiplier} → $${amountUsd.toFixed(2)} (${amountSol.toFixed(4)}SOL)`,
    );
    return result;
  }
}
