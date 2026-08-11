import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";

function useTrades() {
  return useQuery({
    queryKey: ["trades"],
    queryFn: () => fetch("/api/trades").then(r => r.json()),
    refetchInterval: 15000,
  });
}

export default function Trades() {
  const { data: trades, isLoading } = useTrades();

  return (
    <Layout>
      <div className="p-4 space-y-4 max-w-md mx-auto">
        <header className="border-b border-border pb-3">
          <h1 className="text-base font-bold text-primary tracking-[0.25em] uppercase">Live Trades</h1>
          <p className="text-[9px] text-muted-foreground uppercase tracking-[0.3em] mt-0.5">Bot execution log</p>
        </header>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : !trades?.length ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-mono uppercase tracking-wider">No trades yet</p>
            <p className="text-[10px] mt-1">Start the bot to begin trading</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(trades as any[]).map((trade: any) => (
              <Card key={trade.id} className="bg-card border-card-border">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {trade.type === "buy" ? (
                        <ArrowUpRight size={14} className="text-gains" />
                      ) : (
                        <ArrowDownLeft size={14} className="text-losses" />
                      )}
                      <span className="font-bold text-sm uppercase">{trade.tokenSymbol}</span>
                      <Badge variant="outline" className={`text-[9px] uppercase ${trade.type === "buy" ? "text-gains border-gains/30" : "text-losses border-losses/30"}`}>
                        {trade.type}
                      </Badge>
                    </div>
                    <Badge variant="outline" className={`text-[9px] uppercase ${trade.status === "success" ? "text-gains border-gains/30" : trade.status === "failed" ? "text-losses border-losses/30" : "text-muted-foreground"}`}>
                      {trade.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-mono font-bold">{Number(trade.amountSol).toFixed(4)} SOL</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Price</p>
                      <p className="font-mono">${Number(trade.priceUsd).toFixed(6)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">PnL</p>
                      <p className={`font-mono font-bold ${trade.pnlUsd === null ? "text-muted-foreground" : Number(trade.pnlUsd) >= 0 ? "text-gains" : "text-losses"}`}>
                        {trade.pnlUsd === null ? "—" : `${Number(trade.pnlUsd) >= 0 ? "+" : ""}$${Number(trade.pnlUsd).toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-2">
                    {new Date(trade.createdAt).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
