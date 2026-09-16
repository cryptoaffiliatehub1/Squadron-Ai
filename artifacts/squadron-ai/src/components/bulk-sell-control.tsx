import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Scope = "OPEN_POSITIONS" | "MOONBAGS" | "BOTH";

const scopes: Array<{ value: Scope; label: string; detail: string }> = [
  { value: "OPEN_POSITIONS", label: "Open Positions", detail: "Active trades still carrying cost basis" },
  { value: "MOONBAGS", label: "Moonbags", detail: "Recovered-cost vault positions" },
  { value: "BOTH", label: "Both", detail: "Every open and vault position" },
];

const percentages = [25, 50, 75, 100];

export function BulkSellControl() {
  const [step, setStep] = useState<"closed" | "scope" | "percentage">("closed");
  const [scope, setScope] = useState<Scope | null>(null);
  const [pending, setPending] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function close() {
    if (pending) return;
    setStep("closed");
    setScope(null);
  }

  function chooseScope(nextScope: Scope) {
    setScope(nextScope);
    setStep("percentage");
  }

  async function choosePercentage(sellPct: number) {
    if (!scope || pending) return;
    const selected = scopes.find((item) => item.value === scope);
    setPending(true);
    try {
      const response = await fetch("/api/sim/bulk-sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, sellPct }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Bulk sell failed");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sim-balance"] }),
        queryClient.invalidateQueries({ queryKey: ["paper-trades"] }),
        queryClient.invalidateQueries({ queryKey: ["daily-report"] }),
        queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
        queryClient.invalidateQueries({ queryKey: ["moonbags"] }),
        queryClient.invalidateQueries({ queryKey: ["paper-log"] }),
      ]);

      toast({
        title: `MANUAL EXIT — BULK (${selected?.label ?? scope})`,
        description: `${sellPct}% executed at current price · ${payload.affectedCount} position${payload.affectedCount === 1 ? "" : "s"} · $${Number(payload.totalProceedsUsd ?? 0).toFixed(2)} proceeds`,
      });
      close();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Bulk sell failed",
        description: error instanceof Error ? error.message : "Unable to execute the bulk exit",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative">
      {step === "closed" && (
        <button
          type="button"
          onClick={() => setStep("scope")}
          className="h-8 px-3 rounded-lg border border-losses/50 bg-losses/10 text-losses text-[8px] font-bold uppercase tracking-[0.18em] hover:bg-losses/20 active:scale-95 transition-all"
        >
          Sell
        </button>
      )}

      {step !== "closed" && (
        <div className="w-[min(330px,calc(100vw-24px))] rounded-xl border border-losses/40 bg-card shadow-[0_0_32px_rgba(255,0,107,0.12)] p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] text-losses font-bold uppercase tracking-[0.2em]">Global Sell</p>
              <p className="text-[7px] text-muted-foreground uppercase tracking-wider mt-0.5">
                {step === "scope" ? "1 / 2 · Choose scope" : "2 / 2 · Choose percentage"}
              </p>
            </div>
            <button type="button" onClick={close} disabled={pending} className="text-muted-foreground hover:text-foreground disabled:opacity-40">
              <X size={13} />
            </button>
          </div>

          {step === "scope" ? (
            <div className="space-y-1.5">
              {scopes.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => chooseScope(item.value)}
                  className="w-full flex items-center justify-between gap-2 rounded-lg border border-border bg-background/40 px-2.5 py-2 text-left hover:border-losses/50 hover:bg-losses/5 transition-colors"
                >
                  <span>
                    <span className="block text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
                    <span className="block text-[7px] text-muted-foreground mt-0.5">{item.detail}</span>
                  </span>
                  <ChevronRight size={12} className="text-losses shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <button type="button" onClick={() => setStep("scope")} disabled={pending} className="text-[7px] text-muted-foreground uppercase tracking-wider hover:text-foreground">
                ← Change scope: <span className="text-losses font-bold">{scopes.find((item) => item.value === scope)?.label}</span>
              </button>
              <div className="grid grid-cols-4 gap-1.5">
                {percentages.map((sellPct) => (
                  <button
                    key={sellPct}
                    type="button"
                    onClick={() => choosePercentage(sellPct)}
                    disabled={pending}
                    className="h-9 rounded-lg border border-losses/40 bg-losses/10 text-losses text-[9px] font-bold font-mono hover:bg-losses/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {pending && sellPct === 100 ? <Loader2 size={12} className="mx-auto animate-spin" /> : `${sellPct}%`}
                  </button>
                ))}
              </div>
              <p className="flex items-center gap-1 text-[7px] text-muted-foreground">
                <Check size={9} className="text-gains" /> Executes now at each position&apos;s latest price
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}