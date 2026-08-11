
import axios from "axios";
import { logger } from "./logger";

const JITO_BLOCK_ENGINE = "https://mainnet.block-engine.jito.wtf/api/v1";

export interface JitoTipAccount {
  address: string;
}

export async function getJitoTipAccounts(): Promise<string[]> {
  try {
    const resp = await axios.post(
      `${JITO_BLOCK_ENGINE}/bundles`,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "getTipAccounts",
        params: [],
      },
      { timeout: 5_000 },
    );
    return resp.data?.result ?? [];
  } catch (err) {
    logger.warn({ err }, "Failed to fetch Jito tip accounts");
    return [];
  }
}

export async function sendJitoBundle(serializedTransactions: string[]): Promise<string | null> {
  try {
    const resp = await axios.post(
      `${JITO_BLOCK_ENGINE}/bundles`,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "sendBundle",
        params: [serializedTransactions],
      },
      { timeout: 10_000 },
    );
    return resp.data?.result ?? null;
  } catch (err) {
    logger.error({ err }, "Jito bundle submission failed");
    return null;
  }
}
