import { useState } from "react";
import { Layout } from "@/components/layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Skull, Radio, Wifi, CheckCircle2, XCircle, AlertCircle,
  TrendingUp, TrendingDown, Zap, Moon, Shield, Activity,
  BarChart2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTradingMode } from "@/contexts/trading-mode";
import { useBot } from "@/contexts/bot";

function RegimeBadge({ regime }: { regime?: string }) {
  const map: Record<string, { label: string; cls: string; glow: string }> = {
    MANIA:      { label: "⚡ MANIA",      cls: "text-gains border-gains/50 bg-gains/10",           glow: "shadow-[0_0_16px_rgba(0,255,163,0.25)]" },
    CHOP:       { label: "〰 CHOP",       cls: "text-yellow-400 border-yellow-400/50 bg-yellow-400/10", glow: "shadow-[0_0_16px_rgba(250,204,21,0.15)]" },
    RUG_CYCLE:  { label: "☠ RUG CYCLE",  cls: "text-losses border-losses/50 bg-losses/10",         glow: "shadow-[0_0_16px_rgba(255,59,92,0.25)]" },
    DEATH_ZONE: { label: "💀 DEATH ZONE", cls: "text-red-600 border-red-700/50 bg-red-900/20",      glow: "shadow-[0_0_16px_rgba(220,38,38,0.3)]" },
  };
  const r = map[regime ?? "CHOP"] ?? map["CHOP"];
  return (
    <span className={`inline-flex text-[9px] px-2.5 py-1 rounded-lg border font-bold uppercase tracking-wider ${r.cls} ${r.glow}`}>
      {r.label}
    </span>
  );
}

function RegimeDescription({ regime }: { regime?: string }) {
  const desc: Record<string, string> = {
    MANIA:      "High momentum. Multipliers elevated. Aggressive entries.",
    CHOP:       "Sideways market. Reduced sizing. Wait for breakouts.",
    RUG_CYCLE:  "Rug pull spike. Risk gate hardened. Caution.",
    DEATH_ZONE: "Market collapse. All entries suspended.",
  };
  return <p className="text-[8.5px] text-muted-foreground mt-1.5 leading-relaxed">{desc[regime ?? "CHOP"] ?? desc["CHOP"]}</p>;
}

function CircuitStateBadge({ state: cs }: { state?: string }) {
  if (!cs || cs === "NORMAL") return (
    <span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase text-gains border-gains/30">
      <span className="w-1 h-1 rounded-full bg-gains" /> Normal
    </span>
  );
  if (cs === "FORTRESS_LOCKED") return (
    <span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase text-losses border-losses/50 animate-pulse">
      🔒 Fortress
    </span>
  );
  if (cs === "OBSERVATION_MODE") return (
    <span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase text-yellow-400 border-yellow-400/50">
      👁 Observe
    </span>
  );
  if (cs === "GLOBAL_FLOOR_HIT") return (
    <span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase text-red-400 border-red-500/50 animate-pulse">
      ⛔ Floor Hit
    </span>
  );
  if (cs === "LOW_BALANCE_PAUSE") return (
    <span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase text-yellow-400 border-yellow-400/50">
      ⏸ Low Bal
    </span>
  );
  return <span className="text-[8px] text-muted-foreground border border-border px-1.5 py-0.5 rounded">{cs}</span>;
}

function ExposureRing({ active, max }: { active: number; max: number }) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const filled = Math.min(active / max, 1) * circumference;
  const color = active === 0 ? "#374151" : active >= max ? "#FF3B5C" : "#00FFA3";
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="mx-auto">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#1e2530" strokeWidth="6" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={`${filled} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dasharray 0.6s ease", filter: active > 0 ? `drop-shadow(0 0 4px ${color}66)` : "none" }}
      />
      <text x="36" y="40" textAnchor="middle" fill={color} fontSize="13" fontWeight="700" fontFamily="JetBrains Mono">
        {active}/{max}
      </text>
    </svg>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  dexscreener: "DEX Screener",
  pumpfun:     "Pump.fun WS",
  birdeye:     "Birdeye API",
};

export default function Dashboard() {
  const { toast } = useToast();
  const { isPaper, isLive } = useTradingMode();
  const { isRunning, toggleBot, isPending: botPending, botData } = useBot();
  const qc = useQueryClient();

  const { data: sys }      = useQuery({ queryKey: ["system-status"],  queryFn: () => fetch("/api/system/status").then(r => r.json()),      refetchInterval: 5000 });
  const { data: wallet }   = useQuery({ queryKey: ["wallet-balance"], queryFn: () => fetch("/api/wallet/balance").then(r => r.json()),     refetchInterval: 10000 });
  const { data: pnl }      = useQuery({ queryKey: ["pnl-summary"],    queryFn: () => fetch("/api/trades/pnl").then(r => r.json()) });
  const { data: moonbags } = useQuery({ queryKey: ["moonbags"],       queryFn: () => fetch("/api/moonbags").then(r => r.json()),           refetchInterval: 15000 });
  const { data: readiness }= useQuery({ queryKey: ["readiness"],      queryFn: () => fetch("/api/system/readiness").then(r => r.json()) });
  const { data: tokens }   = useQuery({ queryKey: ["tokens-recent"],  queryFn: () => fetch("/api/tokens/recent?limit=50").then(r => r.json()), refetchInterval: 8_000 });
  const { data: circuit }  = useQuery({ queryKey: ["circuit"],        queryFn: () => fetch("/api/circuit").then(r => r.json()),           refetchInterval: 5000 });
  const { data: scanner }  = useQuery({ queryKey: ["scanner-status"], queryFn: () => fetch("/api/scanner/status").then(r => r.json()),    refetchInterval: 5000 });
  const { data: weights }  = useQuery({ queryKey: ["weights"],        queryFn: () => fetch("/api/weights").then(r => r.json()) });
  const { data: scanStats }= useQuery({ queryKey: ["scan-stats"],     queryFn: () => fetch("/api/scan-stats").then(r => r.json()),     refetchInterval: 30_000 });

  const killSwitch = useMutation({
    mutationFn: () => fetch("/api/system/kill-switch", { method: "POST" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries(); toast({ title: "Kill switch engaged", description: "All trading halted" }); },
  });
  const resetFortress = useMutation({
    mutationFn: () => fetch("/api/system/reset-fortress", { method: "POST" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries(); toast({ title: "Fortress reset" }); },
  });

  const circuitState  = (circuit as any)?.state ?? "NORMAL";
  const botLocked     = circuitState !== "NORMAL" && circuitState !== "LOW_BALANCE_PAUSE";
  const systemAtRisk  = (weights as any)?.systemAtRisk;
  const dailyPnl      = (pnl as any)?.dailyPnlUsd ?? 0;
  const dailyPnlPct   = (pnl as any)?.dailyPnlPct ?? 0;
  // Fix 1: always coerce to number — never call toFixed on a raw API value
  const solBalance    = Number((wallet as any)?.solBalance   ?? 0) || 0;
  const usdBalance    = Number((wallet as any)?.usdValue     ?? 0) || 0;
  const maxTrade      = Number((wallet as any)?.maxTradeAmount ?? 0) || 0;
  const regime        = (sys as any)?.regime?.regime ?? "CHOP";
  const moonbagList   = (moonbags as any)?.positions ?? [];
  // Fix 5: dedup by tokenName, keep highest liquidityUsd, show 5 most recent
  const TEN_MIN = 10 * 60 * 1000;
  const _rawTokens = ((tokens as any[]) ?? [])
    .filter((t: any) => Date.now() - new Date(t.detectedAt).getTime() < TEN_MIN);
  const _nameMap = new Map<string, any>();
  for (const t of _rawTokens) {
    const key = (t.tokenName ?? t.tokenSymbol ?? "").toLowerCase().trim();
    const ex = _nameMap.get(key);
    if (!ex || Number(t.liquidityUsd ?? 0) > Number(ex.liquidityUsd ?? 0)) _nameMap.set(key, t);
  }
  const tokenList = [..._nameMap.values()].slice(0, 5);
  const scannerSource    = (scanner as any)?.activeSource ?? "dexscreener";
  const failoverLog      = (scanner as any)?.failoverLog ?? [];
  const lastScanTs: string | null = (scanner as any)?.lastSuccessfulScan ?? null;
  const lastTokenCount: number    = (scanner as any)?.lastTokenCount ?? 0;

  // Format last poll time as relative seconds/minutes ago
  function fmtScanAge(ts: string | null): string {
    if (!ts) return "—";
    const diffMs = Date.now() - new Date(ts).getTime();
    const secs = Math.floor(diffMs / 1_000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    return `${mins}m ago`;
  }
  const dailyGainPct  = Number((circuit as any)?.dailyGainPct ?? 0) || 0;
  const drawdownPct   = Math.abs(Math.min(0, dailyGainPct));
  const gainPct       = Math.max(0, dailyGainPct);
  const strikes       = (circuit as any)?.consecutiveLosses ?? 0;
  const readyChecks   = (readiness as any)?.checks ?? {};

  const panelCls = `bg-card border border-border rounded-xl p-3 shadow-[0_2px_16px_rgba(0,0,0,0.3)]`;
  const labelCls = "text-[8px] text-muted-foreground uppercase tracking-[0.2em] font-bold";

  return (
    <Layout>
      <div className="px-3 pb-4 space-y-2 max-w-lg mx-auto">

        {/* ── SYSTEM ALERTS ── */}
        {systemAtRisk && (
          <div className="bg-losses/10 border border-losses/50 rounded-xl px-3 py-2 flex items-center gap-2 animate-pulse">
            <Skull size={11} className="text-losses shrink-0" />
            <span className="text-[8.5px] text-losses font-bold uppercase tracking-wider">SYSTEM AT RISK — Negative expectancy detected</span>
          </div>
        )}
        {circuitState === "FORTRESS_LOCKED" && (
          <div className="bg-losses/10 border border-losses/50 rounded-xl px-3 py-2 space-y-1.5">
            <p className="text-[8.5px] text-losses font-bold uppercase">🔒 FORTRESS LOCKED — Daily loss limit reached. Scanner paused 12h.</p>
            <Button size="sm" variant="destructive" className="h-6 text-[9px] px-2.5" onClick={() => resetFortress.mutate()}>
              Reset Fortress
            </Button>
          </div>
        )}
        {circuitState === "GLOBAL_FLOOR_HIT" && (
          <div className="bg-red-950 border border-red-600/60 rounded-xl px-3 py-2 space-y-1.5">
            <p className="text-[8.5px] text-red-400 font-bold uppercase">⛔ GLOBAL FLOOR HIT — Manual restart required</p>
            <Button size="sm" variant="destructive" className="h-6 text-[9px] px-2.5" onClick={() => resetFortress.mutate()}>
              Confirm Restart
            </Button>
          </div>
        )}

        {/* ── BENTO GRID ── */}
        <div className="grid grid-cols-2 gap-2">

          {/* 1 ── EQUITY HUD (full width) ── */}
          <div className={`col-span-2 ${panelCls} ${isPaper ? "border-yellow-500/30" : "border-gains/30"}`}>
            <div className={`absolute inset-0 rounded-xl opacity-30 pointer-events-none ${
              isPaper
                ? "bg-gradient-to-br from-yellow-500/5 to-transparent"
                : "bg-gradient-to-br from-gains/5 to-transparent"
            }`} style={{ position: "absolute" }} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className={labelCls}>Equity</p>
                <div className="flex items-end gap-2 mt-0.5">
                  <span className="text-[22px] font-black font-mono text-white leading-none">{solBalance.toFixed(4)}</span>
                  <span className="text-xs text-muted-foreground mb-0.5">SOL</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">${usdBalance.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className={labelCls}>24h P&L</p>
                <p className={`text-lg font-black font-mono leading-none mt-0.5 ${dailyPnl >= 0 ? "text-gains" : "text-losses"}`}>
                  {dailyPnl >= 0 ? "+" : ""}${Math.abs(dailyPnl).toFixed(2)}
                </p>
                <p className={`text-[10px] font-mono font-bold mt-0.5 ${dailyPnlPct >= 0 ? "text-gains" : "text-losses"}`}>
                  {dailyPnlPct >= 0 ? "▲" : "▼"} {Math.abs(dailyPnlPct).toFixed(2)}%
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/40">
              <div className="flex items-center gap-2">
                <CircuitStateBadge state={circuitState} />
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="h-6 text-[8.5px] px-2 font-bold uppercase"
                onClick={() => { if (confirm("Engage kill switch? All trading halts.")) killSwitch.mutate(); }}
                disabled={killSwitch.isPending}
              >
                <Skull size={8} className="mr-1" /> Kill All
              </Button>
            </div>
          </div>

          {/* 2 ── REGIME (half) ── */}
          <div className={panelCls}>
            <p className={labelCls}>Market Regime</p>
            <div className="mt-2">
              <RegimeBadge regime={regime} />
              <RegimeDescription regime={regime} />
            </div>
          </div>

          {/* 3 ── EXPOSURE MATRIX (half) ── */}
          <div className={panelCls}>
            <p className={labelCls}>Exposure</p>
            <div className="mt-1">
              <ExposureRing active={Math.min((sys as any)?.bot?.activePositions ?? 0, 3)} max={3} />
              <div className="text-center mt-1 space-y-0.5">
                <p className="text-[8.5px] text-muted-foreground">Max: {maxTrade.toFixed(3)} SOL</p>
                {(botData as any)?.conservativeMode && (
                  <p className="text-[8px] text-blue-400 font-bold">⬇ Conservative 5%</p>
                )}
              </div>
            </div>
          </div>

          {/* 4 ── DRAWDOWN TRACKER (full) ── */}
          <div className={`col-span-2 ${panelCls}`}>
            <p className={labelCls}>Drawdown Tracker</p>
            <div className="mt-2 space-y-2.5">
              <div>
                <div className="flex justify-between text-[8.5px] mb-1">
                  <span className="text-muted-foreground">Daily Gain</span>
                  <span className={`font-mono font-bold ${gainPct > 0 ? "text-gains" : "text-muted-foreground"}`}>
                    +{gainPct.toFixed(2)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-border/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gains rounded-full transition-all"
                    style={{ width: `${Math.min(gainPct * 2, 100)}%`, boxShadow: gainPct > 0 ? "0 0 6px rgba(0,255,163,0.5)" : "none" }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[8.5px] mb-1">
                  <span className="text-muted-foreground">Drawdown</span>
                  <span className={`font-mono font-bold ${drawdownPct > 5 ? "text-losses" : "text-muted-foreground"}`}>
                    -{drawdownPct.toFixed(2)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-border/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-losses rounded-full transition-all"
                    style={{ width: `${Math.min(drawdownPct * 10, 100)}%`, boxShadow: drawdownPct > 5 ? "0 0 6px rgba(255,59,92,0.5)" : "none" }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[8.5px] text-muted-foreground">Consecutive losses</span>
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map(i => (
                    <span key={i} className={`w-3 h-3 rounded flex items-center justify-center text-[7px] font-bold
                      ${i < strikes ? "bg-losses/20 border border-losses/50 text-losses" : "bg-border/40 border border-border text-muted-foreground/30"}`}>
                      {i + 1}
                    </span>
                  ))}
                  <span className={`text-[8px] font-mono font-bold ml-1 ${strikes >= 3 ? "text-losses" : "text-muted-foreground"}`}>
                    {strikes}/3
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5 ── BOT CONTROL (full) ── */}
          <div className={`col-span-2 ${panelCls} ${isRunning ? "border-gains/30" : ""}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={labelCls}>Bot Control</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-gains pulse-indicator" : "bg-muted-foreground/40"}`} />
                  <span className={`text-sm font-black uppercase font-mono ${isRunning ? "text-gains" : "text-muted-foreground"}`}>
                    {isRunning ? "SCANNING" : "IDLE"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right text-[8.5px] text-muted-foreground">
                  <p>Trades today: <span className="text-white font-mono">{(botData as any)?.tradesExecutedToday ?? 0}</span></p>
                  <p className="mt-0.5">Source: <span className={`font-bold ${
                    scannerSource === "dexscreener" ? "text-gains" : scannerSource === "pumpfun" ? "text-yellow-400" : "text-blue-400"
                  }`}>{SOURCE_LABELS[scannerSource] ?? scannerSource}</span></p>
                </div>
                <button
                  onClick={() => !botLocked && toggleBot(!isRunning)}
                  disabled={botPending || botLocked}
                  className={`w-12 h-6 rounded-full border relative transition-all shrink-0
                    ${isRunning ? "bg-gains border-gains/60" : "bg-border border-border"}
                    ${botLocked ? "opacity-40 cursor-not-allowed" : "cursor-pointer active:scale-95"}`}
                >
                  <span className={`absolute top-0.5 bottom-0.5 aspect-square rounded-full bg-white shadow-sm transition-all
                    ${isRunning ? "right-0.5" : "left-0.5"}`}
                  />
                </button>
              </div>
            </div>
            {/* Scanner heartbeat row */}
            <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between">
              <p className={`${labelCls} flex items-center gap-1`}>
                <Radio size={7} className={lastScanTs ? "text-gains" : "text-muted-foreground/40"} /> Last Poll
              </p>
              <div className="flex items-center gap-3 text-[7.5px] text-muted-foreground font-mono">
                <span className={lastScanTs ? "text-gains/80" : ""}>{fmtScanAge(lastScanTs)}</span>
                {lastTokenCount > 0 && (
                  <span className="text-muted-foreground/60">
                    <span className="text-white">{lastTokenCount}</span> tokens
                  </span>
                )}
              </div>
            </div>
            {failoverLog.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/30">
                <p className={`${labelCls} mb-1.5 flex items-center gap-1`}><Wifi size={7} /> Failover Log</p>
                <div className="space-y-0.5">
                  {failoverLog.slice(-3).map((e: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-[7.5px] text-muted-foreground">
                      <span className="text-yellow-400/70">{e.source}</span>
                      <span>{e.reason}</span>
                      <span className="font-mono">{new Date(e.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5.5 ── SCAN FUNNEL ── */}
          {(() => {
            const td = (scanStats as any)?.today;
            const wk = (scanStats as any)?.week;
            const scanned = td?.tokensScanned ?? 0;
            const funnel = [
              { label: "Scanned",       val: scanned,                 key: "tokensScanned"      },
              { label: "Liquidity ✓",   val: td?.passedLiquidity ?? 0, key: "passedLiquidity"   },
              { label: "Rug Check ✓",   val: td?.passedRugCheck ?? 0,  key: "passedRugCheck"    },
              { label: "Wallet ✓",      val: td?.passedWalletChecks ?? 0, key: "passedWalletChecks" },
              { label: "All Gates ✓",   val: td?.passedAllGates ?? 0,  key: "passedAllGates"    },
              { label: "Entries",        val: td?.actualEntries ?? 0,   key: "actualEntries"     },
            ];
            return (
              <div className={`col-span-2 ${panelCls}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`${labelCls} flex items-center gap-1`}>
                    <BarChart2 size={8} /> Scan Funnel
                  </p>
                  <span className="text-[7.5px] text-muted-foreground font-mono">Today / 7d</span>
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {funnel.map((row, i) => {
                    const pct = i === 0 || scanned === 0 ? 100 : Math.round((row.val / scanned) * 100);
                    const wkVal = (wk as any)?.[row.key] ?? 0;
                    const barW = Math.max(4, pct);
                    return (
                      <div key={row.key} className="flex flex-col items-center gap-0.5">
                        <span className={`text-[7px] font-mono font-bold ${
                          i === 0 ? "text-muted-foreground" :
                          i === funnel.length - 1 ? "text-gains" : "text-white"
                        }`}>{row.val}</span>
                        <div className="w-full bg-border/30 rounded-full h-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              i === funnel.length - 1 ? "bg-gains" :
                              i >= 4 ? "bg-gains/60" :
                              i >= 2 ? "bg-yellow-400/50" : "bg-muted-foreground/30"
                            }`}
                            style={{ width: `${barW}%` }}
                          />
                        </div>
                        <span className="text-[6px] text-muted-foreground text-center leading-tight">{row.label}</span>
                        <span className="text-[6px] text-muted-foreground/50 font-mono">{wkVal}w</span>
                      </div>
                    );
                  })}
                </div>
                {scanned === 0 && (
                  <p className="text-[7.5px] text-muted-foreground/50 text-center mt-2">
                    Stats accumulate as tokens are scanned
                  </p>
                )}
              </div>
            );
          })()}

          {/* 6 ── LIVE RADAR (full) ── */}
          <div className={`col-span-2 ${panelCls}`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`${labelCls} flex items-center gap-1`}>
                <Radio size={8} className={isRunning ? "text-gains" : ""} /> Live Radar
              </p>
              <span className={`text-[7.5px] font-bold uppercase ${
                scannerSource === "dexscreener" ? "text-gains" : scannerSource === "pumpfun" ? "text-yellow-400" : "text-blue-400"
              }`}>
                {SOURCE_LABELS[scannerSource] ?? scannerSource} ●
              </span>
            </div>
            {tokenList.length === 0 ? (
              <div className="text-center py-5">
                <Radio size={20} className={`mx-auto mb-2 ${isRunning ? "text-gains/40 animate-pulse" : "text-muted-foreground/20"}`} />
                <p className="text-[8.5px] text-muted-foreground">
                  {isRunning ? "Scanning — no tokens passed filters recently" : "Scanner idle — start the bot to begin"}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {tokenList.map((t: any) => {
                  const liq: number | null = t.liquidityUsd;
                  const fmtLiq = liq === null || liq === undefined
                    ? <span className="text-losses font-bold">N/A</span>
                    : <span className={liq >= 15_000 ? "text-gains font-bold" : "text-losses font-bold"}>
                        ${liq >= 1000 ? `${(liq / 1000).toFixed(1)}k` : liq.toFixed(0)}
                      </span>;
                  return (
                    <div key={t.id} className="flex items-center justify-between border-b border-border/20 pb-1.5 last:border-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[7.5px] font-mono shrink-0 ${isPaper ? "text-yellow-500/50" : "text-gains/50"}`}>
                            {isPaper ? "[SIM]" : "[LIVE]"}
                          </span>
                          <span className="text-[9px] font-bold text-white truncate">{t.tokenName ?? t.tokenSymbol}</span>
                          <span className="text-[7.5px] font-mono text-muted-foreground shrink-0">{t.tokenSymbol}</span>
                        </div>
                        <p className="text-[7.5px] text-muted-foreground pl-0">
                          Liq: {fmtLiq}
                        </p>
                      </div>
                      {/* Fix 3: show specific failure label if set, else status */}
                      <span className={`text-[7.5px] px-1.5 py-0.5 rounded border font-bold uppercase shrink-0 ml-2 ${
                        t.safetyStatus === "good"           ? "text-gains border-gains/30 bg-gains/5"
                        : t.safetyStatus === "pending"      ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/5"
                        : t.failureLabel === "UNVERIFIED"   ? "text-blue-400 border-blue-400/30 bg-blue-400/5"
                        : t.failureLabel === "HIGH SELLS"   ? "text-losses border-losses/30 bg-losses/5"
                        : t.failureLabel === "LOW VOLUME"   ? "text-orange-400 border-orange-400/30 bg-orange-400/5"
                        : t.failureLabel === "HOLDER CONC"  ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/5"
                        : t.failureLabel === "SUPPLY GAP"   ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/5"
                        : t.failureLabel === "FREEZE AUTH"  ? "text-losses border-losses/30 bg-losses/5"
                        : "text-losses border-losses/30 bg-losses/5"
                      }`}>
                        {t.failureLabel ?? t.safetyStatus}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 7 ── MOONBAG VAULT (full) ── */}
          <div className={`col-span-2 ${panelCls} border-l-2 ${isPaper ? "border-l-yellow-500/50" : "border-l-primary/60"}`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`${labelCls} flex items-center gap-1`}><Moon size={8} /> Moonbag Vault</p>
              <span className="text-[10px] font-black font-mono text-primary">
                {((moonbags as any)?.totalValueSol ?? 0).toFixed(4)} SOL
              </span>
            </div>
            {moonbagList.length === 0 ? (
              <p className="text-[8.5px] text-muted-foreground">
                Empty — 50% of profitable exits auto-move here at 2.5× gain. Cost basis = $0.
              </p>
            ) : (
              <div className="space-y-2">
                {moonbagList.map((m: any) => (
                  <div key={m.id} className="flex justify-between items-center border-b border-border/20 pb-1.5 last:border-0">
                    <div>
                      <p className="text-[10px] font-bold uppercase">{m.tokenSymbol}</p>
                      <p className="text-[7.5px] text-muted-foreground">Cost: $0 (recovered)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gains font-black font-mono">{(Number(m.currentMultiplier ?? 0) || 0).toFixed(2)}×</p>
                      <p className="text-[7.5px] text-muted-foreground">{(Number(m.currentValueSol ?? 0) || 0).toFixed(4)} SOL</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 8 ── WEIGHT DRIFT (full) ── */}
          {(weights as any)?.weights && (
            <div className={`col-span-2 ${panelCls}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`${labelCls} flex items-center gap-1`}><BarChart2 size={8} /> Block 17 Weights</p>
                {systemAtRisk && (
                  <span className="text-[7.5px] text-losses font-bold animate-pulse">⚠ SYSTEM AT RISK</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries((weights as any).weights as Record<string, number>).map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center">
                    <span className="text-[8px] text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1 bg-border/40 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(v, 100)}%` }} />
                      </div>
                      <span className="font-mono font-bold text-[8.5px] text-primary w-7 text-right">{v}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SYSTEM READINESS ── */}
          {Object.keys(readyChecks).length > 0 && (
            <div className={`col-span-2 ${panelCls}`}>
              <p className={`${labelCls} flex items-center gap-1 mb-2`}><Shield size={8} /> System Readiness</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(readyChecks as Record<string, boolean>).map(([k, ok]) => (
                  <div key={k} className="flex items-center gap-1.5">
                    {ok
                      ? <CheckCircle2 size={9} className="text-gains shrink-0" />
                      : <XCircle size={9} className="text-losses shrink-0" />
                    }
                    <span className={`text-[7.5px] capitalize ${ok ? "text-muted-foreground" : "text-losses"}`}>
                      {k.replace(/([A-Z])/g, " $1").toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}
