import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio, Shield, Coins, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState, useCallback, useEffect } from "react";

// ── Safe number formatter — never calls toFixed on non-numbers ──────────────
function safeNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isFinite(n) && !isNaN(n) ? n : null;
}

function fmtUsd(v: unknown): string | null {
  const n = safeNum(v);
  if (n === null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000)      return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(0);
}

// ── Tier badge ───────────────────────────────────────────────────────────────
function TierBadge({ liq }: { liq: unknown }) {
  const n = safeNum(liq);
  if (n === null) return null;
  if (n >= 100_000) return (
    <span className="text-[7px] px-1 py-0.5 rounded border font-bold uppercase tracking-wide text-gains border-gains/40 bg-gains/10 shrink-0">
      SAFE TIER
    </span>
  );
  if (n >= 15_000) return (
    <span className="text-[7px] px-1 py-0.5 rounded border font-bold uppercase tracking-wide text-yellow-400 border-yellow-400/40 bg-yellow-400/10 shrink-0">
      MOON TIER
    </span>
  );
  return null;
}

function StatusBadge({ status }: { status?: string }) {
  if (status === "good") return (
    <span className="text-[7.5px] px-1.5 py-0.5 rounded-lg border font-bold uppercase tracking-wide text-gains border-gains/40 bg-gains/8">
      PASS
    </span>
  );
  if (status === "pending") return (
    <span className="text-[7.5px] px-1.5 py-0.5 rounded-lg border font-bold uppercase tracking-wide text-blue-300 border-blue-300/40 bg-blue-300/8 animate-pulse">
      EVALUATING
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

// ── Specific failure label badge ─────────────────────────────────────────────
function FailureBadge({ label, status }: { label?: string | null; status?: string }) {
  if (!label) return <StatusBadge status={status} />;
  const colorMap: Record<string, string> = {
    "RUGCHECK FAIL": "text-losses border-losses/40 bg-losses/8",
    "HIGH SELLS":    "text-losses border-losses/40 bg-losses/8",
    "FREEZE AUTH":   "text-losses border-losses/40 bg-losses/8",
    "LOW VOLUME":    "text-orange-400 border-orange-400/40 bg-orange-400/8",
    "LOW BUYS":      "text-orange-400 border-orange-400/40 bg-orange-400/8",
    "HOLDER CONC":   "text-yellow-400 border-yellow-400/40 bg-yellow-400/8",
    "SUPPLY GAP":    "text-yellow-400 border-yellow-400/40 bg-yellow-400/8",
    "UNVERIFIED":    "text-blue-400 border-blue-400/40 bg-blue-400/8",
    "FILTERED":      "text-losses border-losses/40 bg-losses/8",
    "TIMEOUT":       "text-orange-400 border-orange-400/40 bg-orange-400/8",
    "SECURITY":      "text-losses border-losses/40 bg-losses/8",
  };
  const cls = colorMap[label] ?? "text-muted-foreground border-border bg-transparent";
  return (
    <span className={`text-[7.5px] px-1.5 py-0.5 rounded-lg border font-bold uppercase tracking-wide shrink-0 ${cls}`}>
      {label}
    </span>
  );
}

function ScoreBar({ score }: { score?: number | null }) {
  const n = safeNum(score);
  if (n === null) return null;
  const color = n >= 85 ? "bg-gains" : n >= 50 ? "bg-yellow-400" : "bg-losses";
  const label = n >= 85 ? "text-gains" : n >= 50 ? "text-yellow-400" : "text-losses";
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[7.5px] mb-0.5">
        <span className="text-muted-foreground uppercase tracking-wide">Risk Score</span>
        <span className={`font-bold font-mono ${label}`}>{n}</span>
      </div>
      <div className="w-full bg-border/40 rounded-full h-1">
        <div
          className={`h-1 rounded-full ${color} transition-all`}
          style={{ width: `${n}%`, boxShadow: n >= 85 ? "0 0 6px rgba(0,255,163,0.5)" : "none" }}
        />
      </div>
    </div>
  );
}

function TokenLogo({ logoUrl, symbol }: { logoUrl?: string | null; symbol?: string | null }) {
  const [failed, setFailed] = useState(false);
  const safe = (symbol ?? "?").slice(0, 2).toUpperCase() || "??";
  const hue  = (safe.charCodeAt(0) * 37) % 360;
  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={safe}
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
      {safe}
    </div>
  );
}

function CopyAddress({ address }: { address?: string | null }) {
  const [copied, setCopied] = useState(false);
  const addr = address ?? "";
  const copy = useCallback(() => {
    if (!addr) return;
    navigator.clipboard.writeText(addr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }, [addr]);
  const short = addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : "—";
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

// ── Safe liquidity display ───────────────────────────────────────────────────
function LiqDisplay({ liq }: { liq: unknown }) {
  const formatted = fmtUsd(liq);
  const n = safeNum(liq);
  if (formatted === null || n === null) {
    return <span className="font-mono font-bold text-losses">N/A</span>;
  }
  return (
    <span className={`font-mono font-bold ${n >= 15_000 ? "text-gains" : "text-losses"}`}>
      ${formatted}
    </span>
  );
}

function DetectedCard({ token }: { token: any }) {
  const vol5m = safeNum(token.volume5m) ?? 0;
  const fmtVol = fmtUsd(vol5m) ?? "0";
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
      <div className="flex items-start gap-3">
        <TokenLogo logoUrl={token.logoUrl} symbol={token.tokenSymbol} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-xs text-white truncate">{token.tokenName ?? token.tokenMint?.slice(0, 6) ?? "—"}</p>
              <p className="text-[10px] font-mono text-primary tracking-wider">{token.tokenSymbol ?? token.tokenMint?.slice(0, 6) ?? "—"}</p>
              <CopyAddress address={token.tokenMint} />
            </div>
            <div className="flex flex-col items-end gap-1">
              {token.safetyStatus === "pending"
                ? <StatusBadge status="pending" />
                : <FailureBadge label={token.failureLabel} status={token.safetyStatus} />}
              <TierBadge liq={token.liquidityUsd} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2 text-[8.5px]">
            <div>
              <span className="text-muted-foreground">Liq: </span>
              <LiqDisplay liq={token.liquidityUsd} />
            </div>
            <div>
              <span className="text-muted-foreground">MCap: </span>
              {token.marketCap != null
                ? <span className="font-mono font-bold text-primary">${fmtUsd(token.marketCap)}</span>
                : <span className="text-muted-foreground/40 font-mono">—</span>
              }
            </div>
            <div>
              <span className="text-muted-foreground">5m Vol: </span>
              <span className="font-mono">${fmtVol}</span>
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
        {(() => { try { return new Date(token.detectedAt).toLocaleTimeString(); } catch { return "—"; } })()}
      </p>
    </div>
  );
}

// ── Skip reason formatter ────────────────────────────────────────────────────
function formatSkipReason(raw: string): { label: string; detail: string } {
  if (!raw) return { label: "FILTERED", detail: "No reason recorded" };
  if (/no dex pair|liquidity unavailable/i.test(raw))
    return { label: "NO PAIR",      detail: "Token still on bonding curve — no DEX listing yet" };
  if (/insufficient buy activity/i.test(raw)) {
    const m = raw.match(/(\d+)b/i);
    return { label: "LOW ACTIVITY", detail: `${m?.[1] ?? "0"} buys in 5m — below 5 minimum` };
  }
  if (/risk gate timeout/i.test(raw))
    return { label: "TIMEOUT",      detail: "Risk gate did not respond within 15 seconds" };
  if (/narrative duplicate/i.test(raw)) {
    const kw = raw.match(/\(([^)]+)\)$/)?.[1] ?? "";
    return { label: "SPAM",         detail: `${kw} narrative — 2 tokens already in radar` };
  }
  if (/liquidity too high/i.test(raw))
    return { label: "TOO LARGE",    detail: "Above $500k — low meme profit potential" };
  if (/liquidity too low|below \$15k|below \$10k/i.test(raw)) {
    const m = raw.match(/\(\$([\d,]+)\)/);
    return { label: "LIQUIDITY",    detail: m ? `$${m[1]} — below minimum` : "Liquidity below minimum" };
  }
  if (/liquidity/i.test(raw)) {
    const m = raw.match(/\(\$([\d,]+)\)/);
    return { label: "LIQUIDITY",    detail: m ? `$${m[1]} — below minimum` : "Liquidity below minimum" };
  }
  if (/sniper|accumulation/i.test(raw))
    return { label: "SNIPER",       detail: raw.split(";")[0] ?? raw };
  if (/wallet seeding|seeded/i.test(raw))
    return { label: "WALLET SEED",  detail: "Coordinated wallet seeding detected" };
  if (/coordinated attack|copycat/i.test(raw))
    return { label: "COPYCAT",      detail: raw.split(";")[0] ?? raw };
  if (/price collapsed|dead token|-50%/i.test(raw))
    return { label: "PRICE DUMP",   detail: raw.split(";")[0] ?? raw };
  if (/rugcheck/i.test(raw))
    return { label: "RUGCHECK",     detail: raw.replace(/^rugcheck:\s*/i, "").split(";")[0] ?? raw };
  if (/holder/i.test(raw)) {
    const m = raw.match(/([\d.]+)%/);
    return { label: "HOLDER CONC",  detail: `${m?.[1] ?? "?"}% concentration — above 20% limit` };
  }
  if (/ghost volume|wash trade/i.test(raw))
    return { label: "WASH TRADE",   detail: "High-concentration wallet volume" };
  if (/freeze/i.test(raw))
    return { label: "FREEZE AUTH",  detail: "Freeze authority enabled" };
  if (/supply/i.test(raw)) {
    const m = raw.match(/([\d.]+)%/);
    return { label: "SUPPLY GAP",   detail: `${m?.[1] ?? "?"}% supply gap — above 20% limit` };
  }
  if (/volume|flat|momentum/i.test(raw))
    return { label: "NO MOMENTUM",  detail: "Volume flat or declining" };
  if (/birdeye/i.test(raw))
    return { label: "SECURITY",     detail: raw.replace(/^birdeye:\s*/i, "") };
  return { label: "FILTERED",       detail: raw };
}

// ── Build a verification link based on skip label ────────────────────────────
function skipReasonLink(label: string, tokenMint: string): string {
  if (!tokenMint) return `https://dexscreener.com/solana/${tokenMint}`;
  if (/rugcheck/i.test(label)) {
    return `https://rugcheck.xyz/tokens/${tokenMint}`;
  }
  // All others (liquidity, no pair, low activity, too large, sniper, wallet seed, copycat, price dump, security, filtered)
  return `https://dexscreener.com/solana/${tokenMint}`;
}

// ── Skipped card — reason badge tappable ────────────────────────────────────
function SkippedCard({ token }: { token: any }) {
  if (!token) return null;
  const { label, detail } = formatSkipReason(String(token.reason ?? ""));

  const name   = (token.tokenName?.trim() && token.tokenName !== "Unknown" && token.tokenName !== "?")
    ? token.tokenName : (token.tokenMint?.slice(0, 6) ?? "—");
  const symbol = (token.tokenSymbol?.trim() && token.tokenSymbol !== "?")
    ? token.tokenSymbol : (token.tokenMint?.slice(0, 6) ?? "—");

  const timeStr = (() => {
    try { return new Date(token.detectedAt).toLocaleTimeString(); } catch { return "—"; }
  })();

  const verifyUrl = skipReasonLink(label, token.tokenMint ?? "");
  const dexUrl    = `https://dexscreener.com/solana/${token.tokenMint ?? ""}`;

  return (
    <div
      className="bg-card border border-border border-l-2 border-l-losses/50 rounded-xl p-3 shadow-[0_2px_12px_rgba(0,0,0,0.25)] cursor-pointer hover:border-border/80 transition-colors"
      onClick={() => window.open(dexUrl, "_blank", "noopener,noreferrer")}
    >
      <div className="flex items-start gap-3">
        <TokenLogo logoUrl={token.logoUrl} symbol={symbol} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-xs text-white truncate">{name}</p>
              <p className="text-[10px] font-mono text-primary tracking-wider">{symbol}</p>
              <CopyAddress address={token.tokenMint} />
            </div>
            {/* Badge taps open the targeted verification link — stopPropagation prevents card nav */}
            <button
              className="text-[7.5px] px-1.5 py-0.5 rounded-lg border font-bold uppercase tracking-wide text-losses border-losses/40 bg-losses/8 shrink-0 hover:bg-losses/15 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                window.open(verifyUrl, "_blank", "noopener,noreferrer");
              }}
            >
              {label} ↗
            </button>
          </div>
          <div className="flex gap-3 text-[8.5px] mt-1.5">
            <p>
              <span className="text-muted-foreground">Liq: </span>
              <LiqDisplay liq={token.liquidityUsd} />
            </p>
            {token.marketCap != null && (
              <p>
                <span className="text-muted-foreground">MCap: </span>
                <span className="font-mono font-bold text-primary">${fmtUsd(token.marketCap)}</span>
              </p>
            )}
          </div>
          <div className="mt-1.5 bg-losses/5 border border-losses/20 rounded-lg px-2 py-1">
            <p className="text-[8px] text-losses/80 leading-relaxed">{detail}</p>
          </div>
        </div>
      </div>
      <p className="text-[7.5px] text-muted-foreground/40 mt-2 text-right font-mono">{timeStr}</p>
    </div>
  );
}

function SkippedList() {
  const { data, isLoading } = useQuery({
    queryKey:        ["tokens-skipped"],
    queryFn:         () => fetch("/api/tokens/skipped?limit=50").then(r => r.json()),
    refetchInterval: 8_000,
  });
  const tokens = Array.isArray(data) ? data : [];
  if (isLoading) return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
    </div>
  );
  if (tokens.length === 0) return (
    <div className="text-center py-12 text-muted-foreground">
      <Shield size={28} className="mx-auto mb-3 opacity-20" />
      <p className="text-sm font-mono uppercase tracking-wider">No skipped tokens</p>
      <p className="text-[10px] mt-1">Risk gate rejections appear here</p>
    </div>
  );
  return (
    <div className="space-y-2">
      {tokens.map((t: any, i: number) => <SkippedCard key={t?.id ?? i} token={t} />)}
    </div>
  );
}

const TEN_MINUTES_MS = 10 * 60 * 1000;

// ── Scan pulse animation ──────────────────────────────────────────────────────
function ScanPulse() {
  return (
    <span className="relative inline-flex items-center justify-center w-3 h-3 shrink-0">
      <span className="absolute inline-flex h-full w-full rounded-full bg-primary/40 animate-ping" />
      <Radio size={10} className="relative text-primary" />
    </span>
  );
}

export default function Tokens() {
  // Re-render every 5 s to apply the time-based token filter
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

  const { data: tokens, isLoading } = useQuery({
    queryKey:        ["tokens-recent"],
    queryFn:         () => fetch("/api/tokens/recent?limit=100").then(r => r.json()),
    refetchInterval: 8_000, // matches scanner cycle
  });
  const [tab, setTab] = useState<"recent" | "skipped">("recent");

  // Detected tab rules:
  //  1. Never show "risky" safetyStatus — those belong in Skipped
  //  2. Remove anything >10 min old
  //  3. Deduplicate by tokenMint — keep the most recently detected entry per mint
  const rawList = (Array.isArray(tokens) ? tokens : [])
    .filter((t: any) => {
      if (t.safetyStatus === "risky") return false;           // risky → Skipped only
      const age = now - new Date(t.detectedAt).getTime();
      if (age >= TEN_MINUTES_MS) return false;                // too old
      return true;
    });

  // Dedup by tokenMint — keep first (DB returns most-recent first)
  const seenMints = new Set<string>();
  const tokenList = rawList.filter((t: any) => {
    const mint = t.tokenMint;
    if (!mint || seenMints.has(mint)) return false;
    seenMints.add(mint);
    return true;
  });

  return (
    <Layout>
      <div className="px-3 pb-4 space-y-3 max-w-lg mx-auto">
        {/* Header with scan pulse */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-primary tracking-[0.2em] uppercase flex items-center gap-2">
              <ScanPulse /> Token Radar
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
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
          ) : tokenList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Coins size={28} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-mono uppercase tracking-wider">Scanner active</p>
              <p className="text-[10px] mt-1">Tokens with ≥$15k liquidity and 5+ buys appear here</p>
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
