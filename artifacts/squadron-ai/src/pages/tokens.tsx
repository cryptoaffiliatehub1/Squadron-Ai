import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Radio, Shield, AlertTriangle, Copy, CheckCircle2, Coins } from "lucide-react";
import { useState, useCallback } from "react";

// ── FIX 4: Status badge ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
  if (status === "good") return (
    <span className="text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wide text-gains border-gains/40 bg-gains/10">
      AUDIT PASS
    </span>
  );
  if (status === "risky") return (
    <span className="text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wide text-losses border-losses/40 bg-losses/10">
      SKIPPED
    </span>
  );
  if (status === "unknown") return (
    <span className="text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wide text-yellow-400 border-yellow-400/40 bg-yellow-400/10">
      QUEUED
    </span>
  );
  // "pending" = scanning
  return (
    <span className="text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wide text-blue-400 border-blue-400/40 bg-blue-400/10 animate-pulse">
      SCANNING
    </span>
  );
}

// ── FIX 4: Probability score bar ────────────────────────────────────────────
function ScoreBar({ score }: { score?: number | null }) {
  if (score === null || score === undefined) return null;
  const color = score >= 85 ? "bg-gains" : score >= 50 ? "bg-yellow-400" : "bg-losses";
  const label = score >= 85 ? "text-gains" : score >= 50 ? "text-yellow-400" : "text-losses";
  return (
    <div className="mt-1.5">
      <div className="flex justify-between text-[8px] mb-0.5">
        <span className="text-muted-foreground uppercase tracking-wide">Score</span>
        <span className={`font-bold font-mono ${label}`}>{score}</span>
      </div>
      <div className="w-full bg-border/40 rounded-full h-1">
        <div className={`h-1 rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// ── FIX 4: Token logo ─────────────────────────────────────────────────────────
function TokenLogo({ logoUrl, symbol }: { logoUrl?: string | null; symbol: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (logoUrl && !imgFailed) {
    return (
      <img
        src={logoUrl}
        alt={symbol}
        onError={() => setImgFailed(true)}
        className="w-10 h-10 rounded-full object-cover border border-border/40 shrink-0"
      />
    );
  }
  const color = `hsl(${(symbol.charCodeAt(0) * 37) % 360}, 60%, 40%)`;
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center border border-border/40 shrink-0 text-[10px] font-bold uppercase text-white"
      style={{ background: color }}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}

// ── FIX 4: Contract address with copy button ────────────────────────────────
function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [address]);
  const short = address ? `${address.slice(0, 4)}…${address.slice(-4)}` : "—";
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-[8px] text-muted-foreground hover:text-primary transition-colors font-mono"
    >
      {copied ? <CheckCircle2 size={9} className="text-gains" /> : <Copy size={9} />}
      {short}
    </button>
  );
}

// ── FIX 4: Full detected token card ─────────────────────────────────────────
function DetectedCard({ token }: { token: any }) {
  const liq = Number(token.liquidityUsd ?? 0);
  const vol5m = Number(token.volume5m ?? 0);
  return (
    <Card className="bg-card border-card-border">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <TokenLogo logoUrl={token.logoUrl} symbol={token.tokenSymbol ?? "?"} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-xs text-white truncate">{token.tokenName}</p>
                <p className="text-[10px] font-mono text-gains tracking-wider">{token.tokenSymbol}</p>
                <CopyAddress address={token.tokenMint ?? ""} />
              </div>
              <StatusBadge status={token.safetyStatus} />
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1.5 text-[9px]">
              <div>
                <span className="text-muted-foreground">Liquidity: </span>
                <span className={`font-mono font-bold ${liq >= 15_000 ? "text-gains" : "text-losses"}`}>
                  ${liq >= 1000 ? `${(liq / 1000).toFixed(1)}k` : liq.toFixed(0)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">5m Vol: </span>
                <span className="font-mono">${vol5m >= 1000 ? `${(vol5m / 1000).toFixed(1)}k` : vol5m.toFixed(0)}</span>
              </div>
              {(token.buyTxns5m !== null && token.sellTxns5m !== null) && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Txns: </span>
                  <span className="text-gains font-bold">{token.buyTxns5m ?? 0}b</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-losses font-bold">{token.sellTxns5m ?? 0}s</span>
                  <span className="text-muted-foreground text-[8px]"> 5m</span>
                </div>
              )}
            </div>

            <ScoreBar score={token.probabilityScore} />
          </div>
        </div>
        <p className="text-[8px] text-muted-foreground/50 mt-1.5 text-right">
          {new Date(token.detectedAt).toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  );
}

// ── FIX 5: Format skip reasons with real numbers ─────────────────────────────
function formatSkipReason(raw: string): { label: string; detail: string } {
  if (!raw) return { label: "FILTERED", detail: raw };

  if (/liquidity/i.test(raw)) {
    const match = raw.match(/\$([\d,]+)/);
    const usd = match ? match[1] : "?";
    return { label: "LIQUIDITY", detail: `Liquidity $${usd} — below $15,000 minimum` };
  }
  if (/rugcheck/i.test(raw)) {
    const status = raw.replace(/^rugcheck:\s*/i, "").split(";")[0] ?? raw;
    return { label: "RUGCHECK", detail: `RugCheck: ${status} — not Good` };
  }
  if (/holder/i.test(raw)) {
    const match = raw.match(/([\d.]+)%/);
    const pct = match ? match[1] : "?";
    return { label: "HOLDER CONC.", detail: `Holder concentration ${pct}% — above 20% limit` };
  }
  if (/ghost volume|wash trade/i.test(raw)) {
    return { label: "WASH TRADE", detail: `Wash trade: wallets controlling high % of volume` };
  }
  if (/freeze/i.test(raw)) {
    return { label: "FREEZE AUTH", detail: "Freeze authority enabled" };
  }
  if (/supply/i.test(raw)) {
    const match = raw.match(/([\d.]+)%/);
    const pct = match ? match[1] : "?";
    return { label: "SUPPLY GAP", detail: `Supply gap ${pct}% — above 20% limit` };
  }
  if (/stale|timestamp/i.test(raw)) {
    const match = raw.match(/(\d+)s/);
    const age = match ? match[1] : "?";
    return { label: "STALE DATA", detail: `Stale data: price timestamp ${age}s old` };
  }
  if (/volume|flat|momentum/i.test(raw)) {
    return { label: "NO MOMENTUM", detail: "Volume flat or declining — no momentum detected" };
  }
  if (/birdeye/i.test(raw)) {
    const detail = raw.replace(/^birdeye:\s*/i, "");
    return { label: "SECURITY", detail };
  }
  return { label: "FILTERED", detail: raw };
}

function SkippedCard({ token }: { token: any }) {
  const { label, detail } = formatSkipReason(token.reason ?? "");
  const liq = Number(token.liquidityUsd ?? 0);
  return (
    <Card className="bg-card border-card-border border-l-2 border-l-losses/40">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <TokenLogo logoUrl={token.logoUrl} symbol={token.tokenSymbol ?? "?"} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-xs text-white truncate">{token.tokenName}</p>
                <p className="text-[10px] font-mono text-gains tracking-wider">{token.tokenSymbol}</p>
                <CopyAddress address={token.tokenMint ?? ""} />
              </div>
              <span className="text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wide text-losses border-losses/40 bg-losses/10 shrink-0">
                {label}
              </span>
            </div>

            {liq > 0 && (
              <p className="text-[8px] mt-1">
                <span className="text-muted-foreground">Liq: </span>
                <span className={`font-mono ${liq >= 15_000 ? "text-gains" : "text-losses"}`}>
                  ${liq >= 1000 ? `${(liq / 1000).toFixed(1)}k` : liq.toFixed(0)}
                </span>
              </p>
            )}

            <div className="mt-1.5 bg-losses/5 border border-losses/20 rounded px-2 py-1">
              <p className="text-[9px] text-losses/90 leading-relaxed">{detail}</p>
            </div>
          </div>
        </div>
        <p className="text-[8px] text-muted-foreground/50 mt-1.5 text-right">
          {new Date(token.detectedAt).toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  );
}

function SkippedTokensList() {
  const { data, isLoading } = useQuery({
    queryKey: ["tokens-skipped"],
    queryFn: () => fetch("/api/tokens/skipped?limit=50").then(r => r.json()),
    refetchInterval: 30000,
  });

  const tokens = (data as any[]) ?? [];

  if (isLoading) return (
    <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
  );

  if (tokens.length === 0) return (
    <div className="text-center py-12 text-muted-foreground">
      <Shield size={32} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm font-mono uppercase tracking-wider">No skipped tokens</p>
      <p className="text-[10px] mt-1">Risk gate rejections will appear here</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {tokens.map((token: any) => <SkippedCard key={token.id} token={token} />)}
    </div>
  );
}

export default function Tokens() {
  const { data: tokens, isLoading } = useQuery({
    queryKey: ["tokens-recent"],
    queryFn: () => fetch("/api/tokens/recent?limit=50").then(r => r.json()),
    refetchInterval: 15000,
  });
  const [tab, setTab] = useState<"recent" | "skipped">("recent");
  const tokenList = (tokens as any[]) ?? [];

  return (
    <Layout>
      <div className="p-3 space-y-3 max-w-md mx-auto pb-4">
        <header className="border-b border-border pb-3">
          <h1 className="text-sm font-bold text-primary tracking-[0.25em] uppercase flex items-center gap-2">
            <Radio size={13} /> Token Scanner
          </h1>
          <p className="text-[9px] text-muted-foreground uppercase tracking-[0.3em] mt-0.5">
            DEX Screener trending + boosted · triple-radar
          </p>
        </header>

        <div className="flex gap-2">
          <button
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border transition-colors ${tab === "recent" ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground"}`}
            onClick={() => setTab("recent")}
          >
            Detected ({tokenList.length})
          </button>
          <button
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border transition-colors ${tab === "skipped" ? "bg-losses/10 border-losses/50 text-losses" : "border-border text-muted-foreground"}`}
            onClick={() => setTab("skipped")}
          >
            Skipped
          </button>
        </div>

        {tab === "recent" && (
          isLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-28 w-full" />)}</div>
          ) : tokenList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Coins size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-mono uppercase tracking-wider">Scanner idle</p>
              <p className="text-[10px] mt-1">Start the bot to begin detecting tokens</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tokenList.map((token: any) => <DetectedCard key={token.id} token={token} />)}
            </div>
          )
        )}

        {tab === "skipped" && <SkippedTokensList />}
      </div>
    </Layout>
  );
}
