
import axios from "axios";
import { logger } from "./logger";

const JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6";
const SOL_MINT = "So11111111111111111111111111111111111111112";
const LAMPORTS_PER_SOL = 1_000_000_000;

export interface SwapResult {
  txSignature: string;
  amountIn: number;
  amountOut: number;
  success: boolean;
  error?: string;
}

export async function getQuote(
  outputMint: string,
  solAmount: number,
): Promise<{ outAmount: number; quote: unknown } | null> {
  try {
    const inputLamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
    const resp = await axios.get(`${JUPITER_QUOTE_API}/quote`, {
      params: {
        inputMint: SOL_MINT,
        outputMint,
        amount: inputLamports,
        slippageBps: 100,
      },
      timeout: 8000,
    });
    const quote = resp.data;
    const outAmount = Number(quote.outAmount ?? 0);
    return { outAmount, quote };
  } catch (err) {
    logger.error({ err, outputMint }, "Jupiter quote failed");
    return null;
  }
}

export async function executeSwap(
  walletPublicKey: string,
  quoteResponse: unknown,
): Promise<SwapResult> {
  try {
    const swapResp = await axios.post(
      `${JUPITER_QUOTE_API}/swap`,
      {
        quoteResponse,
        userPublicKey: walletPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 5000,
      },
      { timeout: 10000 },
    );

    const { swapTransaction } = swapResp.data;
    return {
      txSignature: swapTransaction,
      amountIn: 0,
      amountOut: 0,
      success: true,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "Jupiter swap execution failed");
    return { txSignature: "", amountIn: 0, amountOut: 0, success: false, error: msg };
  }
}
