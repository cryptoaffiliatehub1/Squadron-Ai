---
name: Sizing and cluster security
description: Durable rules for entry allocation and final holder-concentration screening.
---

Approved entries must allocate exactly 20% of available cash in USD. Score, regime, tier, verification status, compounding targets, SOL price, rounding, caps, and fallback order sizes must not change that USD allocation; SOL price only converts the allocation into execution units.

**Why:** Fixed tier sizes and risk-based adjustments caused recent paper entries to use about 1% of available cash instead of the requested 20%.

**How to apply:** Keep eligibility checks separate from allocation. The final security gate uses RugCheck full-report holder data after cheaper checks, excludes known AMM/locker/pool accounts, and fails closed when non-LP concentration data is unavailable.