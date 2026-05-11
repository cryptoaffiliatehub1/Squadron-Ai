import { Link, useLocation } from "wouter";
import { Activity, BookOpen, Radio, Briefcase, Bell } from "lucide-react";
import { useNetwork } from "@/contexts/network";
import { Switch } from "@/components/ui/switch";

function TopHUD() {
  const { network, setNetwork, isMainnet } = useNetwork();

  return (
    <>
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-3 h-11 max-w-md mx-auto gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-primary tracking-[0.2em] uppercase">
              SQUADRON AI
            </span>
          </div>

          <div className="flex items-center gap-3 flex-1 justify-center text-[10px] font-mono">
            <span className="text-muted-foreground/40">Tactical Meme Sniper</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                isMainnet
                  ? "text-destructive border-destructive/50 bg-destructive/10"
                  : "text-yellow-400 border-yellow-400/50 bg-yellow-400/10"
              }`}
            >
              {isMainnet ? "MAIN" : "DEV"}
            </span>
            <Switch
              checked={isMainnet}
              onCheckedChange={(v) => setNetwork(v ? "mainnet" : "devnet")}
              className="data-[state=checked]:bg-destructive data-[state=unchecked]:bg-yellow-400/40 h-4 w-7"
            />
          </div>
        </div>

        {isMainnet && (
          <div className="flex items-center justify-center gap-1.5 bg-destructive/10 border-t border-destructive/30 h-5">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse inline-block" />
            <span className="text-[9px] text-destructive font-bold uppercase tracking-[0.3em]">
              MAINNET — LIVE TRADING ACTIVE
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse inline-block" />
          </div>
        )}
      </header>
    </>
  );
}

interface LayoutProps {
  children: React.ReactNode;
  modeRingClass?: string;
}

export function Layout({ children, modeRingClass }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Command", icon: Activity },
    { href: "/tokens", label: "Radar", icon: Radio },
    { href: "/simulation", label: "Sim", icon: BookOpen },
    { href: "/portfolio", label: "Portfolio", icon: Briefcase },
    { href: "/alerts", label: "Alerts", icon: Bell },
  ];

  const ringClass = modeRingClass ?? "ring-[2px] ring-inset ring-yellow-400/50";

  return (
    <div className={`min-h-screen bg-background text-foreground flex flex-col font-mono pb-16 ${ringClass}`}>
      <div className="terminal-scanline pointer-events-none" />
      <TopHUD />
      <main className="flex-1 overflow-x-hidden overflow-y-auto">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/90 backdrop-blur-md z-50">
        <div className="flex justify-around items-center h-14 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex flex-col items-center justify-center w-full h-full space-y-0.5 cursor-pointer transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon size={18} className={isActive ? "drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]" : ""} />
                  <span className="text-[9px] font-bold tracking-wider">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
