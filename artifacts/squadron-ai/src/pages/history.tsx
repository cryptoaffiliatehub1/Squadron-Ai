import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, ArrowUpRight, ArrowDownLeft, Moon, Trophy } from "lucide-react";

function useHistory() {
  return useQuery({
    queryKey: ["history"],
    queryFn: () => fetch("/api/paper/history").then(r => r.json()),
    refetchInterval: 30000,
  });
}

export default function History() {
  const { data, isLoading } = useHistory();
  const payload = (data as any) ?? {};
  const trades = (payload.trades as any[]) ?? [];
  const allTime = payload.allTime ?? {};
  const today = payload.today ?? {};

  return (
    <Layout>
      <div className="p-4 space-y-4 max-w-md mx-auto">
        <header className="border-b border-border pb-3">
          <h1 className="text-base font-bold text-primary tracking-[0.25em] uppercase flex items-center gap-2">
            <BookOpen size={14} /> Trade Journal
          </h1>
          <p className="text-[9px] text-muted-foreground uppercase tracking-[0.3em] mt-0.5">Paper ledger · realized exits and open positions</p>
        </header>

        <div className="bg-card border border-card-border rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy size={11} className="text-primary" />
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">All-Time Realized</p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-[8px] text-muted-foreground uppercase">Trades</p>
              <p className="text-sm font-bold">{allTime.totalTrades ?? 0}</p>
            </div>
            <div>
              <p className="text-[8px] text-muted-foreground uppercase">Win Rate</p>
              <p className="text-sm font-bold">{((allTime.winRate ?? 0) * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-[8px] text-muted-foreground uppercase">Expectancy</p>
              <p className="text-sm font-bold font-mono">${(allTime.expectancyUsd ?? 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[8px] text-muted-foreground uppercase">Net P&amp;L</p>
              <p className={`text-sm font-bold font-mono ${(allTime.totalPnlUsd ?? 0) >= 0 ? "text-gains" : "text-losses"}`}>
                {(allTime.totalPnlUsd ?? 0) >= 0 ? "+" : ""}${(allTime.totalPnlUsd ?? 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-card border border-card-border rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground uppercase">Today Trades</p>
            <p className="text-sm font-bold">{today.totalTrades ?? 0}</p>
          </div>
          <div className="bg-card border border-card-border rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground uppercase">Today Wins</p>
            <p className="text-sm font-bold text-gains">{today.wins ?? 0}</p>
          </div>
          <div className="bg-card border border-card-border rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground uppercase">Net Realized Today</p>
            <p className={`text-sm font-bold ${(today.totalPnlUsd ?? 0) >= 0 ? "text-gains" : "text-losses"}`}>
              {(today.totalPnlUsd ?? 0) >= 0 ? "+" : ""}${(today.totalPnlUsd ?? 0).toFixed(2)}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : trades.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-mono uppercase tracking-wider">No history yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {trades.map((entry: any) => (
              <Card key={entry.id} className={`bg-card border-card-border ${entry.status === "MOONBAG" ? "border-l-2 border-l-purple-400/40" : entry.pnlUsd !== null && entry.pnlUsd >= 0 ? "border-l-2 border-l-gains/30" : entry.pnlUsd !== null ? "border-l-2 border-l-losses/30" : ""}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {entry.status === "MOONBAG" ? (
                        <Moon size={12} className="text-purple-400" />
                      ) : entry.type === "buy" ? (
                        <ArrowUpRight size={12} className="text-gains" />
                      ) : (
                        <ArrowDownLeft size={12} className="text-losses" />
                      )}
                      <span className="font-bold text-sm uppercase">{entry.tokenSymbol}</span>
                      <Badge variant="outline" className={`text-[9px] uppercase ${entry.status === "MOONBAG" ? "text-purple-400 border-purple-400/30" : entry.status === "LOSS" ? "text-losses border-losses/30" : "text-gains border-gains/30"}`}>
                        {entry.status}
                      </Badge>
                    </div>
                    {entry.pnlUsd !== null && (
                      <span className={`text-sm font-bold font-mono ${entry.pnlUsd >= 0 ? "text-gains" : "text-losses"}`}>
                        {entry.pnlUsd >= 0 ? "+" : ""}${Number(entry.pnlUsd).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-muted-foreground">
                    {entry.status === "OPEN" ? "Position remains open" : entry.status === "MOONBAG" ? "Zero-cost vault position" : "Realized exit"}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-1">{new Date(entry.timestamp).toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
