type DexCallKind = "scanner" | "paper-exit" | "paper-moonbag";

interface DexCall {
  at: number;
  kind: DexCallKind;
}

const calls: DexCall[] = [];
const WINDOW_MS = 60_000;

export function recordDexScreenerCall(kind: DexCallKind): void {
  calls.push({ at: Date.now(), kind });
  prune();
}

function prune(): void {
  const cutoff = Date.now() - WINDOW_MS;
  while (calls.length && calls[0]!.at < cutoff) calls.shift();
}

export function getDexScreenerMetrics() {
  prune();
  const byKind = calls.reduce<Record<string, number>>((out, call) => {
    out[call.kind] = (out[call.kind] ?? 0) + 1;
    return out;
  }, {});
  return {
    windowSeconds: 60,
    callsLastMinute: calls.length,
    byKind,
    rateLimitReference: "DexScreener public API limits are endpoint-dependent; this reports observed local volume.",
    sampledAt: new Date().toISOString(),
  };
}