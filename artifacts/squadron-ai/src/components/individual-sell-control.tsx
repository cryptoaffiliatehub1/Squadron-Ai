import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const percentages = [25, 50, 75, 100];

export function IndividualSellControl({ tradeId, tokenSymbol }: {
  tradeId: string;
  tokenSymbol?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pendingPct, setPendingPct] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  async function sell(sellPct: number) {
    if (pendingPct !== null) return;
    setPendingPct(sellPct);
    try {
      const response = await fetch(`/api/paper/trades/${encodeURIComponent(tradeId)}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellPct }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Individual sell failed");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sim-balance"] }),
        queryClient.invalidateQueries({ queryKey: ["paper-trades"] }),
        queryClient.invalidateQueries({ queryKey: ["daily-report"] }),
        queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
        queryClient.invalidateQueries({ queryKey: ["moonbags"] }),
        queryClient.invalidateQueries({ queryKey: ["paper-log"] }),
      ]);

      toast({
        title: "MANUAL EXIT — INDIVIDUAL",
        description: `${tokenSymbol ?? "Position"} · ${sellPct}% executed at current price · $${Number(payload.proceedsUsd ?? 0).toFixed(2)} proceeds`,
      });
      setOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Individual sell failed",
        description: error instanceof Error ? error.message : "Unable to execute the individual exit",
      });
    } finally {
      setPendingPct(null);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-7 px-2 rounded-md border border-losses/50 bg-losses/10 text-losses text-[8px] font-bold uppercase tracking-wider hover:bg-losses/20 active:scale-95 transition-all"
      >
        Sell
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-losses/40 bg-losses/5 p-1">
      <span className="text-[7px] text-losses font-bold uppercase px-1">Sell</span>
      {percentages.map((sellPct) => (
        <button
          key={sellPct}
          type="button"
          onClick={() => sell(sellPct)}
          disabled={pendingPct !== null}
          className="h-6 min-w-7 px-1 rounded border border-losses/40 bg-losses/10 text-losses text-[8px] font-mono font-bold hover:bg-losses/20 active:scale-95 transition-all disabled:opacity-50"
        >
          {pendingPct === sellPct ? <Loader2 size={10} className="mx-auto animate-spin" /> : `${sellPct}%`}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setOpen(false)}
        disabled={pendingPct !== null}
        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
        aria-label="Cancel individual sell"
      >
        <X size={11} />
      </button>
      <Check size={10} className="text-gains shrink-0" aria-label="Executes at current price" />
    </div>
  );
}