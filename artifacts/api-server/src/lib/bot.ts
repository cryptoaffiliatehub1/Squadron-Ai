import { logger } from "./logger";
import { db, skippedTokensTable, detectedTokensTable } from "@workspace/db";
import { scanTrendingAndBoosted } from "./dexScreener";
import { filterTokenByRisk } from "./riskFilter";
import { analyzeTokenSentiment } from "./aiAnalyst";
import { getQuote } from "./jupiter";
import { eq } from "drizzle-orm";

export interface BotConfig {
  tradeAmountSol: number;
  maxOpenTrades: number;
  minLiquidityUsd: number;
  takeProfitPct: number;
  stopLossPct: number;
  useAiFilter: boolean;
  network: "mainnet" | "devnet";
}

export interface BotState {
  isRunning: boolean;
  tradesExecutedToday: number;
  lastActivity: Date | null;
}

export const DEFAULT_BOT_CONFIG: BotConfig = {
  tradeAmountSol: 0.1,
  maxOpenTrades: 5,
  minLiquidityUsd: 25_000,
  takeProfitPct: 50,
  stopLossPct: 20,
  useAiFilter: true,
  network: "mainnet",
};

let currentConfig: BotConfig = { ...DEFAULT_BOT_CONFIG };
let state: BotState = {
  isRunning: false,
  tradesExecutedToday: 0,
  lastActivity: null,
};
let botInterval: ReturnType<typeof setInterval> | null = null;

export function getBotConfig(): BotConfig {
  return { ...currentConfig };
}

export function getBotState(): BotState {
  return { ...state };
}

export function setBotConfig(config: Partial<BotConfig>): BotConfig {
  currentConfig = { ...currentConfig, ...config };
  return { ...currentConfig };
}

export function isBotRunning(): boolean {
  return state.isRunning;
}

async function botCycle(): Promise<void> {
  if (!state.isRunning) return;
  state.lastActivity = new Date();

  try {
    const tokens = await scanTrendingAndBoosted({
      minLiquidityUsd: currentConfig.minLiquidityUsd,
    });

    for (const token of tokens.slice(0, 5)) {
      const riskResult = await filterTokenByRisk(token.tokenMint);

      await db.insert(detectedTokensTable).values({
        tokenMint: token.tokenMint,
        tokenSymbol: token.tokenSymbol,
        tokenName: token.tokenName,
        safetyStatus: riskResult.passed ? "good" : "risky",
        liquidityUsd: token.liquidityUsd.toString(),
        mintRevoked: false,
        buyTxns5m: token.buyTxns5m,
        sellTxns5m: token.sellTxns5m,
      }).onConflictDoNothing();

      if (!riskResult.passed) {
        logger.info({ mint: token.tokenMint, reason: riskResult.reason }, "Bot: token failed risk filter");

        await db.insert(skippedTokensTable).values({
          tokenMint: token.tokenMint,
          tokenSymbol: token.tokenSymbol,
          tokenName: token.tokenName,
          reason: riskResult.reason ?? "Failed risk filter",
          safetyScore: String(riskResult.rugScore ?? 0),
        }).onConflictDoNothing();
        continue;
      }

      if (currentConfig.useAiFilter) {
        const sentiment = await analyzeTokenSentiment(token.tokenSymbol, token.tokenName, {
          liquidityUsd: token.liquidityUsd,
          volume24h: token.volume24h,
          priceChangePercent24h: token.priceChange24h,
          holderCount: riskResult.holderCount,
          topHolderPct: riskResult.topHolderPct,
          isTrending: token.isTrending,
          isBoosted: token.isBoosted,
        });

        if (sentiment.verdict === "BEARISH") {
          logger.info({ mint: token.tokenMint, sentiment }, "Bot: AI analyst bearish, skipping");
          continue;
        }
      }

      const quote = await getQuote(token.tokenMint, currentConfig.tradeAmountSol);
      if (!quote) continue;

      logger.info(
        { mint: token.tokenMint, symbol: token.tokenSymbol, solAmount: currentConfig.tradeAmountSol },
        "Bot: would execute buy (dry-run mode — wallet not connected)",
      );
      state.tradesExecutedToday++;
      state.lastActivity = new Date();
    }
  } catch (err) {
    logger.error({ err }, "Bot cycle error");
  }
}

export function startBot(): void {
  if (state.isRunning) return;
  state.isRunning = true;
  state.lastActivity = new Date();
  botCycle().catch(() => {});
  botInterval = setInterval(() => {
    botCycle().catch(() => {});
  }, 60_000);
  logger.info("Trading bot started");
}

export function stopBot(): void {
  state.isRunning = false;
  if (botInterval) {
    clearInterval(botInterval);
    botInterval = null;
  }
  logger.info("Trading bot stopped");
}
