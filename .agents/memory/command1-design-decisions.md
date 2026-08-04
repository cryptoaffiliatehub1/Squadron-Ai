---
name: Command 1 — Security gate & critical fixes
description: Design decisions and non-obvious constraints from the 21-item COMMAND 1 overhaul implemented 2026-08-01
---

## Bonding curve bypass (source: "BONDING")
- `DexToken.source?: "DEX" | "BONDING"` — pumped by Pump.fun WebSocket
- BONDING tokens skip: null-liquidity pre-filter, activity gate (minBuys), tier liquidity check in bot.ts, AND liquidity floor / volume / high-sells checks in riskGate.ts
- They still run: RugCheck, Birdeye security, wash trade, dead token, sell pressure at entry, all Helius checks
- **Why:** Bonding curve tokens have no DEX pair so liquidity is 0 by definition; blocking them on liquidity kills all pump.fun discovery.

## Two-tier buy threshold
- `tierMinBuys = mcapNum >= 500_000 ? 3 : 5` — applied before relaxed mode override
- Relaxed mode caps at 3 regardless, so effectively: `minBuys = relaxed ? Math.min(tierMinBuys, 3) : tierMinBuys`
- **Why:** Higher mcap tokens attract heavier traffic — 5 buys in 5m is an unrealistic bar above $500k.

## Helius checks — all non-blocking
- Sniper accumulation, wallet seeding, wallet age: each wrapped in `Promise.race(check, 8s timeout)` → neutral fallback on failure/timeout
- **Why:** A failing Helius call must never block a valid trade; neutral scores (0 adjustment) preserve gate correctness.

## Context-aware moonbag protection — Tier 3 requires ALL 5 conditions simultaneously
1. Price -30%+ from moonbag creation price
2. sells > buys * 3 (overwhelming sell pressure)
3. current liquidity < prev liquidity * 0.9 (shrinking)
4. current buyers < prev buyers * 0.5 (collapsing)
5. 3 consecutive lower lows in 5-min price history
- **Why:** Any single condition (e.g. momentary low buyers) would fire too many false exits; requiring ALL 5 simultaneously ensures only genuine death spirals trigger the emergency exit.

## Secondary watchdog (bot.ts, 120s interval)
- Checks `getScannerState().lastSuccessfulScan` — if >120s stale, calls `restartScanner()` and logs "AUTO-RESTART"
- Lives in `initializeOrchestrator` — runs whether or not the bot is toggled on
- **Why:** The scanner runs 24/7 for radar display even when trading is off; it must self-heal independently of the trading watchdog.

## REPORT_EMAIL fallback
- Changed from hardcoded `"solex674@gmail.com"` to `process.env["SMTP_USER"] ?? ""`
- **Why:** Reports should go to the mailbox that is actually configured, not a hardcoded address.

## Volume consistency — uses available DEX data
- Derives 6 synthetic hourly volumes from `volume5m/1h/6h/24h` rather than calling a separate OHLCV API
- Spike-then-silence: `h1 > restAvg * 5 && restAvg < mean * 0.3` → -15pts "SPIKE THEN SILENCE"
- CV < 0.5 → +15pts "CONSISTENT VOLUME"

## Holder growth — uses Helius transaction count as proxy
- Calls Helius enhanced API for token transactions (limit 100, type=SWAP)
- Groups into 2-hour windows over 12h; >60% in any single window → -25pts "ARTIFICIAL HOLDER BURST"
- Steady growth (4+ of 6 windows non-decreasing) → +15pts "ORGANIC GROWTH"
