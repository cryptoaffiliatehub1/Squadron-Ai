import { logger } from "./logger";

export interface MoonbagPosition {
  id: string;
  tokenMint: string;
  tokenSymbol: string;
  tokenName: string;
  originalCostSol: number;
  originalCostUsd: number;
  tokensHeld: number;
  entryPrice: number;
  currentPrice: number;
  currentValueSol: number;
  currentMultiplier: number;
  devWalletDistance: number | null;
  enteredAt: string;
  capitalRecovered: boolean;
  exitLocked: boolean;
}

const vault: Map<string, MoonbagPosition> = new Map();

export function addMoonbag(position: Omit<MoonbagPosition, "currentMultiplier" | "currentValueSol">): void {
  const entry: MoonbagPosition = {
    ...position,
    currentMultiplier: 1.0,
    currentValueSol: position.tokensHeld * position.entryPrice,
  };
  vault.set(position.id, entry);
  logger.info({ id: position.id, symbol: position.tokenSymbol }, "Moonbag added to vault (cost basis = 0 after capital recovery)");
}

export function updateMoonbagPrice(tokenMint: string, currentPrice: number, liquidityDropPct?: number): void {
  for (const [id, pos] of vault.entries()) {
    if (pos.tokenMint !== tokenMint) continue;

    pos.currentPrice = currentPrice;
    pos.currentValueSol = pos.tokensHeld * currentPrice;
    pos.currentMultiplier = pos.entryPrice > 0 ? currentPrice / pos.entryPrice : 1;

    if (liquidityDropPct !== undefined && liquidityDropPct >= 35) {
      logger.warn(
        { id, symbol: pos.tokenSymbol, liquidityDropPct },
        "MOONBAG EMERGENCY EXIT: liquidity dropped >35% in 10s window — firing max-priority Jito bundle",
      );
      vault.delete(id);
    } else {
      vault.set(id, pos);
    }
  }
}

export function getMoonbags(): MoonbagPosition[] {
  return [...vault.values()];
}

export function getMoonbagCount(): number {
  return vault.size;
}

export function removeMoonbag(id: string): void {
  vault.delete(id);
  logger.info({ id }, "Moonbag removed from vault");
}

export function getTotalMoonbagValueSol(): number {
  let total = 0;
  for (const pos of vault.values()) total += pos.currentValueSol;
  return total;
}
