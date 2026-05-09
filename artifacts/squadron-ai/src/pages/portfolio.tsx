import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase } from "lucide-react";

function usePortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: () => fetch("/api/portfolio").then(r => r.json()),
    refetchInterval: 30000,
  });
}

export default function Portfolio() {
  const { data: portfolio, isLoading } = usePortfolio();
  const tokens = (portfolio as any[]) ?? [];

  const totalValue = tokens.reduce((sum: number, t: any) => sum + (t.usdValue ?? 0), 0);

  return (
    <Layout>
      <div className="p-4 space-y-4 max-w-md mx-auto">
        <header className="border-b border-border pb-3">
          <h1 className="text-base font-bold text-primary tracking-[0.25em] uppercase flex items-center gap-2">
            <Briefcase size={14} /> Portfolio
          </h1>
          <p className="text-[9px] text-muted-foreground uppercase tracking-[0.3em] mt-0.5">Current holdings</p>
        </header>

        <Card className="bg-card border-card-border border-l-2 border-l-primary">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-[9px] uppercase text-muted-foreground tracking-wider">Total Value</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold text-primary">${totalValue.toFixed(2)}</div>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Briefcase size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-mono uppercase tracking-wider">No holdings</p>
            <p className="text-[10px] mt-1">Portfolio will populate once the bot executes trades</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tokens.map((token: any, i: number) => (
              <Card key={i} className="bg-card border-card-border">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm uppercase">{token.symbol}</p>
                      <p className="text-[9px] text-muted-foreground">{token.balance?.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm">${(token.usdValue ?? 0).toFixed(2)}</p>
                      <p className={`text-[9px] ${(token.priceChange24h ?? 0) >= 0 ? "text-gains" : "text-losses"}`}>
                        {(token.priceChange24h ?? 0) >= 0 ? "+" : ""}{(token.priceChange24h ?? 0).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
