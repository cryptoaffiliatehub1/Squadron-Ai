import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, TrendingUp, TrendingDown, Zap, FlaskConical,
  Target, Trophy, BarChart2, Globe, Twitter, ExternalLink,
  AlertTriangle, CheckCircle2, Layers, Flame,
} from "lucide-react";
import { useTradingMode } from "@/contexts/trading-mode";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtUsd(n: number | null | undefined, sign = false): string {
  if (n == null) return "—";
  const abs = Math.abs(n);
  const prefix = sign ? (n >= 0 ? "+" : "-") : n < 0 ? "-" : "";
  if (abs >= 1000) return `${prefix}$${abs.toFixed(0)}`;
  if (abs >= 1)    return `${prefix}$${abs.toFixed(2)}`;
  return `${prefix}$${abs.toFixed(4)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

// ── Tier badge ────────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier?: string }) {
  const map: Record<string, string> = {
    BONDING: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10",
    MOON:    "text-purple-400 border-purple-500/40 bg-purple-500/10",
    SAFE:    "text-gains border-gains/40 bg-gains/10",
  };
  const cls = map[tier ?? ""] ?? "text-muted-foreground border-border bg-card";
  return (
    <span className={`text-[7px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider ${cls}`}>
      {tier ?? "?"}
    </span>
  );
}

// ── Lifecycle badge ───────────────────────────────────────────────────────────

function LifecycleBadge({ status, relaxed }: { status?: string; relaxed?: boolean }) {
  if (!status || status === "OPEN") {
    const cls = relaxed
      ? "text-yellow-400 border-yellow-500/40 bg-yellow-500/10"
      : "text-gains border-gains/40 bg-gains/10";
    return (
      <span className={`text-[7px] px-1.5 py-0.5 rounded border font-bold uppercase ${cls}`}>
        {relaxed ? "SIM-RELAXED" : "BUY"}
      </span>
    );
  }
  const map: Record<string, string> = {
    "PARTIAL EXIT": "text-amber-400 border-amber-500/40 bg-amber-500/10",
    "WIN":          "text-gains border-gains/40 bg-gains/10",
    "MOONBAG":      "text-purple-400 border-purple-500/40 bg-purple-500/10",
    "LOSS":         "text-losses border-losses/40 bg-losses/10",
    "MOONBAG EXIT": "text-orange-400 border-orange-500/40 bg-orange-500/10",
  };
  const labels: Record<string, string> = {
    "PARTIAL EXIT": "PARTIAL EXIT",
    "WIN":          "WIN",
    "MOONBAG":      "MOONBAG",
    "LOSS":         "STOP LOSS",
    "MOONBAG EXIT": "MOONBAG EXIT",
  };
  const cls = map[status] ?? "text-muted-foreground border-border bg-card";
  return (
    <span className={`text-[7px] px-1.5 py-0.5 rounded border font-bold uppercase ${cls}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ── Social icon row ───────────────────────────────────────────────────────────

function SocialRow({ mint, links }: {
  mint: string;
  links?: { twitter?: string; telegram?: string; website?: string } | null;
}) {
  return (
    <div className="flex items-center gap-2">
      {/* DexScreener — always shown */}
      <a
        href={`https://dexscreener.com/solana/${mint}`}
        target="_blank"
        rel="noreferrer"
        className="text-muted-foreground hover:text-primary transition-colors"
        title="DexScreener"
      >
        <ExternalLink size={9} />
      </a>
      {links?.twitter && (
        <a href={links.twitter} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-[#1DA1F2] transition-colors" title="Twitter">
          <Twitter size={9} />
        </a>
      )}
      {links?.telegram && (
        <a href={links.telegram} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-[#2CA5E0] transition-colors" title="Telegram">
          <Zap size={9} />
        </a>
      )}
      {links?.website && (
        <a href={links.website} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-gains transition-colors" title="Website">
          <Globe size={9} />
        </a>
      )}
    </div>
  );
}

// ── Token logo ────────────────────────────────────────────────────────────────

function TokenLogo({ logoUrl, symbol }: { logoUrl?: string | null; symbol?: string }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={symbol ?? ""}
        className="w-8 h-8 rounded-full object-cover shrink-0 border border-border"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
      <span className="text-[9px] font-bold text-primary uppercase">{(symbol ?? "?").slice(0, 2)}</span>
    </div>
  );
}

// ── Trade card ────────────────────────────────────────────────────────────────

function TradeCard({ t }: { t: any }) {
  const ep = t.entryPrice as number | null;
  const cp = (t.currentPrice ?? ep) as number | null;

  const pnlUsd: number | null =
    t.status === "OPEN" && ep && cp
      ? (cp - ep) / ep * t.positionSizeUsd
      : (t.pnlUsd ?? null);

  const pnlPct: number | null =
    t.status === "OPEN" && ep && cp
      ? (cp - ep) / ep * 100
      : t.exitMultiplier != null
        ? (t.exitMultiplier - 1) * 100
        : ep && cp ? (cp - ep) / ep * 100 : null;

  const pnlPos = pnlUsd == null ? null : pnlUsd >= 0;

  return (
    <div className={`bg-card border rounded-xl p-3 space-y-2 ${
      t.status === "MOONBAG" ? "border-purple-500/30" :
      t.status === "LOSS" ? "border-losses/20" :
      t.status === "PARTIAL EXIT" || t.status === "WIN" ? "border-gains/20" :
      "border-border"
    }`}>
      {/* Row 1: logo + name + badges */}
      <div className="flex items-start gap-2">
        <TokenLogo logoUrl={t.logoUrl} symbol={t.tokenSymbol} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[11px] uppercase truncate">{t.tokenSymbol}</span>
            <TierBadge tier={t.tier} />
            <LifecycleBadge status={t.status} relaxed={t.relaxedMode} />
          </div>
          <p className="text-[8px] text-muted-foreground truncate mt-0.5">{t.tokenName}</p>
        </div>
        {/* P&L */}
        <div className="text-right shrink-0">
          <p className={`font-mono font-bold text-[11px] ${pnlPos === true ? "text-gains" : pnlPos === false ? "text-losses" : "text-muted-foreground"}`}>
            {fmtUsd(pnlUsd, true)}
          </p>
          {pnlPct != null && (
            <p className={`text-[8px] font-mono ${pnlPos === true ? "text-gains/70" : pnlPos === false ? "text-losses/70" : "text-muted-foreground"}`}>
              {fmtPct(pnlPct)}
            </p>
          )}
        </div>
      </div>

      {/* Row 2: price + position + score + regime */}
      <div className="flex items-center gap-3 flex-wrap text-[7.5px] text-muted-foreground">
        <span>ENTRY <span className="font-mono text-foreground">${ep?.toFixed(8) ?? "—"}</span></span>
        {cp && ep && cp !== ep && (
          <span>NOW <span className={`font-mono ${cp > ep ? "text-gains" : "text-losses"}`}>${cp.toFixed(8)}</span></span>
        )}
        <span>SIZE <span className="font-mono text-foreground">${t.positionSizeUsd}</span></span>
        <span>SCORE <span className="font-mono text-primary">{typeof t.probabilityScore === "number" ? Math.round(t.probabilityScore) : "—"}</span></span>
        {t.regime && <span className="text-muted-foreground/60 uppercase">{t.regime}</span>}
      </div>

      {/* Row 3: social icons */}
      <SocialRow mint={t.tokenMint} links={t.socialLinks} />
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string;
  color?: "gains" | "losses" | "default" | "primary";
}) {
  const cls = color === "gains" ? "text-gains" : color === "losses" ? "text-losses" : color === "primary" ? "text-primary" : "text-white";
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="text-[7.5px] text-muted-foreground uppercase tracking-[0.2em] font-bold">{label}</p>
      <p className={`text-lg font-black font-mono mt-0.5 leading-none ${cls}`}>{value}</p>
      {sub && <p className="text-[7.5px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Simulation() {
  const { isPaper, isLive } = useTradingMode();

  const { data: simBal, isLoading: simLoading } = useQuery({
    queryKey: ["sim-balance"],
    queryFn: () => fetch("/api/sim/balance").then(r => r.json()),
    refetchInterval: 30_000,
  });

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ["daily-report"],
    queryFn: () => fetch("/api/paper/report").then(r => r.json()),
    refetchInterval: 30_000,
  });

  const { data: trades, isLoading: tradesLoading } = useQuery({
    queryKey: ["paper-trades"],
    queryFn: () => fetch("/api/paper/trades").then(r => r.json()),
    refetchInterval: 30_000,
  });

  const sb = simBal as any;
  const rp = report as any;
  const paperTrades: any[] = (trades as any[]) ?? [];

  const winRate   = rp?.winRate ?? 0;
  const totalTrades = rp?.totalTrades ?? 0;
  const expectancy  = rp?.expectancy ?? 0;
  const avgWinUsd   = rp?.avgWinUsd ?? 0;
  const avgLossUsd  = rp?.avgLossUsd ?? 0;

  const dailyPnL      = sb?.todayPnL ?? 0;
  const dailyTarget   = sb?.dailyTarget ?? 0;
  const aboveTarget   = sb?.aboveTarget ?? false;
  const progressPct   = sb?.dailyProgressPct ?? 0;
  const simBalance    = sb?.simBalance ?? 100;
  const totalPnL      = sb?.totalPnL ?? 0;
  const returnPct     = sb?.returnPct ?? 0;
  const openPositions = sb?.openPositions ?? 0;
  const moonbagCount  = sb?.moonbagCount ?? 0;

  const panelCls = "bg-card border border-border rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.25)]";
  const progressBarPct = Math.min(Math.max(progressPct, 0), 100);

  return (
    <Layout>
      <div className="px-3 pb-4 space-y-3 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-primary tracking-[0.2em] uppercase flex items-center gap-2">
              <Activity size={12} /> Simulation
            </h1>
            <p className="text-[8px] text-muted-foreground uppercase tracking-[0.25em] mt-0.5">
              Paper trading engine · updates every 30s
            </p>
          </div>
          <span className={`text-[8.5px] px-2 py-1 rounded-lg border font-bold uppercase tracking-wider ${
            isPaper
              ? "text-yellow-400 border-yellow-500/40 bg-yellow-500/10"
              : "text-gains border-gains/40 bg-gains/10 animate-pulse"
          }`}>
            {isPaper ? <><FlaskConical size={8} className="inline mr-1" />SIM</> : <><Zap size={8} className="inline mr-1" />LIVE</>}
          </span>
        </div>

        {/* Live mode notice */}
        {isLive && (
          <div className="bg-gains/8 border border-gains/40 rounded-xl px-3 py-2.5 flex items-start gap-2 animate-pulse">
            <Zap size={11} className="text-gains shrink-0 mt-0.5" />
            <div>
              <p className="text-[8.5px] text-gains font-bold uppercase tracking-wider">LIVE MODE ACTIVE</p>
              <p className="text-[8px] text-gains/60 mt-0.5">Real trades are executing. Switch to SIM on the header to stop.</p>
            </div>
          </div>
        )}

        {/* SIM BALANCE panel */}
        {simLoading ? (
          <Skeleton className="h-28 rounded-xl" />
        ) : (
          <div className={`${panelCls} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[8px] text-muted-foreground uppercase tracking-[0.2em]">Sim Balance</p>
              <div className="flex items-center gap-2">
                {openPositions > 0 && (
                  <span className="text-[7.5px] text-primary border border-primary/30 rounded px-1.5 py-0.5 font-bold">
                    {openPositions} OPEN
                  </span>
                )}
                {moonbagCount > 0 && (
                  <span className="text-[7.5px] text-purple-400 border border-purple-500/30 rounded px-1.5 py-0.5 font-bold">
                    {moonbagCount} MOONBAG{moonbagCount > 1 ? "S" : ""}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className={`text-3xl font-black font-mono leading-none ${totalPnL >= 0 ? "text-gains" : "text-losses"}`}>
                ${simBalance.toFixed(2)}
              </p>
              <p className={`text-sm font-mono font-bold mb-0.5 ${totalPnL >= 0 ? "text-gains/70" : "text-losses/70"}`}>
                {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)} ({returnPct >= 0 ? "+" : ""}{returnPct.toFixed(1)}%)
              </p>
            </div>
            <p className="text-[7.5px] text-muted-foreground mt-1">Started at $100 · net realized P&L only</p>
          </div>
        )}

        {/* 30% Daily compounding target */}
        {simLoading ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : (
          <div className={`${panelCls} p-3`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Target size={9} className={aboveTarget ? "text-yellow-400" : "text-primary"} />
                <p className="text-[8px] text-muted-foreground uppercase tracking-[0.2em]">Daily 30% Target</p>
              </div>
              <div className="text-right">
                <span className={`text-[8px] font-mono font-bold ${aboveTarget ? "text-yellow-400" : dailyPnL >= 0 ? "text-gains" : "text-losses"}`}>
                  {dailyPnL >= 0 ? "+" : ""}${dailyPnL.toFixed(2)}
                </span>
                <span className="text-[7.5px] text-muted-foreground ml-1">/ ${dailyTarget.toFixed(2)} target</span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${aboveTarget ? "bg-yellow-400" : "bg-primary"}`}
                style={{ width: `${progressBarPct}%` }}
              />
            </div>
            {aboveTarget && (
              <p className="text-[7.5px] text-yellow-400 font-bold uppercase mt-1 tracking-wider flex items-center gap-1">
                <Flame size={8} /> ABOVE TARGET — outstanding performance
              </p>
            )}
            {!aboveTarget && (
              <p className="text-[7.5px] text-muted-foreground mt-1">
                {progressBarPct.toFixed(0)}% toward daily goal · resets at midnight UTC
              </p>
            )}
          </div>
        )}

        {/* Stats grid */}
        {reportLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Win Rate"
              value={`${(winRate * 100).toFixed(1)}%`}
              color={winRate >= 0.5 ? "gains" : "losses"}
              sub={`${totalTrades} total trades`}
            />
            <StatCard
              label="Expectancy"
              value={`${expectancy >= 0 ? "+" : ""}${fmtUsd(expectancy)}`}
              sub="avg per trade"
              color={expectancy >= 0 ? "gains" : "losses"}
            />
            <StatCard
              label="Avg Win"
              value={`+${fmtUsd(avgWinUsd)}`}
              color="gains"
              sub="realized"
            />
            <StatCard
              label="Avg Loss"
              value={`-${fmtUsd(Math.abs(avgLossUsd))}`}
              color="losses"
              sub="realized"
            />
          </div>
        )}

        {/* Win/Loss bar */}
        {!reportLoading && totalTrades > 0 && (
          <div className={`${panelCls} p-3`}>
            <div className="flex justify-between text-[8px] mb-1.5">
              <span className="text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Trophy size={8} className="text-gains" /> Win / Loss
              </span>
              <span className={`font-mono font-bold ${winRate >= 0.5 ? "text-gains" : "text-losses"}`}>
                {(winRate * 100).toFixed(0)}% wins
              </span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden gap-px">
              <div className="bg-gains rounded-l-full transition-all" style={{ width: `${winRate * 100}%` }} />
              <div className="bg-losses rounded-r-full transition-all flex-1" />
            </div>
          </div>
        )}

        {/* Trade log */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1">
              <BarChart2 size={8} /> Trade Log
            </p>
            {paperTrades.length > 0 && (
              <span className="text-[8px] text-primary font-mono font-bold">{paperTrades.length} entries</span>
            )}
          </div>

          {tradesLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          ) : paperTrades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity size={24} className="mx-auto mb-2 opacity-20" />
              <p className="text-xs font-mono uppercase">No trades yet</p>
              <p className="text-[9px] text-muted-foreground/60 mt-1">Start the bot to begin paper trading</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...paperTrades].reverse().slice(0, 50).map((t: any) => (
                <TradeCard key={t.id} t={t} />
              ))}
            </div>
          )}
        </div>

        {/* Daily compounding history section */}
        {!simLoading && sb && (
          <div className={`${panelCls} p-3`}>
            <div className="flex items-center gap-1.5 mb-2">
              <Layers size={9} className="text-primary" />
              <p className="text-[8px] text-muted-foreground uppercase tracking-[0.2em]">Daily Compounding</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[7px] text-muted-foreground uppercase tracking-wider">Start</p>
                <p className="font-mono text-[11px] font-bold">${sb.todayStartBalance?.toFixed(2) ?? "—"}</p>
              </div>
              <div>
                <p className="text-[7px] text-muted-foreground uppercase tracking-wider">Target</p>
                <p className="font-mono text-[11px] font-bold text-primary">+${dailyTarget.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[7px] text-muted-foreground uppercase tracking-wider">Today</p>
                <p className={`font-mono text-[11px] font-bold ${dailyPnL >= 0 ? "text-gains" : "text-losses"}`}>
                  {dailyPnL >= 0 ? "+" : ""}${dailyPnL.toFixed(2)}
                </p>
              </div>
            </div>
            <p className="text-[7px] text-muted-foreground/50 mt-2 text-center">
              30% daily target is a benchmark · never stops or forces trades · resets fully at midnight UTC
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
