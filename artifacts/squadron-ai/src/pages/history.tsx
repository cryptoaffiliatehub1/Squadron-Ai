import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, ArrowUpRight, ArrowDownLeft, XCircle, Activity } from "lucide-react";

function useHistory() {
  return useQuery({
    queryKey: ["history"],
    queryFn: () => fetch("/api/history?limit=200").then(r => r.json()),
    refetchInterval: 30000,
  });
}

export default function History() {
  const { data, isLoading } = useHistory();
  const entries = (data as any[]) ?? [];

  const trades = entries.filter(e => e.kind === "trade" || e.kind === "paper");
  const rejected = entries.filter(e => e.kind === "rejected");
  const events = entries.filter(e => e.kind === "event");
  const totalPnl = entries.reduce((s, t) => s + Number(t.pnlUsd ?? 0), 0);

  return (
    <Layout>
      <div className="p-4 space-y-4 max-w-md mx-auto">
        <header className="border-b border-border pb-3">
          <h1 className="text-base font-bold text-primary tracking-[0.25em] uppercase flex items-center gap-2">
            <BookOpen size={14} /> Trade Journal
          </h1>
          <p className="text-[9px] text-muted-foreground uppercase tracking-[0.3em] mt-0.5">Full execution history</p>
        </header>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-card border border-card-border rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground uppercase">Trades</p>
            <p className="text-sm font-bold">{trades.length}</p>
          </div>
          <div className="bg-card border border-card-border rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground uppercase">Rejected</p>
            <p className="text-sm font-bold text-losses">{rejected.length + events.filter(e => String(e.outcome).includes("BLOCKED")).length}</p>
          </div>
          <div className="bg-card border border-card-border rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground uppercase">All P&L</p>
            <p className={`text-sm font-bold ${totalPnl >= 0 ? "text-gains" : "text-losses"}`}>
              {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-mono uppercase tracking-wider">No history yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry: any) => {
              const isRejected = entry.kind === "rejected" || entry.kind === "event" && String(entry.outcome).includes("BLOCKED");
              const isBuy = entry.outcome === "buy" || entry.kind === "paper" && entry.status === "OPEN";
              return (
              <Card key={`${entry.kind}-${entry.id}`} className={`bg-card border-card-border ${isRejected ? "border-l-2 border-l-destructive/30" : entry.pnlUsd !== null && entry.pnlUsd >= 0 ? "border-l-2 border-l-gains/30" : entry.pnlUsd !== null ? "border-l-2 border-l-losses/30" : ""}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {isRejected ? (
                        <XCircle size={12} className="text-destructive" />
                      ) : entry.kind === "event" ? (
                        <Activity size={12} className="text-primary" />
                      ) : isBuy ? (
                        <ArrowUpRight size={12} className="text-gains" />
                      ) : (
                        <ArrowDownLeft size={12} className="text-losses" />
                      )}
                      <span className="font-bold text-sm uppercase">{entry.tokenSymbol}</span>
                      <Badge variant="outline" className={`text-[9px] uppercase ${isRejected ? "text-destructive border-destructive/30" : entry.kind === "event" ? "text-primary border-primary/30" : isBuy ? "text-gains border-gains/30" : "text-losses border-losses/30"}`}>
                        {entry.kind === "rejected" ? "REJECTED" : String(entry.outcome ?? entry.kind).toUpperCase()}
                      </Badge>
                    </div>
                    {entry.pnlUsd !== null && (
                      <span className={`text-sm font-bold font-mono ${entry.pnlUsd >= 0 ? "text-gains" : "text-losses"}`}>
                        {entry.pnlUsd >= 0 ? "+" : ""}${Number(entry.pnlUsd).toFixed(2)}
                      </span>
                    )}
                  </div>
                  {entry.reason && <p className="text-[9px] text-muted-foreground">{entry.reason}</p>}
                  {entry.notes && <p className="text-[9px] text-muted-foreground italic">"{entry.notes}"</p>}
                  <p className="text-[9px] text-muted-foreground mt-1">{new Date(entry.timestamp).toLocaleString()}</p>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
