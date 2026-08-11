
import OpenAI from "openai";
import { logger } from "./logger";

function getClient(): OpenAI | null {
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) {
    logger.warn("OPENROUTER_API_KEY not set — AI analyst is in dry-run mode");
    return null;
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://squadron-ai.replit.app",
      "X-Title": "Squadron AI Bot",
    },
  });
}

export type SentimentVerdict = "BULLISH" | "BEARISH" | "NEUTRAL" | "UNKNOWN";

export interface SentimentResult {
  verdict: SentimentVerdict;
  confidence: number;
  summary: string;
  rawResponse?: string;
  usedAi: boolean;
}

export interface TokenContext {
  tokenMint?: string;
  liquidityUsd?: number;
  volume24h?: number;
  priceChangePercent24h?: number;
  holderCount?: number;
  topHolderPct?: number;
  isNew?: boolean;
  isTrending?: boolean;
  isBoosted?: boolean;
}

export async function analyzeTokenSentiment(
  tokenSymbol: string,
  tokenName: string,
  context: TokenContext = {},
): Promise<SentimentResult> {
  const client = getClient();

  if (!client) {
    return {
      verdict: "UNKNOWN",
      confidence: 0,
      summary: "AI analyst offline — OPENROUTER_API_KEY not configured.",
      usedAi: false,
    };
  }

  const contextLines: string[] = [];
  if (context.liquidityUsd !== undefined) contextLines.push(`- Liquidity: $${context.liquidityUsd.toLocaleString()}`);
  if (context.volume24h !== undefined) contextLines.push(`- 24h Volume: $${context.volume24h.toLocaleString()}`);
  if (context.priceChangePercent24h !== undefined) contextLines.push(`- 24h Price Change: ${context.priceChangePercent24h.toFixed(2)}%`);
  if (context.holderCount !== undefined) contextLines.push(`- Holder Count: ${context.holderCount}`);
  if (context.topHolderPct !== undefined) contextLines.push(`- Top 10 Holders: ${context.topHolderPct.toFixed(1)}%`);
  if (context.isNew) contextLines.push(`- Token is NEW (launched within last hour)`);
  if (context.isTrending) contextLines.push(`- Appearing on DEX Screener trending list`);
  if (context.isBoosted) contextLines.push(`- Has active DEX Screener boost`);

  const prompt = `You are a meme coin trading analyst. Analyze this Solana token and give a sentiment verdict.

Token: ${tokenSymbol} (${tokenName})
${contextLines.join("\n")}

Respond with JSON only:
{
  "verdict": "BULLISH" | "BEARISH" | "NEUTRAL",
  "confidence": 0-100,
  "summary": "one sentence reasoning"
}`;

  try {
    const completion = await client.chat.completions.create({
      model: "meta-llama/llama-3.1-8b-instruct:free",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 150,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    return {
      verdict: parsed.verdict ?? "NEUTRAL",
      confidence: parsed.confidence ?? 50,
      summary: parsed.summary ?? "No summary provided.",
      rawResponse: raw,
      usedAi: true,
    };
  } catch (err) {
    logger.error({ err, tokenSymbol }, "AI analyst request failed");
    return {
      verdict: "UNKNOWN",
      confidence: 0,
      summary: "AI analysis failed.",
      usedAi: false,
    };
  }
}
