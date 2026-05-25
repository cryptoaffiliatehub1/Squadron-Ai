import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, TrendingUp, TrendingDown, AlertCircle,
  Zap, FlaskConical, Trophy, Target, BarChart2,
} from "lucide-react";
import { useTradingMode } from "@/contexts/trading-mode";

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: "gains" | "losses" | "default";
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="text-[7.5px] text-muted-foreground uppercase tracking-[0.2em] font-bold">{label}</p>
      <p className={`text-lg font-black font-mono mt-0.5 leading-none ${
        color === "gains" ? "text-gains" : color === "losses" ? "text-losses" : "text-white"
      }`}>
        {value}
      </p>
      {sub && <p className="text-[7.5px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Simulation() {
  const { isPaper, isLive } = useTradingMode();

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ["daily-report"],
    queryFn: () => fetch("/api/paper/report").then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: trades, isLoading: tradesLoading } = useQuery({
    queryKey: ["paper-trades"],
    queryFn: () => fetch("/api/paper/trades").then(r => r.json()),
    refetchInterval: 30000,
  });

  const paperTrades = (trades as any[]) ?? [];
  const totalPnl    = (report as any)?.totalPnlSol ?? 0;
  const winRate     = (report as any)?.winRate ?? 0;
  const totalTrades = (report as any)?.totalTrades ?? 0;
  const expectancy  = (report as any)?.expectancy ?? 0;
  const avgWin      = (report as any)?.avgWinSol ?? 0;
  const avgLoss     = (report as any)?.avgLossSol ?? 0;
  const topFail     = (report as any)?.topFailureReason;

  const panelCls = "bg-card border border-border rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.25)]";

  return (
    <Layout>
      <div className="px-3 pb-4 space-y-3 max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-primary tracking-[0.2em] uppercase flex items-center gap-2">
              <Activity size={12} /> Simulation
            </h1>
            <p className="text-[8px] text-muted-foreground uppercase tracking-[0.25em] mt-0.5">
              Paper trading performance log
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

        {/* Stats grid */}
        {reportLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : report ? (
          <>
            {/* Net P&L hero */}
            <div className={`${panelCls} p-4 border-l-2 ${totalPnl >= 0 ? "border-l-gains/60" : "border-l-losses/60"}`}>
              <p className="text-[8px] text-muted-foreground uppercase tracking-[0.2em]">Net Simulated P&L</p>
              <p className={`text-3xl font-black font-mono mt-1 ${totalPnl >= 0 ? "text-gains" : "text-losses"}`}>
                {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(4)}
                <span className="text-lg ml-1 text-muted-foreground">SOL</span>
              </p>
              <p className="text-[8px] text-muted-foreground mt-1">Updates every 30s</p>
            </div>

            {/* 3-col stat row */}
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                label="Win Rate"
                value={`${(winRate * 100).toFixed(1)}%`}
                color={winRate >= 0.5 ? "gains" : "losses"}
                sub={`${totalTrades} total trades`}
              />
              <StatCard
                label="Expectancy"
                value={`${expectancy >= 0 ? "+" : ""}${expectancy.toFixed(4)}`}
                sub="SOL per trade"
                color={expectancy >= 0 ? "gains" : "losses"}
              />
              <StatCard
                label="Avg Win"
                value={`+${avgWin.toFixed(4)}`}
                sub="SOL"
                color="gains"
              />
              <StatCard
                label="Avg Loss"
                value={`-${avgLoss.toFixed(4)}`}
                sub="SOL"
                color="losses"
              />
            </div>

            {/* Win/Loss progress bar */}
            <div className={`${panelCls} p-3`}>
              <div className="flex justify-between text-[8px] mb-1.5">
                <span className="text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Trophy size={8} className="text-gains" /> Win/Loss Ratio
                </span>
                <span className={`font-mono font-bold ${winRate >= 0.5 ? "text-gains" : "text-losses"}`}>
                  {(winRate * 100).toFixed(0)}% wins
                </span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden gap-px">
                <div className="bg-gains rounded-l-full transition-all" style={{ width: `${winRate * 100}%` }} />
                <div className="bg-losses rounded-r-full transition-all flex-1" />
              </div>
              {topFail && (
                <p className="text-[7.5px] text-muted-foreground mt-1.5">
                  Top failure: <span className="text-losses">{topFail}</span>
                </p>
              )}
            </div>
          </>
        ) : (
          <div className={`${panelCls} p-6 text-center`}>
            <Activity size={24} className="mx-auto mb-3 text-muted-foreground/20" />
            <p className="text-xs font-mono uppercase text-muted-foreground">No simulation data yet</p>
            <p className="text-[9px] text-muted-foreground/60 mt-1">Start the bot to begin paper trading</p>
          </div>
        )}

        {/* Trade log */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1">
              <BarChart2 size={8} /> Paper Trade Log
            </p>
            {paperTrades.length > 0 && (
              <span className="text-[8px] text-primary font-mono font-bold">{paperTrades.length} entries</span>
            )}
          </div>

          {tradesLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : paperTrades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity size={24} className="mx-auto mb-2 opacity-20" />
              <p className="text-xs font-mono uppercase">No paper trades yet</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {paperTrades.slice(0, 50).map((t: any) => (
                <div key={t.id} className={`bg-card border border-border rounded-xl px-3 py-2 ${
                  t.type !== "buy" ? "border-l-2 border-l-primary/40" : ""
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {t.type === "buy"
                        ? <TrendingUp size={10} className="text-gains" />
                        : <TrendingDown size={10} className="text-primary" />
                      }
                      <span className="text-[7.5px] font-mono text-yellow-500/40">[SIM]</span>
                      <span className="font-bold text-[10px] uppercase">{t.tokenSymbol}</span>
                      <span className={`text-[7.5px] px-1 py-0.5 rounded border font-bold uppercase ${
                        t.type === "buy" ? "text-gains border-gains/30" : "text-primary border-primary/30"
                      }`}>
                        {t.type}
                      </span>
                      {t.filterDetails && Object.values(t.filterDetails as Record<string, unknown>).some(v => v === false) && (
                        <AlertCircle size={8} className="text-losses" />
                      )}
                    </div>
                    {t.pnlSol != null && (
                      <span className={`font-mono text-[10px] font-bold ${t.pnlSol >= 0 ? "text-gains" : "text-losses"}`}>
                        {t.pnlSol >= 0 ? "+" : ""}{t.pnlSol.toFixed(4)} SOL
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex gap-3 text-[7.5px] text-muted-foreground">
                    <span>{t.amountSol?.toFixed(4)} SOL</span>
                    <span>Score: {t.probabilityScore ?? "—"}</span>
                    <span className="text-muted-foreground/60">{t.regime}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
