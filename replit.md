# Squadron AI

Automated Solana meme coin trading bot web app — scans DEX Screener for trending tokens, applies multi-layer safety filters (RugCheck + risk rules), optionally uses an AI analyst, and executes swaps via Jupiter aggregator with Jito MEV bundles.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port from env)
- `pnpm --filter @workspace/squadron-ai run dev` — run the React frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Pino logging
- DB: PostgreSQL + Drizzle ORM (4 tables: trades, skipped_tokens, detected_tokens, price_alerts)
- Frontend: React + Vite + Tailwind + TanStack Query + Wouter routing
- Solana: @solana/web3.js, Jupiter aggregator, Jito MEV
- Safety: RugCheck API + custom risk filters
- AI: OpenAI/OpenRouter for token sentiment analysis

## Where things live

- `artifacts/api-server/src/lib/` — core bot logic (bot.ts, dexScreener.ts, jupiter.ts, solana.ts, rugcheck.ts, riskFilter.ts, aiAnalyst.ts, alertChecker.ts, jito.ts, priorityFee.ts, cache.ts)
- `artifacts/api-server/src/routes/` — Express routes (bot, trades, wallet, tokens, alerts, config, health)
- `artifacts/squadron-ai/src/pages/` — all frontend pages (dashboard, trades, tokens, portfolio, alerts, history, skipped)
- `artifacts/squadron-ai/src/components/layout.tsx` — mobile bottom nav + top HUD with network toggle
- `artifacts/squadron-ai/src/contexts/network.tsx` — devnet/mainnet context
- `lib/db/src/schema/` — Drizzle schema files (trades.ts, tokens.ts, alerts.ts)

## Architecture decisions

- 20% capital rule: bot never risks more than 20% of wallet balance per trade
- Squad Mode: $200 cap per slot, 3 slots max, excess capital rotates to next detected token
- Moonbag Recycler: after each profitable sell, 50% of profits is set aside as a moonbag
- Dry-run mode: if no PRIVATE_KEY env var is set, bot scans but does not execute trades
- Devnet/Mainnet toggle in the UI header — mainnet shows a red danger ring around the whole interface

## Product

- **Command Center (Dashboard)**: bot on/off toggle, wallet balance, P&L summary, squad mode, moonbag tracker
- **Scanner**: live list of detected tokens with safety status and buy/sell pressure
- **Trade Journal (History)**: full execution log combining trades and rejected tokens
- **Portfolio**: current token holdings
- **Alerts**: price trigger alerts with real-time price polling
- **Rejected Tokens (Skipped)**: tokens blocked by safety filters with reasons

## User preferences

- Mobile-first dark terminal aesthetic (JetBrains Mono, neon cyan primary)
- Gains = neon green (#00FFAA), Losses = red
- All text labels uppercase with wide letter-spacing

## Required environment secrets

- `DATABASE_URL` — already provisioned
- `PRIVATE_KEY` — Solana wallet private key (base58) for live trading
- `HELIUS_KEY` — Helius RPC API key for Solana node access
- `OPENROUTER_API_KEY` or `OPENAI_API_KEY` — for AI analyst feature (optional)
- `SOLANA_RPC_URL` — custom RPC URL (optional, falls back to public endpoints)

## Gotchas

- Without PRIVATE_KEY, the bot runs in dry-run mode (scans but doesn't trade)
- DB push requires dropping old tables first if schema changed significantly
- The shared proxy routes `/api/*` to the API server and `/` to the frontend
- Always run `pnpm --filter @workspace/db run push` after DB schema changes

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
