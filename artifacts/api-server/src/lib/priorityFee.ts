
import { Connection } from "@solana/web3.js";
import { logger } from "./logger";
import { getConnection } from "./solana";

export async function getRecentPriorityFee(network: "mainnet" | "devnet" = "mainnet"): Promise<number> {
  try {
    const conn: Connection = getConnection(network);
    const fees = await conn.getRecentPrioritizationFees();
    if (!fees || fees.length === 0) return 5_000;
    const sorted = fees.map((f) => f.prioritizationFee).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length * 0.75)] ?? 5_000;
    return Math.max(1_000, Math.min(median, 1_000_000));
  } catch (err) {
    logger.warn({ err }, "Failed to fetch priority fee, using default 5000");
    return 5_000;
  }
}
