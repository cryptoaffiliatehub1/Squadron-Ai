import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfitCardProps {
  tokenSymbol: string;
  tokenName: string;
  pnlUsd: number;
  amountSol: number;
  txSignature?: string | null;
  timestamp: string;
  onClose?: () => void;
}

export function ProfitCard({
  tokenSymbol,
  tokenName,
  pnlUsd,
  amountSol,
  timestamp,
  onClose,
}: ProfitCardProps) {
  const { toast } = useToast();
  const isPositive = pnlUsd >= 0;

  const handleShare = async () => {
    const text = `${isPositive ? "🚀" : "📉"} ${tokenSymbol} trade: ${isPositive ? "+" : ""}$${pnlUsd.toFixed(2)} PnL via Squadron AI`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard", description: "Share your trade result!" });
    } catch {
      toast({ title: "Share", description: text });
    }
  };

  return (
    <div className="bg-card border border-card-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Trade Result</p>
          <p className="font-bold text-sm uppercase">{tokenSymbol} — {tokenName}</p>
        </div>
        <span
          className={`text-2xl font-bold ${
            isPositive
              ? "text-gains drop-shadow-[0_0_10px_rgba(0,255,170,0.4)]"
              : "text-losses"
          }`}
        >
          {isPositive ? "+" : ""}${pnlUsd.toFixed(2)}
        </span>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={handleShare}>
          <Share2 size={12} className="mr-1" /> Share
        </Button>
        {onClose && (
          <Button size="sm" variant="ghost" className="flex-1 text-xs" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
