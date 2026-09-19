---
name: Paper ledger invariants
description: Non-obvious accounting and source-of-truth rules for Squadron AI simulation positions.
---

The persisted paper ledger is authoritative for simulation positions and moonbags. Repeated rows with the same ID are historical write duplicates, not separate positions. Active rows must have positive entry price, position size, and amount; invalid rows are retired with an explicit reason rather than counted.

**Why:** The imported runtime had hundreds of raw rows, repeated moonbag updates, phantom zero-value open positions, and a separate in-memory moonbag vault that disagreed with the persisted ledger. Counting raw rows made the position cap, balance, and UI diverge.

**How to apply:** Normalize/deduplicate before accounting or API responses, keep a small persisted moonbag cap, refresh active prices from DexScreener before current-position reads or exits, and block new entries when simulated cash is non-positive.

Simulation funding is an append-only injection ledger: preserve each injection as its own dated row, derive the aggregate total from those rows, and compute current cash as base capital plus all injections plus realized P&L.

**Why:** A second funding request must increase available cash without overwriting the original injection or making the balance breakdown ambiguous.

**How to apply:** Use a unique idempotency key for every funding batch and expose the individual rows to the Sim UI alongside the aggregate and formula.

Every moonbag path must preserve the original per-token entry price as its `entryPrice`; the golden-exit price is a later snapshot and must only be derived as `entryPrice * 2.5`.

**Why:** The paper lifecycle already stored the original price, but the legacy live vault path and duplicate portfolio UI treated the golden-exit snapshot as entry, producing incorrect multipliers and percentage returns.

**How to apply:** When creating or displaying a moonbag, calculate multiplier and return as `currentPrice / originalEntryPrice` and `(multiplier - 1) * 100`; keep the golden-exit snapshot separate.