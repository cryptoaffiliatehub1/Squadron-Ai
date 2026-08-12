---
name: Alerts Page — System Events Architecture
description: How the Alerts page assembles a system event feed without a dedicated backend endpoint.
---

## The rule
The Events tab in `alerts.tsx` assembles a unified timeline client-side from existing APIs:
- `GET /api/history?limit=20` → TRADE_EXECUTED events (exits only, using `exitedAt`)
- `GET /api/tokens/skipped?limit=10` → RUG_AVOIDED events
- `GET /api/circuit` → CIRCUIT_BREAKER event if state !== NORMAL
- `GET /api/wallet/balance` → LOW_BALANCE event if solBalance > 0 && < 0.01
- `GET /api/system/status` → REGIME_CHANGE event if regime !== CHOP

Events are merged into one array and sorted by timestamp descending.

**Why:** Avoids a new backend endpoint; all the raw data already exists across APIs.

**How to apply:** If a new event type is needed, add a new query + event construction to the `useSystemEvents()` hook in alerts.tsx.
