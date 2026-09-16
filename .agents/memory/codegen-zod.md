---
name: Codegen zod version issue
description: Orval v8.23 generates z.int() which is zod v4 syntax, but the workspace zod package resolves to v3 on the plain "zod" import path.
---

## The rule
Never re-run `pnpm --filter @workspace/api-spec run codegen` without first pinning Orval to v8.5.3 (the version that generated the working files). If codegen is needed, restore the pre-generated files from the repo snapshot afterwards.

**Why:** The workspace catalog pins `zod` at ~3.x. Orval v8.23+ generates `z.int()` (Zod v4 API) with `import * as zod from "zod"`. That import resolves to Zod v3, which has no `.int()` method, causing typecheck to blow up with TS2339 errors on every integer field in the spec.

**How to apply:** If the OpenAPI spec changes and codegen must be re-run, either:
1. Pin orval in `lib/api-spec/package.json` to `8.5.3` and re-run, OR
2. After running codegen, do a global replace of `zod.int()` → `zod.number().int()` in `lib/api-zod/src/generated/api.ts`.
