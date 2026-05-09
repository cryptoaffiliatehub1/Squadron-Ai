import { Layout } from "@/components/layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, BellOff, Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: () => fetch("/api/alerts").then(r => r.json()),
    refetchInterval: 30000,
  });
}

export default function Alerts() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: alerts, isLoading } = useAlerts();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tokenMint: "", tokenSymbol: "", tokenName: "", targetPrice: "", direction: "above" });

  const createAlert = useMutation({
    mutationFn: (data: typeof form) =>
      fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, targetPrice: parseFloat(data.targetPrice) }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      setShowForm(false);
      setForm({ tokenMint: "", tokenSymbol: "", tokenName: "", targetPrice: "", direction: "above" });
      toast({ title: "Alert created" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to create alert" }),
  });

  const deleteAlert = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/alerts/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      toast({ title: "Alert deleted" });
    },
  });

  const alertList = (alerts as any[]) ?? [];

  return (
    <Layout>
      <div className="p-4 space-y-4 max-w-md mx-auto">
        <header className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h1 className="text-base font-bold text-primary tracking-[0.25em] uppercase flex items-center gap-2">
              <Bell size={14} /> Price Alerts
            </h1>
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.3em] mt-0.5">Set price triggers</p>
          </div>
          <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => setShowForm(!showForm)}>
            <Plus size={12} className="mr-1" /> New Alert
          </Button>
        </header>

        {showForm && (
          <Card className="bg-card border-card-border border-l-2 border-l-primary">
            <CardContent className="p-3 space-y-2">
              <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">New Price Alert</p>
              <input className="w-full bg-input border border-border rounded px-2 py-1 text-xs font-mono" placeholder="Token Mint Address" value={form.tokenMint} onChange={e => setForm(f => ({ ...f, tokenMint: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <input className="bg-input border border-border rounded px-2 py-1 text-xs font-mono" placeholder="Symbol (e.g. PEPE)" value={form.tokenSymbol} onChange={e => setForm(f => ({ ...f, tokenSymbol: e.target.value }))} />
                <input className="bg-input border border-border rounded px-2 py-1 text-xs font-mono" placeholder="Name" value={form.tokenName} onChange={e => setForm(f => ({ ...f, tokenName: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="bg-input border border-border rounded px-2 py-1 text-xs font-mono" placeholder="Target Price ($)" type="number" value={form.targetPrice} onChange={e => setForm(f => ({ ...f, targetPrice: e.target.value }))} />
                <select className="bg-input border border-border rounded px-2 py-1 text-xs font-mono" value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}>
                  <option value="above">Above ↑</option>
                  <option value="below">Below ↓</option>
                </select>
              </div>
              <Button size="sm" className="w-full text-xs h-7" onClick={() => createAlert.mutate(form)} disabled={createAlert.isPending || !form.tokenMint || !form.targetPrice}>
                {createAlert.isPending ? "Creating..." : "Create Alert"}
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : alertList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BellOff size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-mono uppercase tracking-wider">No alerts set</p>
            <p className="text-[10px] mt-1">Create alerts to get notified on price movements</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alertList.map((alert: any) => (
              <Card key={alert.id} className={`bg-card border-card-border ${alert.isTriggered ? "border-l-2 border-l-gains" : ""}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm uppercase">{alert.tokenSymbol}</span>
                      <Badge variant="outline" className={`text-[9px] uppercase ${alert.direction === "above" ? "text-gains border-gains/30" : "text-losses border-losses/30"}`}>
                        {alert.direction === "above" ? "↑ Above" : "↓ Below"}
                      </Badge>
                      {alert.isTriggered && (
                        <Badge variant="outline" className="text-[9px] text-gains border-gains/30 uppercase">Triggered</Badge>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteAlert.mutate(alert.id)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <p className="text-muted-foreground">Target Price</p>
                      <p className="font-mono font-bold">${Number(alert.targetPrice).toFixed(8)}</p>
                    </div>
                    {alert.currentPrice !== null && (
                      <div>
                        <p className="text-muted-foreground">Current Price</p>
                        <p className="font-mono">${Number(alert.currentPrice).toFixed(8)}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-2">
                    Set {new Date(alert.createdAt).toLocaleString()}
                    {alert.triggeredAt && ` • Triggered ${new Date(alert.triggeredAt).toLocaleString()}`}
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
