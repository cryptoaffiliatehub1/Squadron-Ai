import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, AlertTriangle } from "lucide-react";

export default function Skipped() {
  const { data, isLoading } = useQuery({
    queryKey: ["tokens-skipped"],
    queryFn: () => fetch("/api/tokens/skipped?limit=100").then(r => r.json()),
    refetchInterval: 30000,
  });

  const tokens = (data as any[]) ?? [];

  return (
    <Layout>
      <div className="p-4 space-y-4 max-w-md mx-auto">
        <header className="border-b border-border pb-3">
          <h1 className="text-base font-bold text-primary tracking-[0.25em] uppercase flex items-center gap-2">
            <Shield size={14} /> Rejected Tokens
          </h1>
          <p className="text-[9px] text-muted-foreground uppercase tracking-[0.3em] mt-0.5">
            Failed safety checks — {tokens.length} tokens blocked
          </p>
        </header>

        {isLoading ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Shield size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-mono uppercase">No rejected tokens</p>
            <p className="text-[10px] mt-1">Tokens that fail risk checks will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tokens.map((token: any) => (
              <Card key={token.id} className="bg-card border-card-border border-l-2 border-l-destructive/40">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={10} className="text-destructive" />
                        <span className="font-bold text-sm uppercase">{token.tokenSymbol}</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-0.5 max-w-[200px]">{token.reason}</p>
                    </div>
                    <div className="text-right text-[9px] text-muted-foreground">
                      {token.safetyScore && <p>Score: {token.safetyScore}</p>}
                      <p>{new Date(token.detectedAt).toLocaleTimeString()}</p>
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
