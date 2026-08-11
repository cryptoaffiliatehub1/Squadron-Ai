import { Layout } from "@/components/layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Bell, BellOff, Plus, Trash2, X, Zap, Shield, AlertTriangle,
  Activity, TrendingUp, TrendingDown, AlertCircle, RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useTradingMode } from "@/contexts/trading-mode";

type EventType =
  | "TRADE_EXECUTED"
  | "RUG_AVOIDED"
  | "CIRCUIT_BREAKER"
  | "LOW_BALANCE"
  | "REGIME_CHANGE"
  | "SYSTEM_ERROR"
  | "PRICE_ALERT";

interface SystemEvent {
  id: string;
  type: EventType;
  title: string;
  detail: string;
  ts: number;
  /** Contract address for navigation — never use name */
  tokenMint?: string;
  /** Cached snapshot if token ages out */
  cachedSymbol?: string;
  cachedName?: string;
}

const EVENT_META: Record<EventType, { icon: any; color: string; bg: string }> = {
  TRADE_EXECUTED:    { icon: TrendingUp,      color: "text-gains",        bg: "bg-gains/8 border-gains/25"       },
  RUG_AVOIDED:       { icon: Shield,           color: "text-blue-400",     bg: "bg-blue-400/8 border-blue-400/25" },
  CIRCUIT_BREAKER:   { icon: AlertTriangle,    color: "text-losses",       bg: "bg-losses/8 border-losses/25"     },
  LOW_BALANCE:       { icon: AlertCircle,      color: "text-yellow-400",   bg: "bg-yellow-400/8 border-yellow-400/25" },
  REGIME_CHANGE:     { icon: Activity,         color: "text-purple-400",   bg: "bg-purple-400/8 border-purple-400/25" },
  SYSTEM_ERROR:      { icon: AlertTriangle,    color: "text-red-400",      bg: "bg-red-400/8 border-red-400/25"   },
  PRICE_ALERT:       { icon: Bell,             color: "text-primary",      bg: "bg-primary/8 border-primary/25"   },
};

function useSystemEvents() {
  const { data: history }  = useQuery({ queryKey: ["history-20"],       queryFn: () => fetch("/api/history?limit=20").then(r => r.json()),       refetchInterval: 30000 });
  const { data: skipped }  = useQuery({ queryKey: ["tokens-skipped-10"], queryFn: () => fetch("/api/tokens/skipped?limit=10").then(r => r.json()), refetchInterval: 30000 });
  const { data: circuit }  = useQuery({ queryKey: ["circuit"],           queryFn: () => fetch("/api/circuit").then(r => r.json()),                 refetchInterval: 10000 });
  const { data: wallet }   = useQuery({ queryKey: ["wallet-balance"],    queryFn: () => fetch("/api/wallet/balance").then(r => r.json()),           refetchInterval: 30000 });
  const { data: sys }      = useQuery({ queryKey: ["system-status"],     queryFn: () => fetch("/api/system/status").then(r => r.json()),            refetchInterval: 10000 });

  const events = useMemo(() => {
    const out: SystemEvent[] = [];

    // Trade history → TRADE_EXECUTED
    ((history as any[]) ?? []).forEach((t: any) => {
      if (!t.exitedAt) return;
      const pnl = t.pnlSol ?? 0;
      out.push({
        id:           `trade-${t.id}`,
        type:         "TRADE_EXECUTED",
        title:        `${pnl >= 0 ? "WIN" : "LOSS"} — ${t.tokenSymbol}`,
        detail:       `${pnl >= 0 ? "+" : ""}${pnl.toFixed(4)} SOL · Score ${t.probabilityScore ?? "—"} · ${t.regime ?? ""}`,
        ts:           new Date(t.exitedAt).getTime(),
        tokenMint:    t.tokenMint,
        cachedSymbol: t.tokenSymbol,
        cachedName:   t.tokenName,
      });
    });

    // Skipped tokens → RUG_AVOIDED
    ((skipped as any[]) ?? []).slice(0, 5).forEach((t: any) => {
      out.push({
        id:           `rug-${t.id}`,
        type:         "RUG_AVOIDED",
        title:        `RUG AVOIDED — ${t.tokenSymbol}`,
        detail:       t.reason ?? "Risk gate rejected",
        ts:           new Date(t.detectedAt).getTime(),
        tokenMint:    t.tokenMint,
        cachedSymbol: t.tokenSymbol,
        cachedName:   t.tokenName,
      });
    });

    // Circuit state → CIRCUIT_BREAKER
    const cs = (circuit as any)?.state;
    if (cs && cs !== "NORMAL") {
      out.push({
        id:     `circuit-${cs}`,
        type:   "CIRCUIT_BREAKER",
        title:  `CIRCUIT BREAKER — ${cs.replace(/_/g, " ")}`,
        detail: cs === "FORTRESS_LOCKED" ? "10% daily loss limit hit. Scanner paused 12h."
              : cs === "GLOBAL_FLOOR_HIT" ? "Balance below 50% of starting capital. Manual reset required."
              : cs === "OBSERVATION_MODE" ? "3 consecutive losses. Observation mode active."
              : cs === "LOW_BALANCE_PAUSE" ? "Balance below 0.005 SOL. Trading paused."
              : cs,
        ts: Date.now() - 60_000,
      });
    }

    // Low balance → LOW_BALANCE
    const sol = (wallet as any)?.solBalance ?? 0;
    if (sol > 0 && sol < 0.01) {
      out.push({
        id:     "low-balance",
        type:   "LOW_BALANCE",
        title:  "LOW BALANCE WARNING",
        detail: `${sol.toFixed(4)} SOL — need ≥ 0.01 SOL for live trading`,
        ts:     Date.now() - 30_000,
      });
    }

    // Regime → REGIME_CHANGE (only non-CHOP)
    const regime = (sys as any)?.regime?.regime;
    if (regime && regime !== "CHOP") {
      out.push({
        id:     `regime-${regime}`,
        type:   "REGIME_CHANGE",
        title:  `REGIME — ${regime.replace(/_/g, " ")}`,
        detail: regime === "MANIA" ? "High momentum detected. Multipliers elevated."
              : regime === "RUG_CYCLE" ? "Rug pull spike. Risk hardened."
              : regime === "DEATH_ZONE" ? "Market collapse. All entries suspended."
              : regime,
        ts: Date.now() - 120_000,
      });
    }

    return out.sort((a, b) => b.ts - a.ts);
  }, [history, skipped, circuit, wallet, sys]);

  return events;
}

// ── EventCard — tappable, navigates by mint address ─────────────────────────
function EventCard({ event }: { event: SystemEvent }) {
  const [, navigate] = useLocation();
  const meta = EVENT_META[event.type];
  const Icon = meta.icon;
  const age  = Date.now() - event.ts;
  const ageStr = age < 60_000 ? "just now"
               : age < 3600_000 ? `${Math.floor(age / 60_000)}m ago`
               : age < 86400_000 ? `${Math.floor(age / 3600_000)}h ago`
               : new Date(event.ts).toLocaleDateString();

  // Determine navigation target by event type
  function handleClick() {
    if (event.type === "RUG_AVOIDED") {
      // Navigate to Radar → Skipped tab
      navigate("/tokens");
      // Small delay to let the page mount before we signal the tab
      setTimeout(() => {
        const btn = document.querySelector<HTMLButtonElement>('[data-tab="skipped"]');
        if (btn) btn.click();
        // If token has aged out of radar, the cached snapshot in detail is still shown
      }, 100);
    } else if (event.type === "TRADE_EXECUTED") {
      navigate("/simulation");
    } else if (event.tokenMint) {
      // Open DexScreener as fallback for any event with a known mint
      window.open(`https://dexscreener.com/solana/${event.tokenMint}`, "_blank", "noopener,noreferrer");
    }
  }

  const isNavigable = event.type === "RUG_AVOIDED" || event.type === "TRADE_EXECUTED" || !!event.tokenMint;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${meta.bg} ${
        isNavigable ? "cursor-pointer hover:brightness-110 transition-all" : ""
      }`}
      onClick={isNavigable ? handleClick : undefined}
      title={isNavigable ? "Tap to navigate" : undefined}
    >
      <div className={`mt-0.5 shrink-0 ${meta.color}`}>
        <Icon size={12} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-[8.5px] font-bold uppercase tracking-wider ${meta.color}`}>{event.title}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[7.5px] text-muted-foreground/50 font-mono">{ageStr}</span>
            {isNavigable && <ExternalLink size={8} className="text-muted-foreground/40" />}
          </div>
        </div>
        <p className="text-[8px] text-muted-foreground mt-0.5 leading-relaxed">{event.detail}</p>
        {/* Cached snapshot for aged-out tokens */}
        {event.tokenMint && (event.cachedSymbol || event.cachedName) && (
          <p className="text-[7.5px] text-muted-foreground/40 mt-1 font-mono">
            {event.cachedSymbol ?? ""}{event.cachedName ? ` · ${event.cachedName}` : ""} · {event.tokenMint.slice(0, 6)}…{event.tokenMint.slice(-4)}
          </p>
        )}
      </div>
    </div>
  );
}

function PriceAlerts() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    tokenMint: "", tokenSymbol: "", tokenName: "", targetPrice: "", direction: "above",
  });

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => fetch("/api/alerts").then(r => r.json()),
    refetchInterval: 30000,
  });

  const createAlert = useMutation({
    mutationFn: (data: typeof form) =>
      fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, targetPrice: parseFloat(data.targetPrice) }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      setShowForm(false);
      setForm({ tokenMint: "", tokenSymbol: "", tokenName: "", targetPrice: "", direction: "above" });
      toast({ title: "Price alert created" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to create alert" }),
  });

  const deleteAlert = useMutation({
    mutationFn: (id: number) => fetch(`/api/alerts/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["alerts"] }); toast({ title: "Alert deleted" }); },
  });

  const alertList = (alerts as any[]) ?? [];

  return (
    <div className="space-y-3">
      <Button
        size="sm"
        variant="outline"
        className="w-full h-8 text-[9px] uppercase tracking-wider border-dashed border-primary/30 text-primary hover:bg-primary/5"
        onClick={() => setShowForm(!showForm)}
      >
        {showForm ? <X size={10} className="mr-1.5" /> : <Plus size={10} className="mr-1.5" />}
        {showForm ? "Cancel" : "New Price Alert"}
      </Button>

      {showForm && (
        <div className="bg-card border border-primary/30 rounded-xl p-3 space-y-2">
          <p className="text-[8px] uppercase text-primary font-bold tracking-wider">New Price Alert</p>
          <input
            className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-[10px] font-mono outline-none focus:border-primary/50"
            placeholder="Token mint address"
            value={form.tokenMint}
            onChange={e => setForm(f => ({ ...f, tokenMint: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-[10px] font-mono outline-none focus:border-primary/50"
              placeholder="Symbol (PEPE)"
              value={form.tokenSymbol}
              onChange={e => setForm(f => ({ ...f, tokenSymbol: e.target.value }))}
            />
            <input
              className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-[10px] font-mono outline-none focus:border-primary/50"
              placeholder="Name"
              value={form.tokenName}
              onChange={e => setForm(f => ({ ...f, tokenName: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-[10px] font-mono outline-none focus:border-primary/50"
              placeholder="Target price ($)"
              type="number"
              value={form.targetPrice}
              onChange={e => setForm(f => ({ ...f, targetPrice: e.target.value }))}
            />
            <select
              className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-[10px] font-mono outline-none focus:border-primary/50"
              value={form.direction}
              onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}
            >
              <option value="above">Above ↑</option>
              <option value="below">Below ↓</option>
            </select>
          </div>
          <Button
            size="sm"
            className="w-full h-7 text-[9px] font-bold uppercase tracking-wider bg-primary text-black hover:bg-primary/90"
            onClick={() => createAlert.mutate(form)}
            disabled={createAlert.isPending || !form.tokenMint || !form.targetPrice}
          >
            {createAlert.isPending ? "Creating..." : "Create Alert"}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : alertList.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <BellOff size={24} className="mx-auto mb-3 opacity-20" />
          <p className="text-xs font-mono uppercase">No price alerts</p>
          <p className="text-[9px] mt-1 opacity-60">Set price triggers above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alertList.map((alert: any) => (
            <div
              key={alert.id}
              className={`bg-card border border-border rounded-xl p-3 ${alert.isTriggered ? "border-gains/30" : ""} cursor-pointer hover:border-border/80 transition-colors`}
              onClick={() => window.open(`https://dexscreener.com/solana/${alert.tokenMint}`, "_blank", "noopener,noreferrer")}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[10px] uppercase">{alert.tokenSymbol}</span>
                  <span className={`text-[7.5px] px-1.5 py-0.5 rounded border font-bold uppercase ${
                    alert.direction === "above" ? "text-gains border-gains/30" : "text-losses border-losses/30"
                  }`}>
                    {alert.direction === "above" ? "↑ Above" : "↓ Below"}
                  </span>
                  {alert.isTriggered && (
                    <span className="text-[7.5px] px-1.5 py-0.5 rounded border font-bold uppercase text-gains border-gains/30 bg-gains/8">
                      ✓ Hit
                    </span>
                  )}
                </div>
                <Button
                  size="sm" variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-losses"
                  onClick={(e) => { e.stopPropagation(); deleteAlert.mutate(alert.id); }}
                >
                  <Trash2 size={10} />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[8.5px]">
                <div>
                  <p className="text-muted-foreground">Target</p>
                  <p className="font-mono font-bold">${Number(alert.targetPrice).toFixed(8)}</p>
                </div>
                {alert.currentPrice != null && (
                  <div>
                    <p className="text-muted-foreground">Current</p>
                    <p className="font-mono">${Number(alert.currentPrice).toFixed(8)}</p>
                  </div>
                )}
              </div>
              <p className="text-[7.5px] text-muted-foreground mt-1.5 font-mono">
                {new Date(alert.createdAt).toLocaleString()}
                {alert.triggeredAt && ` · Hit ${new Date(alert.triggeredAt).toLocaleString()}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Alerts() {
  const [tab, setTab] = useState<"events" | "price">("events");
  const events = useSystemEvents();

  return (
    <Layout>
      <div className="px-3 pb-4 space-y-3 max-w-lg mx-auto">
        <div>
          <h1 className="text-sm font-bold text-primary tracking-[0.2em] uppercase flex items-center gap-2">
            <Bell size={12} /> Alerts
          </h1>
          <p className="text-[8px] text-muted-foreground uppercase tracking-[0.25em] mt-0.5">
            System events · Price triggers
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-card border border-border rounded-xl p-1">
          <button
            className={`flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors ${
              tab === "events"
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("events")}
          >
            <Activity size={8} className="inline mr-1" />Events
            {events.length > 0 && <span className="ml-1.5 bg-primary/20 text-primary px-1 rounded text-[7px]">{events.length}</span>}
          </button>
          <button
            className={`flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors ${
              tab === "price"
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("price")}
          >
            <Bell size={8} className="inline mr-1" />Price Alerts
          </button>
        </div>

        {tab === "events" && (
          events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <RefreshCw size={24} className="mx-auto mb-3 opacity-20" />
              <p className="text-xs font-mono uppercase">No events yet</p>
              <p className="text-[9px] mt-1 opacity-60">Events populate as the bot trades</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {events.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          )
        )}

        {tab === "price" && <PriceAlerts />}
      </div>
    </Layout>
  );
}
