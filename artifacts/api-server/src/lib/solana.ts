import { Connection, PublicKey, Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { logger } from "./logger";

export type SolanaNetwork = "mainnet" | "devnet";

export function getRpcUrl(network: SolanaNetwork = "mainnet"): string {
  if (network === "devnet") {
    return "https://api.devnet.solana.com";
  }
  const heliusKey = process.env["HELIUS_API_KEY"] ?? process.env["HELIUS_KEY"];
  const customRpc = process.env["SOLANA_RPC_URL"] ?? process.env["SOLANA_MAINNET_RPC"];
  if (customRpc) return customRpc;
  if (heliusKey) return `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`;
  return "https://api.mainnet-beta.solana.com";
}

export function getConnection(network: SolanaNetwork = "mainnet"): Connection {
  return new Connection(getRpcUrl(network), "confirmed");
}

export function getWalletKeypair(): Keypair | null {
  const pk = process.env["SOLANA_PRIVATE_KEY"] ?? process.env["PRIVATE_KEY"] ?? process.env["WALLET_PRIVATE_KEY"];
  if (!pk) return null;
  try {
    const decoded = bs58.decode(pk);
    return Keypair.fromSecretKey(decoded);
  } catch (err) {
    logger.error({ err }, "Failed to decode wallet private key");
    return null;
  }
}

export function getWalletPublicKey(): string | null {
  const keypair = getWalletKeypair();
  return keypair ? keypair.publicKey.toBase58() : null;
}

export async function getSolBalance(
  publicKey: string,
  network: SolanaNetwork = "mainnet",
): Promise<number> {
  try {
    const conn = getConnection(network);
    const pk = new PublicKey(publicKey);
    const lamports = await conn.getBalance(pk);
    return lamports / 1_000_000_000;
  } catch (err) {
    logger.error({ err, publicKey }, "Failed to get SOL balance");
    return 0;
  }
}

export async function sendVersionedTransaction(
  transaction: VersionedTransaction,
  network: SolanaNetwork = "mainnet",
): Promise<string> {
  const conn = getConnection(network);
  const sig = await conn.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });
  await conn.confirmTransaction(sig, "confirmed");
  return sig;
}
