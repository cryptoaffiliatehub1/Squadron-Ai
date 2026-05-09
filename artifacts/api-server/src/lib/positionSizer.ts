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
  const isPaper = process.env["PAPER_TRADE"] !== "false";
  const effectiveBalance = isPaper ? PAPER_TRADE_SOL : walletBalanceSol;

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
  return result;
}
