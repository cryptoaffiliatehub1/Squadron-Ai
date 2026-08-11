---
name: UI Header Toggles Architecture
description: How the BOT/MODE chips in the header work and sync with dashboard panels.
---

## The rule
- `BotContext` (`contexts/bot.tsx`) owns all bot toggle state — `Layout` and `Dashboard` both consume `useBot()`. Never duplicate the bot mutation.
- `MODE chip` in `Layout` shows the confirmation modal for going live. Modal is rendered inside Layout so it works from any page.
- `NetworkContext` (`contexts/network.tsx`) polls `bot-status` API for the `network` field. `setNetwork` is a no-op (no frontend toggle).
- Balance lock: `liveLocked = solBalance > 0 && solBalance < 0.01` — when true, clicking MODE chip shows a toast instead of the confirm modal.

**Why:** The header needs to control bot and mode from every page, not just dashboard. Lifting state into contexts + Layout eliminates desync.

**How to apply:** Any new page needing bot state should call `useBot()` from `contexts/bot.tsx`, not add a new `/api/bot/status` query.
