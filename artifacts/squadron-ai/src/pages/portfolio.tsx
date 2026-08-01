import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, Moon, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useTradingMode } from "@/contexts/trading-mode";

export default function Portfolio() {
  const { isPaper } = useTradingMode();

  const { data: portfolio, isLoading: portfolioLoading } = useQuery({
    queryKey: ["portfolio"],
    queryFn: () => fetch("/api/portfolio").then(r => r.json()),
    refetchInterval: 30000,
  });
  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: () => fetch("/api/wallet/balance").then(r => r.json()),
    refetchInterval: 15000,
  });
  const { data: moonbags, isLoading: moonbagsLoading } = useQuery({
    queryKey: ["moonbags"],
    queryFn: () => fetch("/api/moonbags").then(r => r.json()),
    refetchInterval: 15000,
  });

  // C1: safeNum — guard against non-numeric values leaking into .toFixed() calls
  const safeNum = (v: unknown, fallback = 0): number => {
    const n = typeof v === "number" ? v : Number(v ?? fallback);
    return isFinite(n) ? n : fallback;
  };

  const tokens       = (portfolio as any[]) ?? [];
  const solBalance   = safeNum((wallet as any)?.solBalance);
  const usdBalance   = safeNum((wallet as any)?.usdValue);
  const moonbagList  = (moonbags as any)?.positions ?? [];
  const vaultSol     = safeNum((moonbags as any)?.totalValueSol);
  const totalUsd     = tokens.reduce((sum: number, t: any) => sum + safeNum(t.usdValue), 0);

  const panelCls = "bg-card border border-border rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.25)]";
  const labelCls = "text-[7.5px] text-muted-foreground uppercase tracking-[0.2em] font-bold";

  return (
    <Layout>
      <div className="px-3 pb-4 space-y-3 max-w-lg mx-auto">
        <div>
          <h1 className="text-sm font-bold text-primary tracking-[0.2em] uppercase flex items-center gap-2">
            <Briefcase size={12} /> Portfolio
          </h1>
          <p className="text-[8px] text-muted-foreground uppercase tracking-[0.25em] mt-0.5">
            Holdings · Moonbag Vault · Balance
          </p>
        </div>

        {/* Wallet Balance Card */}
        <div className={`${panelCls} p-4 border-l-2 border-l-primary/50`}>
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={11} className="text-primary" />
            <span className={`${labelCls}`}>Wallet Balance</span>
          </div>
          {walletLoading ? (
            <Skeleton className="h-10 w-32 rounded-lg" />
          ) : (
            <div className="flex items-end gap-3">
              <div>
                <p className="text-2xl font-black font-mono text-white">{solBalance.toFixed(4)}</p>
                <p className="text-[8.5px] text-muted-foreground font-mono">SOL</p>
              </div>
              <div className="mb-1">
                <p className="text-sm font-bold font-mono text-muted-foreground">${usdBalance.toFixed(2)}</p>
                <p className="text-[8px] text-muted-foreground">USD est.</p>
              </div>
              {isPaper && (
                <span className="mb-1 text-[7.5px] px-1.5 py-0.5 rounded border text-yellow-400 border-yellow-500/30 bg-yellow-500/8 font-bold uppercase">
                  SIM
                </span>
              )}
            </div>
          )}
        </div>

        {/* Moonbag Vault */}
        <div className={`${panelCls} p-3 border-l-2 ${isPaper ? "border-l-yellow-500/50" : "border-l-primary/60"}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Moon size={11} className="text-primary" />
              <span className={labelCls}>Moonbag Vault</span>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black font-mono text-primary">{vaultSol.toFixed(4)} SOL</p>
              <p className="text-[7.5px] text-muted-foreground">50% post-exit bags</p>
            </div>
          </div>

          {moonbagsLoading ? (
            <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : moonbagList.length === 0 ? (
            <div className="py-4 text-center">
              <Moon size={20} className="mx-auto mb-2 text-muted-foreground/20" />
              <p className="text-[8.5px] text-muted-foreground">Empty vault</p>
              <p className="text-[7.5px] text-muted-foreground/50 mt-0.5">At 2.5× gain, 50% moves here with $0 cost basis</p>
            </div>
          ) : (
            <div className="space-y-2">
              {moonbagList.map((m: any) => (
                <div key={m.id} className="flex justify-between items-center bg-background/40 rounded-lg px-2.5 py-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase">{m.tokenSymbol}</p>
                    <p className="text-[7.5px] text-muted-foreground">Cost: <span className="text-gains">$0</span> (recovered)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gains font-black font-mono">{safeNum(m.currentMultiplier, 1).toFixed(2)}×</p>
                    <p className="text-[7.5px] text-muted-foreground font-mono">{safeNum(m.currentValueSol).toFixed(4)} SOL</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Token Holdings */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className={`${labelCls} flex items-center gap-1`}><Briefcase size={8} /> Holdings</p>
            {totalUsd > 0 && (
              <p className="text-[8.5px] font-mono font-bold text-primary">${totalUsd.toFixed(2)}</p>
            )}
          </div>

          {portfolioLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : tokens.length === 0 ? (
            <div className={`${panelCls} p-6 text-center`}>
              <Briefcase size={24} className="mx-auto mb-3 text-muted-foreground/20" />
              <p className="text-sm font-mono uppercase text-muted-foreground">No holdings</p>
              <p className="text-[9px] text-muted-foreground/50 mt-1">Portfolio populates when the bot executes trades</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tokens.map((token: any, i: number) => {
                // C1: safeNum guards prevent crash when priceChange24h/usdValue are non-numeric
                const change = safeNum(token.priceChange24h);
                const usdVal = safeNum(token.usdValue);
                return (
                  <div key={i} className={`${panelCls} p-3`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-xs uppercase">{token.symbol}</p>
                        <p className="text-[8.5px] text-muted-foreground font-mono">{token.balance?.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-bold">${usdVal.toFixed(2)}</p>
                        <div className={`flex items-center justify-end gap-0.5 text-[8.5px] font-bold ${change >= 0 ? "text-gains" : "text-losses"}`}>
                          {change >= 0 ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                          {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
