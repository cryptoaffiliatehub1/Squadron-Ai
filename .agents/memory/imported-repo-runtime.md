---
name: Imported repository runtime
description: Setup constraints discovered while bringing the Squadron AI repository into this workspace.
---

The repository's frontend and API must be treated as a paired runtime: the dashboard calls the API's `/api/*` trading routes, and the development database schema must be applied before restarting the API so background scanners and alert checks do not emit missing-table errors.

**Why:** Importing source into a pre-scaffolded workspace can leave the API running an older build or an empty development schema even when the frontend itself renders correctly.

**How to apply:** When resuming work, keep the root Squadron AI web artifact and API workflow paired, restart the API after backend/source changes, and run the development schema push after importing or changing database tables.