import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type SellScope = "open" | "moonbags" | "all";

interface PaperSellControlsProps {
  id?: string;
  scope?: SellScope;
  allowScope?: boolean;
  disabled?: boolean;
}

export function PaperSellControls({
  id,
  scope = "open",
  allowScope = false,
  disabled = false,
}: PaperSellControlsProps) {
  const [percentage, setPercentage] = useState("50");
  const [selectedScope, setSelectedScope] = useState<SellScope>(scope);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/paper/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(id ? { id } : { scope: selectedScope }),
          percentage: Number(percentage),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Sell failed");
      return payload;
    },
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: ["sim-balance"] });
      queryClient.invalidateQueries({ queryKey: ["paper-trades"] });
      queryClient.invalidateQueries({ queryKey: ["paper-history"] });
      queryClient.invalidateQueries({ queryKey: ["paper-moonbags"] });
      queryClient.invalidateQueries({ queryKey: ["moonbags"] });
      toast({
        title: id ? "Paper position sold" : "Bulk paper sell complete",
        description: `${payload.sold?.length ?? 1} position${(payload.sold?.length ?? 1) === 1 ? "" : "s"} processed at ${percentage}%`,
      });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Sell failed", description: error.message });
    },
  });

  return (
    <div className="flex items-center gap-1.5">
      {allowScope && (
        <select
          value={selectedScope}
          onChange={(event) => setSelectedScope(event.target.value as SellScope)}
          className="h-7 rounded-md border border-border bg-background px-1.5 text-[8px] font-bold uppercase text-muted-foreground"
          disabled={disabled || mutation.isPending}
          aria-label="Sell scope"
        >
          <option value="open">Open</option>
          <option value="moonbags">Moonbags</option>
          <option value="all">All</option>
        </select>
      )}
      <select
        value={percentage}
        onChange={(event) => setPercentage(event.target.value)}
        className="h-7 rounded-md border border-border bg-background px-1.5 text-[8px] font-bold text-muted-foreground"
        disabled={disabled || mutation.isPending}
        aria-label="Sell percentage"
      >
        {[25, 50, 75, 100].map((value) => (
          <option key={value} value={value}>{value}%</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={disabled || mutation.isPending}
        className="h-7 rounded-md border border-losses/40 bg-losses/10 px-2 text-[8px] font-black uppercase tracking-wider text-losses transition-colors hover:bg-losses/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {mutation.isPending ? "Selling…" : id ? "Sell" : "Sell"}
      </button>
    </div>
  );
}