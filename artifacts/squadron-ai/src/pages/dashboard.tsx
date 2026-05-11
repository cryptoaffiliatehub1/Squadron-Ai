import { useState } from "react";
import { Layout } from "@/components/layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Skull, Radio, Wifi, CheckCircle2, XCircle, AlertCircle,
  TrendingUp, TrendingDown, FlaskConical, Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNetwork } from "@/contexts/network";
import { useTradingMode } from "@/contexts/trading-mode";

const API = "";

function useSystemStatus() {
  return useQuery({ queryKey: ["system-status"], queryFn: () => fetch(`${API}/api/system/status`).then(r => r.json()), refetchInterval: 5000 });
}
function useBotStatus() {
  return useQuery({ queryKey: ["bot-status"], queryFn: () => fetch(`${API}/api/bot/status`).then(r => r.json()), refetchInterval: 5000 });
}
function useWalletBalance() {
  return useQuery({ queryKey: ["wallet-balance"], queryFn: () => fetch(`${API}/api/wallet/balance`).then(r => r.json()), refetchInterval: 10000 });
}
function usePnlSummary() {
  return useQuery({ queryKey: ["pnl-summary"], queryFn: () => fetch(`${API}/api/trades/pnl`).then(r => r.json()) });
}
function useMoonbags() {
  return useQuery({ queryKey: ["moonbags"], queryFn: () => fetch(`${API}/api/moonbags`).then(r => r.json()), refetchInterval: 15000 });
}
function useReadiness() {
  return useQuery({ queryKey: ["readiness"], queryFn: () => fetch(`${API}/api/system/readiness`).then(r => r.json()) });
}
function useRecentTokens() {
  return useQuery({ queryKey: ["tokens-recent"], queryFn: () => fetch(`${API}/api/tokens/recent?limit=30`).then(r => r.json()), refetchInterval: 8000 });
}
function useCircuit() {
  return useQuery({ queryKey: ["circuit"], queryFn: () => fetch(`${API}/api/circuit`).then(r => r.json()), refetchInterval: 5000 });
}
function useScanner() {
  return useQuery({ queryKey: ["scanner-status"], queryFn: () => fetch(`${API}/api/scanner/status`).then(r => r.json()), refetchInterval: 5000 });
}
function useWeights() {
  return useQuery({ queryKey: ["weights"], queryFn: () => fetch(`${API}/api/weights`).then(r => r.json()) });
}
function useHistory() {
  return useQuery({ queryKey: ["history-10"], queryFn: () => fetch(`${API}/api/history?limit=10`).then(r => r.json()), refetchInterval: 30000 });
}

function RegimeBadge({ regime }: { regime?: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    MANIA: { label: "⚡ MANIA", cls: "text-gains border-gains/50 bg-gains/10 animate-pulse" },
    CHOP: { label: "〰 CHOP", cls: "text-yellow-400 border-yellow-400/50 bg-yellow-400/10" },
    RUG_CYCLE: { label: "☠ RUG CYCLE", cls: "text-losses border-losses/50 bg-losses/10" },
    DEATH_ZONE: { label: "💀 DEATH ZONE", cls: "text-red-800 border-red-800/50 bg-red-900/20" },
  };
  const r = map[regime ?? "CHOP"] ?? map["CHOP"];
  return <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${r.cls}`}>{r.label}</span>;
}

function CircuitStateBadge({ state: cs }: { state?: string }) {
  if (!cs || cs === "NORMAL") return <Badge variant="outline" className="text-[9px] text-gains border-gains/30 uppercase">Normal</Badge>;
  if (cs === "FORTRESS_LOCKED") return <Badge variant="outline" className="text-[9px] text-losses border-losses/50 uppercase animate-pulse">🔒 Fortress</Badge>;
  if (cs === "OBSERVATION_MODE") return <Badge variant="outline" className="text-[9px] text-yellow-400 border-yellow-400/50 uppercase">👁 Observation</Badge>;
  if (cs === "GLOBAL_FLOOR_HIT") return <Badge variant="outline" className="text-[9px] text-red-500 border-red-500/50 uppercase animate-pulse">⛔ Floor Hit</Badge>;
  if (cs === "PSYCHOLOGICAL_LOCKOUT") return <Badge variant="outline" className="text-[9px] text-orange-400 border-orange-400/50 uppercase">🧠 Lockout</Badge>;
  if (cs === "LOW_BALANCE_PAUSE") return <Badge variant="outline" className="text-[9px] text-yellow-400 border-yellow-400/50 uppercase">⏸ Low Balance</Badge>;
  return <Badge variant="outline" className="text-[9px] uppercase">{cs}</Badge>;
}

function LiveModeConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-losses/60 rounded-lg p-5 max-w-sm w-full shadow-[0_0_40px_rgba(255,0,107,0.3)]">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-losses" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-losses">Switch to Live Trading</h2>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed mb-4">
          You are switching to <span className="text-gains font-bold">LIVE TRADING</span>. Real SOL will be used for all trades. Transactions will be signed and sent to Solana mainnet. Are you sure?
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] h-8 border-muted-foreground/40 uppercase tracking-wide"
            onClick={onCancel}
          >
            Stay in Simulation
          </Button>
          <Button
            size="sm"
            className="text-[10px] h-8 bg-gains hover:bg-gains/90 text-black font-bold uppercase tracking-wide"
            onClick={onConfirm}
          >
            <Zap size={10} className="mr-1" /> Confirm Live
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { toast } = useToast();
  const { network } = useNetwork();
  const { isPaper, isLive, setMode, isSwitching } = useTradingMode();
  const qc = useQueryClient();
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);

  const { data: sys } = useSystemStatus();
  const { data: bot } = useBotStatus();
  const { data: wallet } = useWalletBalance();
  const { data: pnl } = usePnlSummary();
  const { data: moonbags } = useMoonbags();
  const { data: readiness } = useReadiness();
  const { data: tokens } = useRecentTokens();
  const { data: circuit } = useCircuit();
  const { data: scanner } = useScanner();
  const { data: weights } = useWeights();
  const { data: history } = useHistory();

  const toggleBot = useMutation({
    mutationFn: (running: boolean) => fetch(`${API}/api/bot/toggle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ running }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bot-status"] }),
  });

  const killSwitch = useMutation({
    mutationFn: () => fetch(`${API}/api/system/kill-switch`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries(); toast({ title: "Kill switch engaged", description: "All trading halted" }); },
  });

  const resetFortress = useMutation({
    mutationFn: () => fetch(`${API}/api/system/reset-fortress`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries(); toast({ title: "Fortress reset" }); },
  });

  function handleModeToggle(wantLive: boolean) {
    if (wantLive && isPaper) {
      setShowLiveConfirm(true);
    } else if (!wantLive && isLive) {
      setMode("paper").then(() => {
        toast({ title: "Switched to Simulation Mode", description: "No real trades will execute" });
      });
    }
  }

  function confirmLive() {
    setShowLiveConfirm(false);
    setMode("live").then(() => {
      toast({ title: "LIVE TRADING ACTIVE", description: "Real SOL execution enabled — notifications sent" });
    });
  }

  const isRunning = bot?.isRunning;
  const circuitState = circuit?.state ?? "NORMAL";
  const locked = circuitState !== "NORMAL" && circuitState !== "LOW_BALANCE_PAUSE";
  const systemAtRisk = weights?.systemAtRisk;
  const dailyPnl = pnl?.dailyPnlUsd ?? 0;
  const solBalance = wallet?.solBalance ?? 0;
  const usdBalance = wallet?.usdValue ?? 0;
  const maxTrade = wallet?.maxTradeAmount ?? 0;
  const regime = sys?.regime?.regime ?? "CHOP";
  const moonbagList = moonbags?.positions ?? [];
  const historyList = (history as any[]) ?? [];
  const tokenList = (tokens as any[]) ?? [];
  const scannerSource = scanner?.activeSource ?? "dexscreener";
  const failoverLog = scanner?.failoverLog ?? [];
  const draydPct = Math.max(0, circuit?.dailyGainPct ?? 0);
  const drawdownPct = Math.abs(Math.min(0, circuit?.dailyGainPct ?? 0));

  const SOURCE_LABELS: Record<string, string> = {
    dexscreener: "DEX Screener ●",
    pumpfun: "Pump.fun WS ●",
    birdeye: "Birdeye API ●",
  };

  // Mode-based ring: amber for paper, green for live
  const modeRingClass = isPaper
    ? "ring-[2px] ring-inset ring-yellow-500/60 shadow-[inset_0_0_20px_rgba(234,179,8,0.08)]"
    : "ring-[2px] ring-inset ring-gains/60 shadow-[inset_0_0_20px_rgba(0,255,163,0.08)]";

  return (
    <>
      {showLiveConfirm && (
        <LiveModeConfirmDialog
          onConfirm={confirmLive}
          onCancel={() => setShowLiveConfirm(false)}
        />
      )}

      <Layout modeRingClass={modeRingClass}>
        <div className="max-w-md mx-auto px-3 pb-4 space-y-3">

          {/* ── MODE BANNER ── */}
          {isPaper ? (
            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded p-2 flex items-center gap-2">
              <FlaskConical size={12} className="text-yellow-400 shrink-0" />
              <span className="text-[9px] text-yellow-400 font-bold uppercase tracking-wider">SIMULATION ACTIVE — No Real Trades</span>
            </div>
          ) : (
            <div className="bg-gains/10 border border-gains/50 rounded p-2 flex items-center gap-2 animate-pulse">
              <Zap size={12} className="text-gains shrink-0" />
              <span className="text-[9px] text-gains font-bold uppercase tracking-wider">LIVE TRADING — Real Execution Active</span>
            </div>
          )}

          {/* ── SYSTEM ALERTS ── */}
          {systemAtRisk && (
            <div className="bg-losses/10 border border-losses/50 rounded p-2 flex items-center gap-2 animate-pulse">
              <Skull size={12} className="text-losses shrink-0" />
              <span className="text-[9px] text-losses font-bold uppercase tracking-wider">SYSTEM AT RISK — Negative expectancy detected</span>
            </div>
          )}
          {circuitState === "FORTRESS_LOCKED" && (
            <div className="bg-losses/10 border border-losses/50 rounded p-2">
              <p className="text-[9px] text-losses font-bold uppercase">🔒 FORTRESS LOCKED: DAILY LOSS LIMIT REACHED</p>
              <p className="text-[8px] text-muted-foreground mt-0.5">Scanner disabled for 12 hours.</p>
              <Button size="sm" className="mt-1.5 h-5 text-[9px]" variant="destructive" onClick={() => resetFortress.mutate()}>Reset Fortress</Button>
            </div>
          )}
          {circuitState === "GLOBAL_FLOOR_HIT" && (
            <div className="bg-red-950 border border-red-600 rounded p-2">
              <p className="text-[9px] text-red-400 font-bold uppercase">⛔ GLOBAL FLOOR HIT — MANUAL RESTART REQUIRED</p>
              <Button size="sm" className="mt-1.5 h-5 text-[9px]" variant="destructive" onClick={() => resetFortress.mutate()}>Confirm Restart</Button>
            </div>
          )}

          {/* ── TOP HUD ── */}
          <div className={`bg-card border rounded-lg p-3 ${isPaper ? "border-yellow-500/30" : "border-gains/30"}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[8px] text-muted-foreground uppercase tracking-widest">SQUADRON AI COMMAND</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-lg font-bold">{solBalance.toFixed(4)} SOL</span>
                  <span className="text-xs text-muted-foreground">${usdBalance.toFixed(2)}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-muted-foreground uppercase">24H P&L</p>
                <p className={`text-base font-bold ${dailyPnl >= 0 ? "text-gains" : "text-losses"}`}>
                  {dailyPnl >= 0 ? "+" : ""}${dailyPnl.toFixed(2)}
                </p>
                <p className={`text-[9px] ${(pnl?.dailyPnlPct ?? 0) >= 0 ? "text-gains" : "text-losses"}`}>
                  {(pnl?.dailyPnlPct ?? 0) >= 0 ? "+" : ""}{(pnl?.dailyPnlPct ?? 0).toFixed(2)}%
                </p>
              </div>
            </div>

            {/* ── MODE TOGGLE + KILL SWITCH ROW ── */}
            <div className="flex items-center justify-between border-t border-border/30 pt-2 mt-1">
              <div className="flex items-center gap-2">
                <RegimeBadge regime={regime} />
                <CircuitStateBadge state={circuitState} />
              </div>
              <div className="flex items-center gap-2">
                {/* Paper/Live Toggle */}
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[9px] font-bold uppercase tracking-wider cursor-pointer select-none transition-colors ${isPaper ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10" : "border-gains/50 text-gains bg-gains/10"}`}
                  onClick={() => handleModeToggle(isPaper)}>
                  {isPaper ? <FlaskConical size={9} /> : <Zap size={9} />}
                  <span>{isPaper ? "SIM" : "LIVE"}</span>
                  <Switch
                    checked={isLive}
                    onCheckedChange={handleModeToggle}
                    disabled={isSwitching}
                    className="data-[state=checked]:bg-gains data-[state=unchecked]:bg-yellow-500/60 h-3.5 w-6 ml-0.5"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-6 text-[9px] px-2 font-bold uppercase"
                  onClick={() => { if (confirm("Engage kill switch? This halts ALL trading.")) killSwitch.mutate(); }}
                  disabled={killSwitch.isPending}
                >
                  <Skull size={9} className="mr-1" /> Kill All
                </Button>
              </div>
            </div>
          </div>

          {/* ── GRID: LEFT + CENTER ── */}
          <div className="grid grid-cols-2 gap-3">
            {/* LEFT */}
            <div className="space-y-3">
              <Card className="bg-card border-card-border">
                <CardHeader className="p-2.5 pb-0">
                  <CardTitle className="text-[8px] uppercase text-muted-foreground tracking-wider">Drawdown</CardTitle>
                </CardHeader>
                <CardContent className="p-2.5 pt-1 space-y-1.5">
                  <div className="flex justify-between text-[9px]">
                    <span className="text-muted-foreground">From ATH</span>
                    <span className={drawdownPct > 5 ? "text-losses" : "text-muted-foreground"}>{drawdownPct.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(drawdownPct * 10, 100)} className="h-1" />
                  <div className="flex justify-between text-[9px]">
                    <span className="text-muted-foreground">Daily gain</span>
                    <span className={draydPct >= 0 ? "text-gains" : "text-losses"}>{draydPct >= 0 ? "+" : ""}{draydPct.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-[9px]">
                    <span className="text-muted-foreground">Strikes</span>
                    <span className={`font-bold ${(circuit?.consecutiveLosses ?? 0) >= 4 ? "text-yellow-400" : "text-foreground"}`}>
                      {circuit?.consecutiveLosses ?? 0}/3
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-card-border">
                <CardHeader className="p-2.5 pb-0">
                  <CardTitle className="text-[8px] uppercase text-muted-foreground tracking-wider">Exposure</CardTitle>
                </CardHeader>
                <CardContent className="p-2.5 pt-1">
                  <div className="text-xl font-bold text-primary">{sys?.bot?.isRunning ? "ACTIVE" : "IDLE"}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">Max trade: {maxTrade.toFixed(3)} SOL</div>
                  <div className="text-[9px] text-muted-foreground">Cap: {bot?.conservativeMode ? "5%" : "20%"}</div>
                  <div className={`text-[9px] font-bold mt-1 ${isPaper ? "text-yellow-400" : "text-gains"}`}>
                    {isPaper ? "[SIM] Paper trades only" : "[LIVE] Real execution"}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-card-border">
                <CardHeader className="p-2.5 pb-0">
                  <CardTitle className="text-[8px] uppercase text-muted-foreground tracking-wider">Bot Control</CardTitle>
                </CardHeader>
                <CardContent className="p-2.5 pt-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-gains pulse-indicator" : "bg-muted-foreground"}`} />
                      <span className="text-[9px] font-bold">{isRunning ? "RUNNING" : "OFF"}</span>
                    </div>
                    <Switch checked={!!isRunning} onCheckedChange={(v) => toggleBot.mutate(v)} disabled={toggleBot.isPending || locked} className="data-[state=checked]:bg-gains h-4 w-7" />
                  </div>
                  <div className="text-[8px] text-muted-foreground space-y-0.5">
                    <div>Trades: {bot?.tradesExecutedToday ?? 0}</div>
                    <div>Network: <span className={network === "mainnet" ? "text-losses" : "text-yellow-400"}>{network.toUpperCase()}</span></div>
                    {bot?.conservativeMode && <div className="text-blue-400">Conservative Mode</div>}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* CENTER — Radar Feed */}
            <div>
              <Card className="bg-card border-card-border h-full flex flex-col">
                <CardHeader className="p-2.5 pb-0">
                  <CardTitle className="text-[8px] uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                    <Radio size={9} /> Live Radar
                    <span className={`ml-1 text-[8px] ${scannerSource === "dexscreener" ? "text-gains" : scannerSource === "pumpfun" ? "text-yellow-400" : "text-blue-400"}`}>
                      {SOURCE_LABELS[scannerSource] ?? scannerSource}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2.5 pt-1 flex-1 overflow-hidden">
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {tokenList.length === 0 ? (
                      <p className="text-[9px] text-muted-foreground text-center py-4">Scanner idle...</p>
                    ) : tokenList.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between border-b border-border/20 pb-1">
                        <div>
                          <p className="text-[9px] font-bold uppercase">
                            <span className={`text-[8px] mr-1 font-mono ${isPaper ? "text-yellow-500/70" : "text-gains/70"}`}>
                              {isPaper ? "[SIM]" : "[LIVE]"}
                            </span>
                            {t.tokenSymbol}
                          </p>
                          <p className="text-[8px] text-muted-foreground">${Number(t.liquidityUsd ?? 0).toLocaleString()} liq</p>
                        </div>
                        <span className={`text-[8px] px-1 py-0.5 rounded border ${t.safetyStatus === "good" ? "text-gains border-gains/30" : t.safetyStatus === "pending" ? "text-yellow-400 border-yellow-400/30" : "text-losses border-losses/30"}`}>
                          {t.safetyStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── BLOCK 17 WEIGHT DRIFT ── */}
          {weights?.weights && (
            <Card className="bg-card border-card-border">
              <CardHeader className="p-2.5 pb-0">
                <CardTitle className="text-[8px] uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                  Block 17 Weight Drift
                  {weights.systemAtRisk && <span className="text-losses text-[8px] font-bold ml-1">⚠ SYSTEM AT RISK</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2.5 pt-1">
                <div className="grid grid-cols-3 gap-x-3 gap-y-1">
                  {Object.entries(weights.weights as Record<string, number>).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[9px]">
                      <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                      <span className="font-mono font-bold text-primary">{v}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── MOONBAG VAULT ── */}
          <Card className={`bg-card border ${isPaper ? "border-yellow-500/20 border-l-2 border-l-yellow-500/50" : "border-gains/20 border-l-2 border-l-primary/50"}`}>
            <CardHeader className="p-2.5 pb-0">
              <CardTitle className="text-[8px] uppercase text-muted-foreground tracking-wider flex items-center justify-between">
                <span>🌙 Moonbag Vault</span>
                <span className="text-primary font-bold">{(moonbags?.totalValueSol ?? 0).toFixed(4)} SOL</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2.5 pt-1">
              {moonbagList.length === 0 ? (
                <p className="text-[9px] text-muted-foreground">No moonbag positions. 50% of profitable exits auto-move here.</p>
              ) : (
                <div className="space-y-2">
                  {moonbagList.map((m: any) => (
                    <div key={m.id} className="flex justify-between items-center border-b border-border/20 pb-1.5">
                      <div>
                        <p className="text-[9px] font-bold uppercase">{m.tokenSymbol}</p>
                        <p className="text-[8px] text-muted-foreground">Cost: $0 (recovered)</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-gains font-bold">{m.currentMultiplier?.toFixed(2)}×</p>
                        <p className="text-[8px] text-muted-foreground">{m.currentValueSol?.toFixed(4)} SOL</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── FAILOVER LOG ── */}
          <Card className="bg-card border-card-border">
            <CardHeader className="p-2.5 pb-0">
              <CardTitle className="text-[8px] uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                <Wifi size={9} /> Source Failover Log
                <span className="ml-auto font-mono text-[9px] text-primary">{SOURCE_LABELS[scannerSource]}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2.5 pt-1">
              {failoverLog.length === 0 ? (
                <p className="text-[9px] text-muted-foreground">No failovers — DEX Screener primary active</p>
              ) : (
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {[...failoverLog].reverse().slice(0, 5).map((f: any, i: number) => (
                    <div key={i} className="text-[8px] text-muted-foreground">
                      <span className="text-losses">{f.from}</span> → <span className="text-gains">{f.to}</span>
                      <span className="ml-1 text-muted-foreground/60">{f.reason?.slice(0, 30)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── LAST 10 TRADES ── */}
          <Card className="bg-card border-card-border">
            <CardHeader className="p-2.5 pb-0">
              <CardTitle className="text-[8px] uppercase text-muted-foreground tracking-wider">Last 10 Outcomes</CardTitle>
            </CardHeader>
            <CardContent className="p-2.5 pt-1">
              {historyList.length === 0 ? (
                <p className="text-[9px] text-muted-foreground">No trade history yet</p>
              ) : (
                <div className="space-y-1">
                  {historyList.map((h: any) => (
                    <div key={`${h.kind}-${h.id}`} className="flex items-center justify-between text-[9px]">
                      <div className="flex items-center gap-1.5">
                        {h.kind === "rejected" ? <XCircle size={9} className="text-losses" /> :
                         (h.pnlUsd ?? 0) >= 0 ? <CheckCircle2 size={9} className="text-gains" /> :
                         <XCircle size={9} className="text-losses" />}
                        <span className={`text-[8px] font-mono ${isPaper ? "text-yellow-500/60" : "text-gains/60"}`}>
                          {isPaper ? "[SIM]" : "[LIVE]"}
                        </span>
                        <span className="font-bold uppercase">{h.tokenSymbol}</span>
                        {h.kind === "rejected" && <span className="text-[8px] text-losses">FILTERED</span>}
                      </div>
                      {h.pnlUsd !== null && (
                        <span className={`font-mono ${h.pnlUsd >= 0 ? "text-gains" : "text-losses"}`}>
                          {h.pnlUsd >= 0 ? "+" : ""}${Number(h.pnlUsd).toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── SYSTEM READINESS ── */}
          {readiness && (
            <Card className="bg-card border-card-border">
              <CardHeader className="p-2.5 pb-0">
                <CardTitle className="text-[8px] uppercase text-muted-foreground tracking-wider">System Readiness</CardTitle>
              </CardHeader>
              <CardContent className="p-2.5 pt-1">
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  {(readiness.keys as any[]).map((k: any) => (
                    <div key={k.key} className="flex items-center gap-1 text-[8px]">
                      {k.present ? <CheckCircle2 size={8} className="text-gains shrink-0" /> : <XCircle size={8} className="text-losses/60 shrink-0" />}
                      <span className={k.present ? "text-muted-foreground" : "text-losses/50"}>{k.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    </>
  );
}
