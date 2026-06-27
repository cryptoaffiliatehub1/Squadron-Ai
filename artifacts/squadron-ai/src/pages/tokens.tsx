import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio, Shield, Coins, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState, useCallback } from "react";

function StatusBadge({ status }: { status?: string }) {
  if (status === "good") return (
    <span className="text-[7.5px] px-1.5 py-0.5 rounded-lg border font-bold uppercase tracking-wide text-gains border-gains/40 bg-gains/8">
      PASS
    </span>
  );
  if (status === "risky") return (
    <span className="text-[7.5px] px-1.5 py-0.5 rounded-lg border font-bold uppercase tracking-wide text-losses border-losses/40 bg-losses/8">
      SKIP
    </span>
  );
  if (status === "unknown") return (
    <span className="text-[7.5px] px-1.5 py-0.5 rounded-lg border font-bold uppercase tracking-wide text-yellow-400 border-yellow-400/40 bg-yellow-400/8">
      QUEUE
    </span>
  );
  return (
    <span className="text-[7.5px] px-1.5 py-0.5 rounded-lg border font-bold uppercase tracking-wide text-blue-400 border-blue-400/40 bg-blue-400/8 animate-pulse">
      SCAN
    </span>
  );
}

function ScoreBar({ score }: { score?: number | null }) {
  if (score === null || score === undefined) return null;
  const color = score >= 85 ? "bg-gains" : score >= 50 ? "bg-yellow-400" : "bg-losses";
  const label = score >= 85 ? "text-gains" : score >= 50 ? "text-yellow-400" : "text-losses";
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[7.5px] mb-0.5">
        <span className="text-muted-foreground uppercase tracking-wide">Risk Score</span>
        <span className={`font-bold font-mono ${label}`}>{score}</span>
      </div>
      <div className="w-full bg-border/40 rounded-full h-1">
        <div
          className={`h-1 rounded-full ${color} transition-all`}
          style={{ width: `${score}%`, boxShadow: score >= 85 ? "0 0 6px rgba(0,255,163,0.5)" : "none" }}
        />
      </div>
    </div>
  );
}

function TokenLogo({ logoUrl, symbol }: { logoUrl?: string | null; symbol: string }) {
  const [failed, setFailed] = useState(false);
  const hue = (symbol.charCodeAt(0) * 37) % 360;
  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={symbol}
        onError={() => setFailed(true)}
        className="w-10 h-10 rounded-full object-cover border border-border/40 shrink-0"
      />
    );
  }
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center border border-border/40 shrink-0 text-[10px] font-bold text-white"
      style={{ background: `hsl(${hue}, 55%, 35%)` }}
    >
      {symbol.slice(0, 2).toUpperCase()}
    </div>
  );
}

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
      className="flex items-center gap-1 text-[7.5px] text-muted-foreground hover:text-primary transition-colors font-mono"
    >
      {copied ? <CheckCircle2 size={8} className="text-gains" /> : <Copy size={8} />}
      {short}
    </button>
  );
}

function LiqDisplay({ liq }: { liq: number | null | undefined }) {
  const fmtNum = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0);
  if (liq === null || liq === undefined) {
    return <span className="font-mono font-bold text-losses">N/A</span>;
  }
  return (
    <span className={`font-mono font-bold ${liq >= 15_000 ? "text-gains" : "text-losses"}`}>
      ${fmtNum(liq)}
    </span>
  );
}

function DetectedCard({ token }: { token: any }) {
  const liq   = token.liquidityUsd as number | null;
  const vol5m = Number(token.volume5m ?? 0);
  const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0);
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
      <div className="flex items-start gap-3">
        <TokenLogo logoUrl={token.logoUrl} symbol={token.tokenSymbol ?? "?"} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-xs text-white truncate">{token.tokenName}</p>
              <p className="text-[10px] font-mono text-primary tracking-wider">{token.tokenSymbol}</p>
              <CopyAddress address={token.tokenMint ?? ""} />
            </div>
            <StatusBadge status={token.safetyStatus} />
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2 text-[8.5px]">
            <div>
              <span className="text-muted-foreground">Liq: </span>
              <LiqDisplay liq={liq} />
            </div>
            <div>
              <span className="text-muted-foreground">5m Vol: </span>
              <span className="font-mono">${fmtNum(vol5m)}</span>
            </div>
            {token.buyTxns5m != null && token.sellTxns5m != null && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Txns: </span>
                <span className="text-gains font-bold">{token.buyTxns5m}B</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="text-losses font-bold">{token.sellTxns5m}S</span>
                <span className="text-muted-foreground text-[7.5px]"> 5m</span>
              </div>
            )}
          </div>
          <ScoreBar score={token.probabilityScore} />
        </div>
      </div>
      <p className="text-[7.5px] text-muted-foreground/40 mt-2 text-right font-mono">
        {new Date(token.detectedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}

function formatSkipReason(raw: string): { label: string; detail: string } {
  if (!raw) return { label: "FILTERED", detail: "No reason recorded" };
  // Fix 5: No DEX pair / liquidity unavailable
  if (/no dex pair|liquidity unavailable/i.test(raw))
    return { label: "NO PAIR", detail: "Token still on bonding curve — no DEX listing yet" };
  // Fix 3: Activity filter
  if (/insufficient buy activity/i.test(raw)) {
    const m = raw.match(/(\d+)b/i);
    return { label: "LOW ACTIVITY", detail: `${m?.[1] ?? "0"} buys in 5m — below 5 minimum` };
  }
  // Fix 8: Risk gate timeout
  if (/risk gate timeout/i.test(raw))
    return { label: "TIMEOUT", detail: "Risk gate did not respond within 15 seconds" };
  // Fix 5: Liquidity too low — show real number, never "$0"
  if (/liquidity too low|liquidity/i.test(raw)) {
    const m = raw.match(/\$([\d,]+)/);
    const amt = m?.[1];
    return {
      label:  "LIQUIDITY",
      detail: amt ? `$${amt} — below $15,000 minimum` : "Liquidity below $15,000 minimum",
    };
  }
  if (/rugcheck/i.test(raw))
    return { label: "RUGCHECK",   detail: raw.replace(/^rugcheck:\s*/i, "").split(";")[0] ?? raw };
  if (/holder/i.test(raw)) {
    const m = raw.match(/([\d.]+)%/);
    return { label: "HOLDER CONC", detail: `${m?.[1] ?? "?"}% concentration — above 20% limit` };
  }
  if (/ghost volume|wash trade/i.test(raw))
    return { label: "WASH TRADE",  detail: "High-concentration wallet volume" };
  if (/freeze/i.test(raw))
    return { label: "FREEZE AUTH", detail: "Freeze authority enabled" };
  if (/supply/i.test(raw)) {
    const m = raw.match(/([\d.]+)%/);
    return { label: "SUPPLY GAP",  detail: `${m?.[1] ?? "?"}% supply gap — above 20% limit` };
  }
  if (/stale|timestamp/i.test(raw))
    return { label: "STALE DATA",  detail: "Price timestamp stale" };
  if (/volume|flat|momentum/i.test(raw))
    return { label: "NO MOMENTUM", detail: "Volume flat or declining" };
  if (/birdeye/i.test(raw))
    return { label: "SECURITY",    detail: raw.replace(/^birdeye:\s*/i, "") };
  return { label: "FILTERED", detail: raw };
}

function SkippedCard({ token }: { token: any }) {
  const { label, detail } = formatSkipReason(token.reason ?? "");
  const liq = token.liquidityUsd as number | null;
  return (
    <div className="bg-card border border-border border-l-2 border-l-losses/50 rounded-xl p-3 shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
      <div className="flex items-start gap-3">
        <TokenLogo logoUrl={token.logoUrl} symbol={token.tokenSymbol ?? "?"} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-xs text-white truncate">{token.tokenName}</p>
              <p className="text-[10px] font-mono text-primary tracking-wider">{token.tokenSymbol}</p>
              <CopyAddress address={token.tokenMint ?? ""} />
            </div>
            <span className="text-[7.5px] px-1.5 py-0.5 rounded-lg border font-bold uppercase tracking-wide text-losses border-losses/40 bg-losses/8 shrink-0">
              {label}
            </span>
          </div>
          <p className="text-[8.5px] mt-1.5">
            <span className="text-muted-foreground">Liq: </span>
            <LiqDisplay liq={liq} />
          </p>
          <div className="mt-1.5 bg-losses/5 border border-losses/20 rounded-lg px-2 py-1">
            <p className="text-[8px] text-losses/80 leading-relaxed">{detail}</p>
          </div>
        </div>
      </div>
      <p className="text-[7.5px] text-muted-foreground/40 mt-2 text-right font-mono">
        {new Date(token.detectedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}

function SkippedList() {
  const { data, isLoading } = useQuery({
    queryKey: ["tokens-skipped"],
    queryFn: () => fetch("/api/tokens/skipped?limit=50").then(r => r.json()),
    refetchInterval: 30000,
  });
  const tokens = (data as any[]) ?? [];
  if (isLoading) return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>;
  if (tokens.length === 0) return (
    <div className="text-center py-12 text-muted-foreground">
      <Shield size={28} className="mx-auto mb-3 opacity-20" />
      <p className="text-sm font-mono uppercase tracking-wider">No skipped tokens</p>
      <p className="text-[10px] mt-1">Risk gate rejections appear here</p>
    </div>
  );
  return <div className="space-y-2">{tokens.map((t: any) => <SkippedCard key={t.id} token={t} />)}</div>;
}

const TEN_MINUTES_MS = 10 * 60 * 1000;

export default function Tokens() {
  const { data: tokens, isLoading } = useQuery({
    queryKey: ["tokens-recent"],
    queryFn: () => fetch("/api/tokens/recent?limit=100").then(r => r.json()),
    refetchInterval: 30000,
  });
  const [tab, setTab] = useState<"recent" | "skipped">("recent");
  // Only show tokens detected in the last 10 minutes — auto-purge stale entries from display
  const tokenList = ((tokens as any[]) ?? []).filter(
    (t: any) => Date.now() - new Date(t.detectedAt).getTime() < TEN_MINUTES_MS
  );

  return (
    <Layout>
      <div className="px-3 pb-4 space-y-3 max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-primary tracking-[0.2em] uppercase flex items-center gap-2">
              <Radio size={12} /> Token Radar
            </h1>
            <p className="text-[8px] text-muted-foreground uppercase tracking-[0.25em] mt-0.5">
              Triple-radar · DEX Screener + Pump.fun + Birdeye
            </p>
          </div>
          <div className="text-right text-[8px] text-muted-foreground">
            <span className={`${tokenList.length > 0 ? "text-primary font-bold" : ""}`}>{tokenList.length}</span> detected
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-card border border-border rounded-xl p-1">
          <button
            className={`flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors ${
              tab === "recent"
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("recent")}
          >
            Detected ({tokenList.length})
          </button>
          <button
            className={`flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors ${
              tab === "skipped"
                ? "bg-losses/10 text-losses border border-losses/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("skipped")}
          >
            <AlertTriangle size={8} className="inline mr-1" />Skipped
          </button>
        </div>

        {tab === "recent" && (
          isLoading ? (
            <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
          ) : tokenList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Coins size={28} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-mono uppercase tracking-wider">Scanner idle</p>
              <p className="text-[10px] mt-1">Start the bot to begin detecting tokens</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tokenList.map((t: any) => <DetectedCard key={t.id} token={t} />)}
            </div>
          )
        )}

        {tab === "skipped" && <SkippedList />}
      </div>
    </Layout>
  );
}
