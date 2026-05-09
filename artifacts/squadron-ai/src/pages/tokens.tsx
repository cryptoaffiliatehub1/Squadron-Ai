import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio, TrendingUp, Shield, AlertTriangle } from "lucide-react";
import { useState } from "react";

function useRecentTokens() {
  return useQuery({
    queryKey: ["tokens-recent"],
    queryFn: () => fetch("/api/tokens/recent?limit=50").then(r => r.json()),
    refetchInterval: 15000,
  });
}

export default function Tokens() {
  const { data: tokens, isLoading } = useRecentTokens();
  const [tab, setTab] = useState<"recent" | "skipped">("recent");

  const tokenList = (tokens as any[]) ?? [];

  return (
    <Layout>
      <div className="p-4 space-y-4 max-w-md mx-auto">
        <header className="border-b border-border pb-3">
          <h1 className="text-base font-bold text-primary tracking-[0.25em] uppercase flex items-center gap-2">
            <Radio size={14} /> Token Scanner
          </h1>
          <p className="text-[9px] text-muted-foreground uppercase tracking-[0.3em] mt-0.5">
            DEX Screener trending + boosted tokens
          </p>
        </header>

        <div className="flex gap-2">
          <button
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border transition-colors ${tab === "recent" ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground"}`}
            onClick={() => setTab("recent")}
          >
            Detected
          </button>
          <button
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border transition-colors ${tab === "skipped" ? "bg-destructive/10 border-destructive text-destructive" : "border-border text-muted-foreground"}`}
            onClick={() => setTab("skipped")}
          >
            Skipped
          </button>
        </div>

        {tab === "recent" && (
          isLoading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : tokenList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Radio size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-mono uppercase tracking-wider">Scanner idle</p>
              <p className="text-[10px] mt-1">Tokens will appear here when the bot scans</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tokenList.map((token: any) => (
                <Card key={token.id} className="bg-card border-card-border">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm uppercase">{token.tokenSymbol}</span>
                          <Badge variant="outline" className={`text-[9px] uppercase ${token.safetyStatus === "good" ? "text-gains border-gains/30" : token.safetyStatus === "risky" ? "text-losses border-losses/30" : "text-muted-foreground"}`}>
                            {token.safetyStatus}
                          </Badge>
                        </div>
                        <p className="text-[9px] text-muted-foreground truncate max-w-[160px]">{token.tokenName}</p>
                      </div>
                      <div className="text-right text-[10px]">
                        {token.liquidityUsd !== null && (
                          <p className="font-mono">${Number(token.liquidityUsd).toLocaleString()} liq</p>
                        )}
                        {token.buyTxns5m !== null && token.sellTxns5m !== null && (
                          <p>
                            <span className="text-gains">{token.buyTxns5m}B</span>
                            <span className="text-muted-foreground"> / </span>
                            <span className="text-losses">{token.sellTxns5m}S</span>
                            <span className="text-muted-foreground text-[8px]"> 5m</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1">{new Date(token.detectedAt).toLocaleTimeString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {tab === "skipped" && <SkippedTokensList />}
      </div>
    </Layout>
  );
}

function SkippedTokensList() {
  const { data, isLoading } = useQuery({
    queryKey: ["tokens-skipped"],
    queryFn: () => fetch("/api/tokens/skipped?limit=50").then(r => r.json()),
    refetchInterval: 30000,
  });

  const tokens = (data as any[]) ?? [];

  if (isLoading) return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  if (tokens.length === 0) return (
    <div className="text-center py-12 text-muted-foreground">
      <Shield size={32} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm font-mono uppercase">No skipped tokens</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {tokens.map((token: any) => (
        <Card key={token.id} className="bg-card border-card-border border-l-2 border-l-destructive/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={10} className="text-destructive" />
                  <span className="font-bold text-sm uppercase">{token.tokenSymbol}</span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">{token.reason}</p>
              </div>
              <div className="text-right">
                {token.safetyScore && <p className="text-[9px] text-muted-foreground">Score: {token.safetyScore}</p>}
                <p className="text-[9px] text-muted-foreground">{new Date(token.detectedAt).toLocaleTimeString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
