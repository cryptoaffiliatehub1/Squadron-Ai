import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity, BookOpen, Radio, Briefcase, Bell,
  Menu, X, LayoutDashboard,
} from "lucide-react";
import { useNetwork } from "@/contexts/network";
import { Switch } from "@/components/ui/switch";

const NAV_ITEMS = [
  { href: "/",           label: "Command",   icon: Activity },
  { href: "/tokens",     label: "Radar",     icon: Radio },
  { href: "/simulation", label: "Sim",       icon: BookOpen },
  { href: "/portfolio",  label: "Portfolio", icon: Briefcase },
  { href: "/alerts",     label: "Alerts",    icon: Bell },
];

interface LayoutProps {
  children: React.ReactNode;
  modeRingClass?: string;
}

export function Layout({ children, modeRingClass }: LayoutProps) {
  const [location] = useLocation();
  const { network, setNetwork, isMainnet } = useNetwork();
  const [menuOpen, setMenuOpen] = useState(false);

  // Force-close menu whenever the route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((prev) => !prev), []);

  const ringClass = modeRingClass ?? "ring-[2px] ring-inset ring-yellow-400/50";

  return (
    <div className={`min-h-screen bg-background text-foreground flex flex-col font-mono ${ringClass}`}>
      <div className="terminal-scanline pointer-events-none" />

      {/* ── TOP HEADER ── */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-3 h-11 max-w-md mx-auto gap-2">

          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <LayoutDashboard size={13} className="text-primary" />
            <span className="text-xs font-bold text-primary tracking-[0.2em] uppercase">
              SQUADRON AI
            </span>
          </div>

          {/* Centre subtitle */}
          <div className="flex-1 text-center text-[9px] text-muted-foreground/40 font-mono tracking-widest hidden sm:block">
            Tactical Meme Sniper
          </div>

          {/* Right — network toggle + hamburger */}
          <div className="flex items-center gap-2 shrink-0">
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

            {/* Golden hamburger / close icon — always master control */}
            <button
              onClick={toggleMenu}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="w-8 h-8 flex items-center justify-center rounded border border-yellow-400/60 bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 active:scale-95 transition-all shrink-0"
            >
              {menuOpen
                ? <X size={15} strokeWidth={2.5} />
                : <Menu size={15} strokeWidth={2.5} />
              }
            </button>
          </div>
        </div>

        {/* Mainnet warning strip */}
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

      {/* ── DROPDOWN NAV MENU (fixed, never pushes content) ── */}
      {menuOpen && (
        <>
          {/* Backdrop — tap anywhere outside to close */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
            onClick={closeMenu}
            aria-hidden="true"
          />

          {/* Menu panel — right-aligned under header */}
          <div
            className="fixed top-11 right-0 z-50 w-48 bg-card border border-yellow-400/30 border-t-0 rounded-bl-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden"
            style={{ display: "block" }}
          >
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = location === href;
              return (
                <Link key={href} href={href}>
                  <div
                    onClick={closeMenu}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-border/30 last:border-b-0 transition-colors ${
                      isActive
                        ? "bg-yellow-400/10 text-yellow-400"
                        : "text-muted-foreground hover:bg-card/80 hover:text-foreground"
                    }`}
                  >
                    <Icon
                      size={14}
                      className={isActive ? "drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" : ""}
                    />
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em]">
                      {label}
                    </span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* ── PAGE CONTENT ── */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
