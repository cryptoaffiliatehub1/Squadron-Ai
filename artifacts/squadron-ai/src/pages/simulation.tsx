import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, TrendingUp, TrendingDown, AlertCircle, Zap, FlaskConical } from "lucide-react";
import { useTradingMode } from "@/contexts/trading-mode";

function useDailyReport() {
  return useQuery({
    queryKey: ["daily-report"],
    queryFn: () => fetch("/api/paper/report").then(r => r.json()),
    refetchInterval: 30000,
  });
}

function usePaperTrades() {
  return useQuery({
    queryKey: ["paper-trades"],
    queryFn: () => fetch("/api/paper/trades").then(r => r.json()),
    refetchInterval: 30000,
  });
}

export default function Simulation() {
  // FIX 6: use trading-mode context (live API call, not env var text)
  const { isPaper, isLive, isLoading: modeLoading } = useTradingMode();

  const { data: report, isLoading: reportLoading } = useDailyReport();
  const { data: trades, isLoading: tradesLoading } = usePaperTrades();

  const paperTrades = (trades as any[]) ?? [];

  return (
    <Layout>
      <div className="p-4 space-y-4 max-w-md mx-auto">
        <header className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold text-primary tracking-[0.25em] uppercase flex items-center gap-2">
                <Activity size={14} /> Simulation
              </h1>
              <p className="text-[9px] text-muted-foreground uppercase tracking-[0.3em] mt-0.5">
                Paper trading log
              </p>
            </div>
            {!modeLoading && (
              <Badge
                variant="outline"
                className={`text-[9px] uppercase ${
                  isPaper
                    ? "text-yellow-400 border-yellow-400/50 bg-yellow-400/10"
                    : "text-gains border-gains/50 bg-gains/10"
                }`}
              >
                {isPaper ? "⚠ SIMULATION" : "🟢 LIVE TRADING"}
              </Badge>
            )}
          </div>
        </header>

        {/* FIX 6: live mode banner — fetched from API, no hardcoded env var text */}
        {!modeLoading && isLive && (
          <div className="bg-gains/10 border border-gains/50 rounded p-3 flex items-center gap-2 animate-pulse">
            <Zap size={12} className="text-gains shrink-0" />
            <div>
              <p className="text-[9px] text-gains font-bold uppercase tracking-wider">LIVE MODE ACTIVE — Real trades are executing</p>
              <p className="text-[8px] text-gains/70 mt-0.5">Switch back to Simulation on the Command tab to stop real execution</p>
            </div>
          </div>
        )}

        {!modeLoading && isPaper && (
          <div className="bg-yellow-500/10 border border-yellow-500/40 rounded p-3 flex items-center gap-2">
            <FlaskConical size={12} className="text-yellow-400 shrink-0" />
            <p className="text-[9px] text-yellow-400 font-bold uppercase tracking-wider">SIMULATION ACTIVE — No real trades executing</p>
          </div>
        )}

        {/* Report summary */}
        {reportLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : report ? (
          <Card className="bg-card border-card-border">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-[9px] uppercase text-muted-foreground tracking-wider">
                Today's Paper Report
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[8px] text-muted-foreground uppercase">Total Trades</p>
                  <p className="text-lg font-bold">{report.totalTrades}</p>
                </div>
                <div>
                  <p className="text-[8px] text-muted-foreground uppercase">Win Rate</p>
                  <p className={`text-lg font-bold ${(report.winRate ?? 0) >= 0.5 ? "text-gains" : "text-losses"}`}>
                    {((report.winRate ?? 0) * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-[8px] text-muted-foreground uppercase">Avg Win</p>
                  <p className="text-sm font-bold text-gains">+{(report.avgWinSol ?? 0).toFixed(4)} SOL</p>
                </div>
                <div>
                  <p className="text-[8px] text-muted-foreground uppercase">Avg Loss</p>
                  <p className="text-sm font-bold text-losses">-{(report.avgLossSol ?? 0).toFixed(4)} SOL</p>
                </div>
                <div>
                  <p className="text-[8px] text-muted-foreground uppercase">Expectancy</p>
                  <p className={`text-sm font-bold ${(report.expectancy ?? 0) >= 0 ? "text-gains" : "text-losses"}`}>
                    {(report.expectancy ?? 0) >= 0 ? "+" : ""}{(report.expectancy ?? 0).toFixed(4)} SOL
                  </p>
                </div>
                <div>
                  <p className="text-[8px] text-muted-foreground uppercase">Top Failure</p>
                  <p className="text-[9px] font-bold text-losses">{report.topFailureReason || "—"}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/40">
                <p className="text-[8px] text-muted-foreground uppercase">Net Simulated P&L</p>
                <p className={`text-xl font-bold ${(report.totalPnlSol ?? 0) >= 0 ? "text-gains" : "text-losses"}`}>
                  {(report.totalPnlSol ?? 0) >= 0 ? "+" : ""}{(report.totalPnlSol ?? 0).toFixed(4)} SOL
                </p>
                <p className="text-[8px] text-muted-foreground mt-0.5">Auto-refreshes every 30s</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-card-border">
            <CardContent className="p-3 text-center text-muted-foreground text-xs py-8">
              <Activity size={24} className="mx-auto mb-2 opacity-30" />
              No simulation report yet — start the bot to begin
            </CardContent>
          </Card>
        )}

        {/* Trade log */}
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">
            Paper Trade Log
            {paperTrades.length > 0 && <span className="text-primary ml-2">({paperTrades.length})</span>}
          </p>
          {tradesLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : paperTrades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs font-mono uppercase">No paper trades yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {paperTrades.slice(0, 50).map((t: any) => (
                <Card key={t.id} className={`bg-card border-card-border ${t.type === "buy" ? "" : "border-l-2 border-l-primary/40"}`}>
                  <CardContent className="p-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {t.type === "buy"
                          ? <TrendingUp size={10} className="text-gains" />
                          : <TrendingDown size={10} className="text-losses" />
                        }
                        <span className="text-[8px] font-mono text-yellow-500/60">[SIM]</span>
                        <span className="font-bold text-xs uppercase">{t.tokenSymbol}</span>
                        <Badge variant="outline" className={`text-[8px] uppercase ${t.type === "buy" ? "text-gains border-gains/30" : "text-primary border-primary/30"}`}>
                          {t.type}
                        </Badge>
                        {t.filterDetails && Object.values(t.filterDetails as Record<string, unknown>).some(v => v === false) && (
                          <AlertCircle size={8} className="text-losses" />
                        )}
                      </div>
                      {t.pnlSol !== null && t.pnlSol !== undefined && (
                        <span className={`font-mono text-xs font-bold ${t.pnlSol >= 0 ? "text-gains" : "text-losses"}`}>
                          {t.pnlSol >= 0 ? "+" : ""}{t.pnlSol.toFixed(4)} SOL
                        </span>
                      )}
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-1 text-[8px] text-muted-foreground">
                      <span>{t.amountSol?.toFixed(4)} SOL</span>
                      <span>Score: {t.probabilityScore ?? "—"}</span>
                      <span>{t.regime}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
