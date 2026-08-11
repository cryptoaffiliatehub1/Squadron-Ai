import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Activity, BookOpen, Radio, Briefcase, Bell, Zap, FlaskConical } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useTradingMode } from "@/contexts/trading-mode";
import { useNetwork } from "@/contexts/network";
import { useBot } from "@/contexts/bot";
import { useToast } from "@/hooks/use-toast";

const NAV_ITEMS = [
  { href: "/",           label: "Command",   icon: Activity },
  { href: "/tokens",     label: "Radar",     icon: Radio },
  { href: "/simulation", label: "Sim",       icon: BookOpen },
  { href: "/portfolio",  label: "Portfolio", icon: Briefcase },
  { href: "/alerts",     label: "Alerts",    icon: Bell },
];

interface LayoutProps {
  children: React.ReactNode;
}

function LiveModeConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-losses/60 rounded-xl p-5 max-w-sm w-full shadow-[0_0_48px_rgba(255,59,92,0.2)]">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-losses" />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-losses">Switch to Live Trading?</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
          You are enabling <span className="text-gains font-bold">LIVE TRADING</span> mode.
          Real SOL will be spent on every trade. Jito bundles will be signed and submitted to Solana mainnet.
        </p>
        <p className="text-[10px] text-yellow-400/80 font-mono leading-relaxed mb-4">
          ⚠ Ensure your wallet is funded and you accept full risk.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] h-8 uppercase tracking-wider"
            onClick={onCancel}
          >
            Stay in Sim
          </Button>
          <Button
            size="sm"
            className="text-[10px] h-8 bg-gains hover:bg-gains/90 text-black font-bold uppercase tracking-wider"
            onClick={onConfirm}
          >
            <Zap size={9} className="mr-1" /> Go Live
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { isPaper, isLive, setMode, isSwitching } = useTradingMode();
  const { isRunning, scannerOnline, toggleBot, isPending: botPending } = useBot();
  const { isMainnet } = useNetwork();
  const { toast } = useToast();
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);

  const { data: wallet } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: () => fetch("/api/wallet/balance").then(r => r.json()),
    refetchInterval: 30000,
  });
  const { data: circuit } = useQuery({
    queryKey: ["circuit"],
    queryFn: () => fetch("/api/circuit").then(r => r.json()),
    refetchInterval: 10000,
  });

  const solBalance = (wallet as any)?.solBalance ?? null;
  const circuitState = (circuit as any)?.state ?? "NORMAL";
  const botLocked = circuitState !== "NORMAL" && circuitState !== "LOW_BALANCE_PAUSE";
  const liveLocked = solBalance !== null && solBalance > 0 && solBalance < 0.01;

  function handleModeChip() {
    if (isPaper) {
      if (liveLocked) {
        toast({
          variant: "destructive",
          title: "Balance too low",
          description: `${solBalance?.toFixed(4)} SOL — need ≥ 0.01 SOL to go live`,
        });
        return;
      }
      setShowLiveConfirm(true);
    } else {
      setMode("paper").then(() =>
        toast({ title: "Switched to Simulation", description: "No real trades will execute" })
      );
    }
  }

  function confirmLive() {
    setShowLiveConfirm(false);
    setMode("live").then(() =>
      toast({ title: "⚡ LIVE TRADING ACTIVE", description: "Real SOL execution enabled" })
    );
  }

  return (
    <>
      {showLiveConfirm && (
        <LiveModeConfirmModal onConfirm={confirmLive} onCancel={() => setShowLiveConfirm(false)} />
      )}

      <div className="min-h-screen bg-background text-foreground flex flex-col font-mono">
        <div className="terminal-scanline pointer-events-none" />

        {/* ── HEADER 56px ── */}
        <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-card/95 backdrop-blur-md border-b border-border">
          <div className="h-full flex items-center justify-between px-3 max-w-lg mx-auto gap-2">

            {/* Brand */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                <span className="text-primary text-[9px] font-black tracking-tight">SQ</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-bold text-primary tracking-[0.18em] uppercase">SQUADRON</span>
                <span className="text-[7px] text-muted-foreground/40 uppercase tracking-widest">Solana Sniper</span>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1.5 ml-auto shrink-0">

              {/* Network badge */}
              <span className={`hidden sm:inline-flex text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                isMainnet
                  ? "text-red-400 border-red-500/30 bg-red-500/10"
                  : "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"
              }`}>
                {isMainnet ? "MAINNET" : "DEVNET"}
              </span>

              {/* BOT chip */}
              <button
                onClick={() => !botLocked && toggleBot(!isRunning)}
                disabled={botPending || botLocked}
                title={botLocked ? `Locked: ${circuitState}` : (isRunning ? "Stop scanner" : "Start scanner")}
                className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all select-none
                  ${(isRunning || scannerOnline)
                    ? "bg-gains/10 border-gains/40 text-gains hover:bg-gains/20"
                    : "bg-muted/30 border-border text-muted-foreground hover:border-primary/30 hover:text-primary"
                  }
                  ${botLocked ? "opacity-40 cursor-not-allowed" : "cursor-pointer active:scale-95"}`}
              >
                {/* Fix 8: green when scanner is online OR trading bot is running */}
                <span className={`w-1.5 h-1.5 rounded-full ${(isRunning || scannerOnline) ? "bg-gains pulse-indicator" : "bg-muted-foreground/50"}`} />
                BOT
              </button>

              {/* MODE chip */}
              <button
                onClick={handleModeChip}
                disabled={isSwitching}
                title={liveLocked && isPaper ? "Need ≥ 0.01 SOL to switch to LIVE" : (isPaper ? "Switch to LIVE" : "Switch to SIM")}
                className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all select-none cursor-pointer active:scale-95
                  ${isPaper
                    ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/20"
                    : "bg-gains/10 border-gains/40 text-gains hover:bg-gains/20"
                  }
                  ${isLive ? "animate-pulse" : ""}
                  ${liveLocked && isPaper ? "opacity-60" : ""}`}
              >
                {isPaper ? <FlaskConical size={9} /> : <Zap size={9} />}
                {isPaper ? "SIM" : "LIVE"}
              </button>
            </div>
          </div>
        </header>

        {/* ── STATUS BANNER 32px ── */}
        <div className={`fixed top-14 left-0 right-0 z-40 h-8 flex items-center justify-center gap-2 border-b ${
          isPaper
            ? "bg-yellow-500/5 border-yellow-500/20"
            : "bg-gains/5 border-gains/25"
        }`}>
          {isPaper ? (
            <>
              <FlaskConical size={8} className="text-yellow-400/80" />
              <span className="text-[7.5px] text-yellow-400/80 font-bold uppercase tracking-[0.3em]">
                SIMULATION — PAPER TRADES ONLY
              </span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-gains pulse-indicator shrink-0" />
              <span className="text-[7.5px] text-gains font-bold uppercase tracking-[0.3em]">
                LIVE TRADING — REAL SOL EXECUTION
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-gains pulse-indicator shrink-0" />
            </>
          )}
        </div>

        {/* ── CONTENT ── */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto" style={{ paddingTop: "88px", paddingBottom: "68px" }}>
          {children}
        </main>

        {/* ── BOTTOM NAV 60px ── */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 h-[60px] bg-card/95 backdrop-blur-md border-t border-border">
          <div className="h-full flex items-stretch max-w-lg mx-auto">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = location === href;
              return (
                <Link key={href} href={href} className="flex-1">
                  <div className={`flex flex-col items-center justify-center gap-0.5 h-full pt-1 pb-1.5 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"
                  }`}>
                    <div className="relative">
                      <Icon
                        size={17}
                        strokeWidth={isActive ? 2.5 : 1.5}
                        className={isActive ? "drop-shadow-[0_0_8px_rgba(0,255,163,0.8)]" : ""}
                      />
                    </div>
                    <span className={`text-[7.5px] uppercase tracking-wider ${isActive ? "font-bold" : ""}`}>
                      {label}
                    </span>
                    {isActive && (
                      <span className="absolute bottom-0 h-px w-8 bg-primary rounded-full shadow-[0_0_6px_rgba(0,255,163,0.9)]" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
