---
name: GitHub HTTPS push authentication
description: Workspace behavior when pushing to GitHub over an HTTPS origin.
---

HTTPS pushes can block on the workspace askpass helper when no usable GitHub credential or integration is available; the command may remain running without producing a Git error.

**Why:** A merge completed locally, but the push waited indefinitely for credentials and the remote branch never moved.

**How to apply:** Before relying on a push result, use a bounded command and verify the remote branch with `git ls-remote`; never report success from the local commit alone.