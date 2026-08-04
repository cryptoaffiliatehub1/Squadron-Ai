import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Share2, Download } from "lucide-react";

export type CardStyle = "tactical-grid" | "vortex-minimalist" | "neon-border" | "glassmorphism" | "full-logo";

interface ProfitShareCardProps {
  tokenSymbol: string;
  tokenName: string;
  pnlUsd: number;
  amountSol: number;
  timestamp: string;
  multiplier?: number;
  style?: CardStyle;
  onStyleChange?: (style: CardStyle) => void;
}

const CARD_STYLES: { value: CardStyle; label: string }[] = [
  { value: "tactical-grid", label: "Tactical Grid" },
  { value: "vortex-minimalist", label: "Vortex Minimalist" },
  { value: "neon-border", label: "Neon Border" },
  { value: "glassmorphism", label: "Glassmorphism" },
  { value: "full-logo", label: "Full Logo" },
];

function CardContent({ tokenSymbol, tokenName, pnlUsd, amountSol, timestamp, multiplier, style }: ProfitShareCardProps) {
  const isProfit = pnlUsd >= 0;
  const accentColor = isProfit ? "#00FFA3" : "#FF006B";
  const formattedPnl = `${isProfit ? "+" : ""}$${Math.abs(pnlUsd).toFixed(2)}`;
  const date = new Date(timestamp).toLocaleString();

  const baseStyle: React.CSSProperties = {
    width: "320px",
    height: "180px",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'JetBrains Mono', monospace",
  };

  if (style === "vortex-minimalist") {
    return (
      <div style={{ ...baseStyle, background: "#0B0E11", border: `1px solid ${accentColor}22` }}>
        <div style={{ position: "absolute", top: "12px", left: "12px", right: "12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{ fontSize: "9px", color: "#666", letterSpacing: "0.2em", textTransform: "uppercase" }}>SQUADRON AI</span>
          <span style={{ fontSize: "8px", color: "#444" }}>{date}</span>
        </div>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
          <div style={{ fontSize: "36px", fontWeight: 900, color: accentColor, letterSpacing: "-0.02em" }}>{formattedPnl}</div>
          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.15em" }}>{tokenSymbol}</div>
        </div>
        <div style={{ position: "absolute", bottom: "10px", left: "12px", right: "12px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "7px", color: "#333", textTransform: "uppercase" }}>squadron ai watermark</span>
          <span style={{ fontSize: "7px", color: accentColor + "80" }}>squadronai.io</span>
        </div>
      </div>
    );
  }

  if (style === "neon-border") {
    return (
      <div style={{ ...baseStyle, background: "#050709", border: `2px solid ${accentColor}`, boxShadow: `0 0 20px ${accentColor}40, inset 0 0 20px ${accentColor}08` }}>
        <div style={{ position: "absolute", top: "10px", left: "10px" }}>
          <span style={{ fontSize: "9px", color: accentColor, letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 700 }}>SQUADRON AI</span>
        </div>
        <div style={{ position: "absolute", top: "10px", right: "10px" }}>
          <span style={{ fontSize: "8px", color: "#555" }}>{date}</span>
        </div>
        <div style={{ position: "absolute", top: "50%", left: "12px", transform: "translateY(-50%)" }}>
          <div style={{ fontSize: "32px", fontWeight: 900, color: "#fff", textShadow: `0 0 20px ${accentColor}` }}>{formattedPnl}</div>
          <div style={{ fontSize: "10px", color: accentColor, marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.12em" }}>{tokenSymbol} — {tokenName.slice(0, 16)}</div>
          {multiplier && <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>{multiplier.toFixed(2)}× return</div>}
        </div>
        <div style={{ position: "absolute", bottom: "8px", right: "10px", fontSize: "7px", color: accentColor + "40", textTransform: "uppercase" }}>Squadron AI</div>
      </div>
    );
  }

  if (style === "glassmorphism") {
    return (
      <div style={{ ...baseStyle, background: "linear-gradient(135deg, rgba(0,255,163,0.05) 0%, rgba(11,14,17,0.95) 100%)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ position: "absolute", top: "10px", left: "12px", right: "12px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.3em", textTransform: "uppercase" }}>SQUADRON AI</span>
          <span style={{ fontSize: "7px", color: "rgba(255,255,255,0.2)" }}>{date}</span>
        </div>
        <div style={{ position: "absolute", top: "45%", left: "12px", transform: "translateY(-50%)" }}>
          <div style={{ fontSize: "30px", fontWeight: 900, color: accentColor, letterSpacing: "-0.01em" }}>{formattedPnl}</div>
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", marginTop: "4px", textTransform: "uppercase" }}>{tokenSymbol}</div>
        </div>
        <div style={{ position: "absolute", bottom: "10px", left: "12px", right: "12px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "6px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "7px", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>{amountSol.toFixed(4)} SOL staked</span>
          <span style={{ fontSize: "7px", color: accentColor + "40", textTransform: "uppercase" }}>Squadron AI</span>
        </div>
      </div>
    );
  }

  if (style === "full-logo") {
    return (
      <div style={{ ...baseStyle, background: "linear-gradient(135deg, #0B0E11 0%, #0f1620 100%)", border: `1px solid ${accentColor}33` }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "36px", background: accentColor + "15", borderBottom: `1px solid ${accentColor}22`, display: "flex", alignItems: "center", padding: "0 12px", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 900, color: "#000" }}>S</div>
            <span style={{ fontSize: "9px", fontWeight: 700, color: accentColor, letterSpacing: "0.2em", textTransform: "uppercase" }}>SQUADRON AI</span>
          </div>
          <span style={{ fontSize: "7px", color: "#555" }}>{date}</span>
        </div>
        <div style={{ position: "absolute", top: "50px", left: "12px" }}>
          <div style={{ fontSize: "28px", fontWeight: 900, color: isProfit ? "#00FFA3" : "#FF006B" }}>{formattedPnl}</div>
          <div style={{ fontSize: "10px", color: "#888", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.12em" }}>{tokenSymbol} — {tokenName.slice(0, 18)}</div>
        </div>
        <div style={{ position: "absolute", bottom: "8px", left: "12px", right: "12px", fontSize: "7px", color: "#333", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.2em" }}>squadron ai · tactical meme sniper</div>
      </div>
    );
  }

  // Default: Tactical Grid
  return (
    <div style={{ ...baseStyle, background: "#0B0E11", backgroundImage: `linear-gradient(rgba(0,255,163,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,163,0.03) 1px, transparent 1px)`, backgroundSize: "20px 20px", border: `1px solid ${accentColor}33` }}>
      <div style={{ position: "absolute", top: "8px", left: "10px" }}>
        <span style={{ fontSize: "8px", color: accentColor, letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 700 }}>SQUADRON AI</span>
      </div>
      <div style={{ position: "absolute", top: "8px", right: "10px" }}>
        <span style={{ fontSize: "7px", color: "#333" }}>{date}</span>
      </div>
      <div style={{ position: "absolute", top: "35px", left: "10px", right: "10px", borderTop: `1px solid ${accentColor}22`, paddingTop: "10px" }}>
        <div style={{ fontSize: "34px", fontWeight: 900, color: accentColor, letterSpacing: "-0.02em" }}>{formattedPnl}</div>
        <div style={{ display: "flex", gap: "16px", marginTop: "6px" }}>
          <div><div style={{ fontSize: "7px", color: "#444", textTransform: "uppercase" }}>Token</div><div style={{ fontSize: "10px", color: "#fff", fontWeight: 700 }}>{tokenSymbol}</div></div>
          <div><div style={{ fontSize: "7px", color: "#444", textTransform: "uppercase" }}>Staked</div><div style={{ fontSize: "10px", color: "#fff" }}>{amountSol.toFixed(4)} SOL</div></div>
          {multiplier && <div><div style={{ fontSize: "7px", color: "#444", textTransform: "uppercase" }}>Return</div><div style={{ fontSize: "10px", color: accentColor }}>{multiplier.toFixed(2)}×</div></div>}
        </div>
      </div>
      <div style={{ position: "absolute", bottom: "8px", left: "10px", right: "10px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "7px", color: "#222", textTransform: "uppercase", letterSpacing: "0.15em" }}>squadron ai · tactical meme sniper</span>
        <span style={{ fontSize: "7px", color: accentColor + "30" }}>squadronai.io</span>
      </div>
    </div>
  );
}

export function ProfitShareCard(props: ProfitShareCardProps) {
  const { toast } = useToast();
  const [selectedStyle, setSelectedStyle] = useState<CardStyle>(props.style ?? "tactical-grid");
  const cardRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    const isProfit = props.pnlUsd >= 0;
    const text = `${isProfit ? "🚀" : "📉"} ${props.tokenSymbol}: ${isProfit ? "+" : ""}$${Math.abs(props.pnlUsd).toFixed(2)} via Squadron AI`;
    await navigator.clipboard.writeText(text).catch(() => {});
    toast({ title: "Copied to clipboard", description: "Share your trade result!" });
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { quality: 0.98, pixelRatio: 2 });
      const a = document.createElement("a");
      a.download = `squadron-${props.tokenSymbol}-${Date.now()}.png`;
      a.href = dataUrl;
      a.click();
    } catch {
      toast({ variant: "destructive", title: "Download failed" });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1 flex-wrap">
        {CARD_STYLES.map((s) => (
          <button
            key={s.value}
            className={`text-[8px] px-1.5 py-0.5 rounded border uppercase tracking-wider transition-colors ${selectedStyle === s.value ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"}`}
            onClick={() => setSelectedStyle(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div ref={cardRef} className="rounded overflow-hidden">
        <CardContent {...props} style={selectedStyle} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={handleShare}>
          <Share2 size={11} className="mr-1" /> Share
        </Button>
        <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={handleDownload}>
          <Download size={11} className="mr-1" /> Download
        </Button>
      </div>
    </div>
  );
}
