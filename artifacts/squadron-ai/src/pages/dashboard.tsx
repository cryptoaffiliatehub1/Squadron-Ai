import { Layout } from "@/components/layout";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, Wallet, Zap, ShieldAlert, Target,
  Briefcase, Moon, Users, DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNetwork } from "@/contexts/network";
import { useQuery, useMutation } from "@tanstack/react-query";

const API = "";

function useGetBotStatus(opts?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ["bot-status"],
    queryFn: () => fetch(`${API}/api/bot/status`).then(r => r.json()),
    refetchInterval: opts?.refetchInterval,
  });
}

function useGetWalletBalance(opts?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ["wallet-balance"],
    queryFn: () => fetch(`${API}/api/wallet/balance`).then(r => r.json()),
    refetchInterval: opts?.refetchInterval,
  });
}

function useGetPnlSummary() {
  return useQuery({
    queryKey: ["pnl-summary"],
    queryFn: () => fetch(`${API}/api/trades/pnl`).then(r => r.json()),
  });
}

function useGetPortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: () => fetch(`${API}/api/portfolio`).then(r => r.json()),
  });
}

function useListHistory(params?: { limit?: number }) {
  return useQuery({
    queryKey: ["history", params],
    queryFn: () => fetch(`${API}/api/history?limit=${params?.limit ?? 100}`).then(r => r.json()),
  });
}

function useToggleBot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (running: boolean) =>
      fetch(`${API}/api/bot/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ running }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bot-status"] }),
  });
}

export default function Dashboard() {
  const { toast } = useToast();
  const { network } = useNetwork();

  const { data: botStatus, isLoading: botLoading } = useGetBotStatus({ refetchInterval: 8000 });
  const { data: wallet, isLoading: walletLoading } = useGetWalletBalance({ refetchInterval: 15000 });
  const { data: pnl, isLoading: pnlLoading } = useGetPnlSummary();
  const { data: portfolio, isLoading: portfolioLoading } = useGetPortfolio();
  const { data: history } = useListHistory({ limit: 100 });

  const toggleBot = useToggleBot();

  const truncateAddress = (addr: string) => `${addr.slice(0, 4)}…${addr.slice(-4)}`;
  const isRunning = botStatus?.isRunning;
  const showWarnings = botStatus && (!botStatus.walletConfigured || !botStatus.helisConfigured);

  const moonbags = (history as any[])?.filter(
    (e: any) => e.kind === "trade" && (e.tag === "moonbag" || e.tag === "bot trade") && e.outcome === "buy",
  ) ?? [];

  const squadCapUsd = 200;
  const squadSlots = 3;

  return (
    <Layout>
      <div className="p-4 space-y-4 max-w-md mx-auto pb-4">
        <header className="flex items-center justify-between mb-4 border-b border-border pb-3">
          <div>
            <h1 className="text-base font-bold text-primary tracking-[0.25em] flex items-center gap-2 uppercase">
              <Target size={16} className="text-primary" /> Command Center
            </h1>
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.3em] mt-0.5">
              SQUADRON AI — Tactical Terminal
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[9px] uppercase font-bold text-muted-foreground">Bot Power</span>
            <Switch
              checked={!!isRunning}
              onCheckedChange={(checked) => toggleBot.mutate(checked)}
              disabled={toggleBot.isPending || botLoading}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </header>

        {showWarnings && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive p-3 rounded-md flex items-start gap-3">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold uppercase mb-1">Configuration Required</p>
              {!botStatus.walletConfigured && <p>— Wallet not configured</p>}
              {!botStatus.helisConfigured && <p>— HELIUS_KEY missing</p>}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center bg-card border border-card-border rounded-lg p-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-2.5 h-2.5 rounded-full ${isRunning ? "bg-gains pulse-indicator" : "bg-muted-foreground"}`} />
            <div>
              <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">Status</p>
              <p className="text-xs font-bold uppercase">{isRunning ? "Active Scanning" : "Standby"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-[9px] uppercase text-muted-foreground tracking-wider">Network</p>
              <Badge variant="outline" className={`text-[9px] uppercase ${network === "mainnet" ? "text-destructive border-destructive/50" : "text-yellow-400 border-yellow-400/50"}`}>
                {network}
              </Badge>
            </div>
            <div>
              <p className="text-[9px] uppercase text-muted-foreground tracking-wider">Trades</p>
              <p className="text-sm font-bold text-primary">{botStatus?.tradesExecutedToday ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-1 p-3">
              <CardTitle className="text-[9px] uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                <Wallet size={10} /> Wallet
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {walletLoading ? <Skeleton className="h-6 w-16 mb-1" /> : (
                <div className="text-lg font-bold">{(wallet?.solBalance ?? 0).toFixed(3)} SOL</div>
              )}
              {walletLoading ? <Skeleton className="h-4 w-12" /> : (
                <div className="text-xs text-muted-foreground">${(wallet?.usdValue ?? 0).toFixed(2)}</div>
              )}
              {wallet?.walletAddress && (
                <div className="mt-1 text-[9px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5 inline-block">
                  {truncateAddress(wallet.walletAddress)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-card-border border-l-2 border-l-primary">
            <CardHeader className="pb-1 p-3">
              <CardTitle className="text-[9px] uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                <ShieldAlert size={10} /> Max Trade
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {walletLoading ? <Skeleton className="h-6 w-16 mb-1" /> : (
                <div className="text-lg font-bold text-primary">{(wallet?.maxTradeAmount ?? 0).toFixed(3)} SOL</div>
              )}
              <div className="text-[9px] text-muted-foreground mt-0.5 uppercase">20% Rule Active</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-card-border border-l-2 border-l-yellow-400/50">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-[9px] uppercase text-muted-foreground tracking-wider flex items-center gap-1">
              <Users size={10} className="text-yellow-400" /> Squad Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1 text-xs font-bold">
                  <DollarSign size={12} className="text-yellow-400" />
                  <span>${squadCapUsd} Cap / Trade</span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {squadSlots} slots — excess capital rotates to next token
                </p>
              </div>
              <Badge variant="outline" className="text-[9px] text-yellow-400 border-yellow-400/50 uppercase">Active</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-[9px] uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Zap size={10} /> P&L Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            {pnlLoading ? <Skeleton className="h-10 w-full" /> : pnl ? (
              <div className="space-y-3">
                <div className="flex justify-between items-end border-b border-border/40 pb-3">
                  <div>
                    <p className="text-[9px] uppercase text-muted-foreground mb-0.5">Today's P&L</p>
                    <p className={`text-2xl font-bold ${pnl.dailyPnlUsd >= 0 ? "text-gains drop-shadow-[0_0_10px_rgba(0,255,170,0.4)]" : "text-losses drop-shadow-[0_0_10px_rgba(255,50,50,0.4)]"}`}>
                      {pnl.dailyPnlUsd >= 0 ? "+" : ""}${pnl.dailyPnlUsd.toFixed(2)}
                    </p>
                  </div>
                  <div className={`text-lg font-bold ${pnl.dailyPnlPct >= 0 ? "text-gains" : "text-losses"}`}>
                    {pnl.dailyPnlPct >= 0 ? "+" : ""}{pnl.dailyPnlPct.toFixed(1)}%
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">Win</p>
                    <p className="text-gains font-bold">{pnl.winningTradesCount}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">Loss</p>
                    <p className="text-losses font-bold">{pnl.losingTradesCount}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">All Time</p>
                    <p className={`font-bold ${pnl.allTimePnlUsd >= 0 ? "text-gains" : "text-losses"}`}>
                      ${Math.abs(pnl.allTimePnlUsd).toFixed(0)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border border-l-2 border-l-primary/50">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-[9px] uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Moon size={10} className="text-primary" /> Moonbag Recycler
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            {moonbags.length === 0 ? (
              <div className="text-[10px] text-muted-foreground py-1">
                No moonbag positions. When the bot sells, 50% of profit is recycled as a moonbag.
              </div>
            ) : (
              <div className="space-y-2">
                {moonbags.slice(0, 5).map((m: any) => (
                  <div key={m.id} className="flex justify-between items-center text-xs border-b border-border/20 pb-1.5 last:border-0">
                    <span className="font-bold uppercase">{m.tokenSymbol}</span>
                    <span className="text-muted-foreground font-mono text-[10px]">{Number(m.amountSol ?? 0).toFixed(3)} SOL</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
