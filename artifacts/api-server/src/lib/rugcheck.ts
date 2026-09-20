import axios from "axios";
import { logger } from "./logger";

const RUGCHECK_BASE = "https://api.rugcheck.xyz/v1";

export interface RugCheckResult {
  score: number;
  rating: string;
  risks: string[];
  hardRisks: string[];
  isRugged: boolean;
  topHolderPct: number;
  holderCount: number;
  topHolders: RugCheckHolder[];
  knownAccounts: Record<string, { name?: string; type?: string }>;
  graphInsidersDetected: number;
  insiderNetworks: Array<{ id?: string; size?: number; type?: string; activeAccounts?: number }>;
}

export interface RugCheckHolder {
  address?: string;
  owner?: string;
  pct?: number;
  uiAmount?: number;
}

export interface RugCheckResponse {
  data: RugCheckResult | null;
  statusCode: number;
}

export interface TokenSafetyResult {
  score: number;
  isGood: boolean;
  risks: string[];
  rawScore: number;
}

export const RUGCHECK_REJECTION_RULE =
  "Reject only when RugCheck reports a hard security risk; low normalized scores are GOOD and are not rejected by score threshold.";

function isHardRisk(risk: string): boolean {
  return /rug|honeypot|scam|malicious|blacklist|freeze|mint authority|transfer fee|unlocked liquidity|lp unlock|ownership/i.test(risk);
}

// ── Rate limiter — max 2 req/sec (below the 3/sec platform limit) ─────────────
// Queue excess requests instead of dropping/failing them.
// Logs "RUGCHECK THROTTLED — queued, X waiting" when triggered.

const RUGCHECK_MIN_INTERVAL_MS = 500; // 1000ms / 2 req = 500ms per request
interface QueueItem { mint: string; resolve: (r: RugCheckResponse) => void }
const rugCheckQueue: QueueItem[] = [];
let rugCheckProcessing = false;
let lastRugCheckFireMs = 0;

async function drainQueue(): Promise<void> {
  if (rugCheckProcessing) return;
  rugCheckProcessing = true;

  while (rugCheckQueue.length > 0) {
    const item = rugCheckQueue.shift()!;
    const now = Date.now();
    const wait = Math.max(0, lastRugCheckFireMs + RUGCHECK_MIN_INTERVAL_MS - now);
    if (wait > 0) await new Promise<void>((r) => setTimeout(r, wait));
    lastRugCheckFireMs = Date.now();
    const result = await _doFetch(item.mint);
    item.resolve(result);
  }

  rugCheckProcessing = false;
}

// ── Raw HTTP fetch (no rate-limit logic here) ─────────────────────────────────
async function _doFetch(tokenMint: string): Promise<RugCheckResponse> {
  try {
    // The full report is required for the final concentration/cluster gate.
    // The summary endpoint omits topHolders and insider-network fields.
    const resp = await axios.get(`${RUGCHECK_BASE}/tokens/${tokenMint}/report`, {
      timeout: 10_000,
      validateStatus: () => true,
    });

    // 404 = not yet indexed, 429 = rate limited, 5xx = backend down → UNVERIFIED
    if (resp.status === 404 || resp.status === 429 || resp.status >= 500) {
      if (resp.status === 404) {
        console.log(`RUGCHECK 404 — token not yet indexed, treating as UNVERIFIED (${tokenMint.slice(0, 8)})`);
      } else if (resp.status === 429) {
        console.log(`RUGCHECK RATE LIMITED — API quota hit, treating as UNVERIFIED (${tokenMint.slice(0, 8)})`);
      } else {
        console.log(`RUGCHECK SERVER ERROR (HTTP ${resp.status}) — treating as UNVERIFIED (${tokenMint.slice(0, 8)})`);
      }
      return { data: null, statusCode: resp.status };
    }

    const data = resp.data;
    const score = Number(data?.score ?? 0);

    const risks: string[] = (data?.risks ?? [])
      .map((r: { name?: string; description?: string }) =>
        (r.name?.trim() || r.description?.trim() || "").replace(/\.$/, ""),
      )
      .filter((r: string) => r.length > 0);

    const hardRisks = risks.filter(isHardRisk);
    const normalizedScore = data?.score_normalised ?? data?.score_normalized ?? "unknown";

    const topHolders: RugCheckHolder[] = Array.isArray(data?.topHolders)
      ? data.topHolders.map((h: RugCheckHolder) => ({
          address: typeof h?.address === "string" ? h.address : undefined,
          owner: typeof h?.owner === "string" ? h.owner : undefined,
          pct: Number.isFinite(Number(h?.pct)) ? Number(h.pct) : undefined,
          uiAmount: Number.isFinite(Number(h?.uiAmount)) ? Number(h.uiAmount) : undefined,
        }))
      : [];
    const topHolderPct =
      topHolders
        .slice(0, 10)
        .reduce((sum: number, h: RugCheckHolder) => sum + (h.pct ?? 0), 0);

    return {
      statusCode: resp.status,
      data: {
        score,
        rating: String(normalizedScore),
        risks,
        hardRisks,
        isRugged: hardRisks.length > 0,
        topHolderPct,
        holderCount: data?.totalHolders ?? 0,
        topHolders,
        knownAccounts: data?.knownAccounts ?? {},
        graphInsidersDetected: Number(data?.graphInsidersDetected ?? 0),
        insiderNetworks: Array.isArray(data?.insiderNetworks) ? data.insiderNetworks : [],
      },
    };
  } catch (err) {
    logger.warn({ err, tokenMint }, "RugCheck API call failed (network error)");
    console.log(`RUGCHECK TIMEOUT — network error, not a safety failure (${tokenMint.slice(0, 8)})`);
    return { data: null, statusCode: 0 };
  }
}

// ── Public throttled entry point ──────────────────────────────────────────────
export async function checkTokenWithStatus(tokenMint: string): Promise<RugCheckResponse> {
  const now = Date.now();
  const timeSinceLast = now - lastRugCheckFireMs;

  // If a request is in flight or we have queue items, or we're inside the rate window → queue
  if (rugCheckProcessing || rugCheckQueue.length > 0 || timeSinceLast < RUGCHECK_MIN_INTERVAL_MS) {
    if (rugCheckQueue.length > 0 || timeSinceLast < RUGCHECK_MIN_INTERVAL_MS) {
      console.log(`RUGCHECK THROTTLED — queued, ${rugCheckQueue.length + 1} waiting (${timeSinceLast}ms since last)`);
    }
    return new Promise<RugCheckResponse>((resolve) => {
      rugCheckQueue.push({ mint: tokenMint, resolve });
      drainQueue();
    });
  }

  // Fast path: no queue, outside rate window — fire immediately
  lastRugCheckFireMs = Date.now();
  return _doFetch(tokenMint);
}

// ── Backward-compat wrappers ──────────────────────────────────────────────────
export async function checkToken(tokenMint: string): Promise<RugCheckResult | null> {
  const { data } = await checkTokenWithStatus(tokenMint);
  return data;
}

export async function checkTokenSafety(tokenMint: string): Promise<TokenSafetyResult> {
  const result = await checkToken(tokenMint);
  if (!result) {
    return { score: 0, isGood: false, risks: ["Unable to fetch safety data"], rawScore: 0 };
  }
  return {
    score: result.score,
    isGood: !result.isRugged,
    risks: result.risks,
    rawScore: result.score,
  };
}

// ── Status getter for monitoring ──────────────────────────────────────────────
export function getRugCheckQueueDepth(): number {
  return rugCheckQueue.length;
}
