import axios from "axios";
import { logger } from "./logger";
import { getWalletPublicKey, getWalletKeypair, getConnection } from "./solana";
import { VersionedTransaction, Connection } from "@solana/web3.js";

const JUPITER_BASE = "https://api.jup.ag/swap/v1";
const JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6";
const SOL_MINT = "So11111111111111111111111111111111111111112";
const LAMPORTS_PER_SOL = 1_000_000_000;
const JITO_BUNDLE_URL = "https://mainnet.block-engine.jito.wtf/api/v1/bundles";
const REBATE_ADDRESS = "3hR4Yzj9Swno23rMja4Z8f13ButU39sh9NsMvHM9Gmwi";

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
    const key = process.env["JUPITER_API_KEY"];
    const headers = key ? { Authorization: `Bearer ${key}` } : {};
    const resp = await axios.get(`${JUPITER_BASE}/quote`, {
      params: {
        inputMint: SOL_MINT,
        outputMint,
        amount: inputLamports,
        slippageBps: 100,
        platformFeeBps: 0,
      },
      headers,
      timeout: 8000,
    });
    const quote = resp.data;
    const outAmount = Number(quote.outAmount ?? 0);
    logger.info({ outputMint, solAmount, outAmount }, "[JUPITER_QUOTE] Quote received");
    return { outAmount, quote };
  } catch (err) {
    logger.error({ err, outputMint }, "Jupiter quote failed — trying fallback v6");
    try {
      const inputLamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
      const resp = await axios.get(`${JUPITER_QUOTE_API}/quote`, {
        params: { inputMint: SOL_MINT, outputMint, amount: inputLamports, slippageBps: 100 },
        timeout: 8000,
      });
      return { outAmount: Number(resp.data.outAmount ?? 0), quote: resp.data };
    } catch {
      return null;
    }
  }
}

export async function executeSwap(
  outputMint: string,
  solAmount: number,
  options?: { jitoTipSol?: number },
): Promise<string | null> {
  const walletPk = getWalletPublicKey();
  if (!walletPk) {
    logger.warn("Cannot execute swap — no wallet configured");
    return null;
  }

  const quoted = await getQuote(outputMint, solAmount);
  if (!quoted) return null;

  try {
    const key = process.env["JUPITER_API_KEY"];
    const headers = key ? { Authorization: `Bearer ${key}` } : {};

    const swapResp = await axios.post(
      `${JUPITER_BASE}/swap`,
      {
        quoteResponse: quoted.quote,
        userPublicKey: walletPk,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: Math.floor((options?.jitoTipSol ?? 0.000025) * LAMPORTS_PER_SOL),
        feeAccount: REBATE_ADDRESS,
      },
      { headers, timeout: 10_000 },
    );

    const { swapTransaction } = swapResp.data;
    if (!swapTransaction) return null;

    const connection = getConnection("mainnet");
    const keypair = getWalletKeypair();
    if (!keypair) return null;

    const txBuf = Buffer.from(swapTransaction, "base64");
    const tx = VersionedTransaction.deserialize(txBuf);
    tx.sign([keypair]);

    const sig = await connection.sendTransaction(tx, {
      skipPreflight: false,
      maxRetries: 3,
    });

    logger.info({ sig, outputMint, solAmount }, "[JITO_CONFIRMED] Transaction landed");
    return sig;
  } catch (err) {
    logger.error({ err, outputMint }, "Swap execution failed");
    return null;
  }
}
