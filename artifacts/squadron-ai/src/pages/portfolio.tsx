import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase, Moon, TrendingUp, TrendingDown, Wallet,
  ChevronDown, ChevronUp, ExternalLink, Shield,
} from "lucide-react";
import { useTradingMode } from "@/contexts/trading-mode";
import { useState } from "react";
import { BulkSellControl } from "@/components/bulk-sell-control";

export default function Portfolio() {
  const { isPaper } = useTradingMode();
  const [expandedMoonbag, setExpandedMoonbag] = useState<string | null>(null);

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

  const safeNum = (v: unknown, fallback = 0): number => {
    const n = typeof v === "number" ? v : Number(v ?? fallback);
    return isFinite(n) ? n : fallback;
  };

  const fmtPrice = (v: unknown): string => {
    const n = safeNum(v);
    if (n === 0) return "—";
    if (n < 0.0001) return `$${n.toExponential(3)}`;
    if (n < 0.01)   return `$${n.toFixed(6)}`;
    if (n < 1)      return `$${n.toFixed(4)}`;
    return `$${n.toFixed(2)}`;
  };

  const tokens       = (portfolio as any[]) ?? [];
  const solBalance   = safeNum((wallet as any)?.solBalance);
  const usdBalance   = safeNum((wallet as any)?.usdValue);
  const moonbagList  = (moonbags as any)?.positions ?? [];
  const vaultSol     = safeNum((moonbags as any)?.totalValueSol);
  const totalUsd     = tokens.reduce((sum: number, t: any) => sum + safeNum(t.usdValue), 0);

  const panelCls = "bg-card border border-border rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.25)]";
  const labelCls = "text-[7.5px] text-muted-foreground uppercase tracking-[0.2em] font-bold";

  const tierColor = (tier: string) =>
    tier === "EMERGENCY_EXIT" ? "text-losses border-losses/40 bg-losses/8"
    : tier === "ALERT"        ? "text-yellow-400 border-yellow-400/40 bg-yellow-400/8"
    : "text-gains border-gains/40 bg-gains/8";

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

        <div className="flex items-center justify-between rounded-xl border border-losses/30 bg-losses/5 px-3 py-2">
          <div>
            <p className="text-[8px] text-losses font-bold uppercase tracking-[0.18em]">Global Exit</p>
            <p className="text-[7px] text-muted-foreground uppercase tracking-wider mt-0.5">Sell paper positions now</p>
          </div>
          <BulkSellControl />
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
              {moonbagList.map((m: any) => {
                const isExpanded = expandedMoonbag === m.id;
                const tier = (m.protectionTier ?? "HOLD") as string;
                // entryPrice is the golden-exit price (= 2.5× from original)
                // Original buy price ≈ entryPrice / 2.5
                const goldenExitPrice = safeNum(m.entryPrice);
                const originalBuyPrice = goldenExitPrice > 0 ? goldenExitPrice / 2.5 : 0;
                const currentPrice    = safeNum(m.currentPrice);
                const multiplier      = safeNum(m.currentMultiplier, 1);
                const currentValueSol = safeNum(m.currentValueSol);
                const originalCostUsd = safeNum(m.originalCostUsd);
                const tokensHeld      = safeNum(m.tokensHeld);
                const enteredAt       = m.enteredAt ? new Date(m.enteredAt).toLocaleString() : "—";
                const dexUrl = `https://dexscreener.com/solana/${m.tokenMint ?? ""}`;

                return (
                  <div key={m.id} className="bg-background/40 rounded-lg border border-border/40 overflow-hidden">
                    {/* Summary row — tap to expand */}
                    <button
                      className="w-full flex justify-between items-center px-2.5 py-2 hover:bg-background/60 transition-colors"
                      onClick={() => setExpandedMoonbag(isExpanded ? null : m.id)}
                    >
                      <div className="flex items-center gap-2 text-left">
                        <Moon size={9} className="text-primary shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold uppercase">{m.tokenSymbol}</p>
                          <p className="text-[7.5px] text-muted-foreground">Cost: <span className="text-gains">$0</span> (recovered)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-[10px] text-gains font-black font-mono">{multiplier.toFixed(2)}×</p>
                          <p className="text-[7.5px] text-muted-foreground font-mono">{currentValueSol.toFixed(4)} SOL</p>
                        </div>
                        {isExpanded
                          ? <ChevronUp size={12} className="text-muted-foreground shrink-0" />
                          : <ChevronDown size={12} className="text-muted-foreground shrink-0" />}
                      </div>
                    </button>

                    {/* Detail panel */}
                    {isExpanded && (
                      <div className="border-t border-border/30 px-3 py-2.5 space-y-2.5">
                        {/* Protection tier */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Shield size={9} className="text-muted-foreground" />
                            <span className="text-[7.5px] text-muted-foreground uppercase tracking-wider">Protection Tier</span>
                          </div>
                          <span className={`text-[7.5px] px-1.5 py-0.5 rounded border font-bold uppercase ${tierColor(tier)}`}>
                            {tier === "EMERGENCY_EXIT" ? "EMERGENCY EXIT" : tier}
                          </span>
                        </div>

                        {/* Original buy → golden exit */}
                        <div className="space-y-1">
                          <p className="text-[7.5px] text-muted-foreground uppercase tracking-wider font-bold">Trade History</p>
                          <div className="bg-card/60 rounded-lg p-2 space-y-1.5 text-[8.5px]">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Original entry</span>
                              <span className="font-mono text-white">{fmtPrice(originalBuyPrice)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Golden exit at (2.5×)</span>
                              <span className="font-mono text-gains">{fmtPrice(goldenExitPrice)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Capital invested</span>
                              <span className="font-mono">{originalCostUsd > 0 ? `$${originalCostUsd.toFixed(2)}` : "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Capital recovered</span>
                              <span className="font-mono text-gains">✓ Full (50% sold at 2.5×)</span>
                            </div>
                          </div>
                        </div>

                        {/* Current moonbag holding */}
                        <div className="space-y-1">
                          <p className="text-[7.5px] text-muted-foreground uppercase tracking-wider font-bold">Current Moonbag</p>
                          <div className="bg-card/60 rounded-lg p-2 space-y-1.5 text-[8.5px]">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tokens held (50%)</span>
                              <span className="font-mono">{tokensHeld > 0 ? tokensHeld.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Moonbag entry price</span>
                              <span className="font-mono text-primary">{fmtPrice(goldenExitPrice)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Current price</span>
                              <span className={`font-mono ${currentPrice > goldenExitPrice ? "text-gains" : "text-losses"}`}>
                                {fmtPrice(currentPrice)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Current value</span>
                              <span className="font-mono text-primary font-bold">{currentValueSol.toFixed(6)} SOL</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Multiplier vs entry</span>
                              <span className={`font-mono font-bold ${multiplier >= 1 ? "text-gains" : "text-losses"}`}>
                                {multiplier.toFixed(3)}×
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Cost basis</span>
                              <span className="font-mono text-gains font-bold">$0.00</span>
                            </div>
                          </div>
                        </div>

                        {/* Timestamps */}
                        <p className="text-[7.5px] text-muted-foreground/50 font-mono">
                          Moonbag created: {enteredAt}
                        </p>

                        {/* DexScreener link */}
                        <button
                          className="w-full flex items-center justify-center gap-1.5 text-[8px] text-primary/70 hover:text-primary transition-colors py-1"
                          onClick={() => window.open(dexUrl, "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink size={9} />
                          View on DexScreener
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
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
