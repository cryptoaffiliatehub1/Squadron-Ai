# Squadron AI

Production-ready Solana meme coin trading engine with triple-radar scanning, 95% risk gate, market regime classification, dynamic position sizing, golden exit + moonbag vault, circuit breakers, self-improving feedback loop, self-healing watchdog, paper trading mode, and automated daily/weekly/monthly reports.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/squadron-ai run dev` — run the React frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Pino logging
- DB: PostgreSQL + Drizzle ORM (trades, skipped_tokens, detected_tokens, price_alerts)
- Frontend: React + Vite + Tailwind + TanStack Query + Wouter routing
- Solana: @solana/web3.js, Jupiter aggregator, Jito MEV bundles
- Safety: RugCheck + Birdeye + Bitquery + custom risk filters (95% gate)
- AI: OpenRouter for token sentiment analysis + weekly trade recommendation
- Reports: Nodemailer (email) + Twilio (WhatsApp) via node-cron

## Where things live

### Backend (`artifacts/api-server/src/lib/`)

| File | Purpose |
|------|---------|
| `bot.ts` | Main orchestrator — starts all subsystems, handles token discovery flow |
| `scanner.ts` | Triple-radar: DEX Screener (8s poll) → Pump.fun WS → Birdeye API |
| `headerFactory.ts` | 5-UA rotation + random Referer to avoid scanner rate limits |
| `riskGate.ts` | 95% gate: liquidity, RugCheck, Birdeye security, Bitquery supply, wash-trade, LP burn |
| `marketRegime.ts` | MANIA / CHOP / RUG_CYCLE / DEATH_ZONE classifier (adapts multipliers) |
| `positionSizer.ts` | Dynamic sizing: score × regime × 20% cap, 3-slot max, compounding |
| `executionEngine.ts` | Jupiter quote → Jito bundle, golden exit at 2.5×, paper trade mode |
| `moonbagVault.ts` | Stores 50% post-golden-exit tokens; emergency exit on 35% liq drop |
| `circuitBreaker.ts` | Fortress lock (10% daily loss), observation mode, global floor (50%), conservative mode |
| `feedbackLoop.ts` | 12h post-mortem: rug rate → weight drift, negative expectancy → SYSTEM AT RISK |
| `watchdog.ts` | 5s scanner heartbeat monitor — auto-restarts on crash |
| `walletWatcher.ts` | 10s balance poll, auto-starts bot on fund detection |
| `reporting.ts` | Nodemailer + Twilio cron: daily 23:00, weekly Sunday 23:30, monthly 1st 08:00 UTC |
| `paperTrading.ts` | Paper trades logged to `data/paper_trades.json`, daily report to `data/daily_report.json` |
| `systemReadiness.ts` | Cold-start key audit — logs every secret present/missing on startup |

### Routes (`artifacts/api-server/src/routes/`)
- `bot.ts` — `/bot/status`, `/bot/toggle`, `/system/status`, `/system/readiness`, `/system/kill-switch`, `/system/reset-fortress`, `/moonbags`, `/regime`, `/circuit`, `/scanner/status`, `/watchdog/status`, `/weights`
- `paper.ts` — `/paper/trades`, `/paper/report`, `/paper/generate-report`
- `trades.ts`, `wallet.ts`, `tokens.ts`, `alerts.ts`, `config.ts`, `health.ts`

### Frontend (`artifacts/squadron-ai/src/`)
- `pages/dashboard.tsx` — Full command center: top HUD, drawdown bar, live radar, moonbag vault, weight drift table, failover log, last 10 trades, system readiness grid
- `pages/simulation.tsx` — Paper trading report + full simulated trade log
- `pages/portfolio.tsx`, `alerts.tsx`, `tokens.tsx`, `history.tsx`, `skipped.tsx`
- `components/profit-share-card.tsx` — 5 card styles (Tactical Grid default): Vortex Minimalist, Neon Border, Glassmorphism, Full Logo Header; download as PNG

## Architecture decisions

- **Paper Trading is DEFAULT**: set `PAPER_TRADE=false` to go live
- **20% capital rule**: bot never risks more than 20% of wallet balance per trade
- **Moonbag Recycler**: at 2.5× gain, sell 50% (cost basis = $0), hold 50% in vault
- **Global Floor**: if balance drops below 50% of starting balance, FULL STOP — manual reset required
- **Wallet Auto-Start**: bot activates the moment >0.00005 SOL is detected
- **Dynamic Jito Tip**: 0.005 SOL floor for tokens <10 min old; adaptive formula (mean + 15% + jitter) for older tokens
- **Rebate address**: `3hR4Yzj9Swno23rMja4Z8f13ButU39sh9NsMvHM9Gmwi` in all Jito calls
- **Conservative Mode**: activates after 5% daily gain — drops max entry to 5%
- **Failover scanner**: DEX Screener (primary, 8s) → Pump.fun WS → Birdeye API; probes DEX every 30m; resets at 23:59 UTC

## Data files (auto-created)

- `data/paper_trades.json` — every simulated trade
- `data/daily_report.json` — current day's summary
- `data/weights_history.json` — scoring weight drift log
- `data/failed_reports/` — backup copies of reports that failed to send

## User preferences

- Mobile-first dark terminal aesthetic (JetBrains Mono, neon cyan primary)
- Gains = neon green (#00FFAA), Losses = red (#FF006B)
- All labels uppercase with wide letter-spacing

## Required environment secrets

| Variable | Purpose | Status |
|----------|---------|--------|
| `DATABASE_URL` | PostgreSQL connection | ✓ Provisioned |
| `SOLANA_PRIVATE_KEY` | Wallet for live trading | ✓ Set |
| `HELIUS_API_KEY` | Helius RPC node | ✓ Set |
| `JUPITER_API_KEY` | Jupiter swap routing | ✓ Set |
| `BIRDEYE_API_KEY` | Market data + token security | ✓ Set |
| `RUGCHECK_API_KEY` | Token safety scores | ✓ Set |
| `OPENROUTER_API_KEY` | AI token analyst + weekly rec | ✓ Set |
| `TWILIO_ACCOUNT_SID` | WhatsApp reports | ✓ Set |
| `TWILIO_AUTH_TOKEN` | WhatsApp reports | ✓ Set |
| `TWILIO_WHATSAPP_NUMBER` | Twilio sender number | ✓ Set |
| `SMTP_USER` | Email sender (Gmail) | ⚠ Needed for email reports |
| `SMTP_PASS` | Gmail app password | ⚠ Needed for email reports |
| `REPORT_EMAIL` | Report destination email | Falls back to solex674@gmail.com |
| `WHATSAPP_NUMBER_1` | Report WhatsApp #1 | Falls back to +2349078886030 |
| `WHATSAPP_NUMBER_2` | Report WhatsApp #2 | Falls back to +2347026125080 |
| `BITQUERY_API_KEY` | Supply audit (optional) | Blueprint active |
| `PAPER_TRADE` | `true` = simulation, `false` = live | Default: `true` |

## Going live checklist

1. Add `SMTP_USER` and `SMTP_PASS` secrets (Gmail App Password) for email reports
2. Set `PAPER_TRADE=false` in secrets when satisfied with simulation results
3. Ensure wallet has at least 0.01 SOL for Jito tips and transaction fees
4. Optionally add `BITQUERY_API_KEY` for supply audit layer

## Pointers

- See the `pnpm-workspace` skill for workspace structure and TypeScript setup
- DEX Screener scanner logs `[SCANNING]`, passed tokens log `[AUDIT_PASS]`, swaps log `[JUPITER_QUOTE]` and `[JITO_SENT]`
