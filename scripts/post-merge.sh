#!/bin/bash
set -e
pnpm install --frozen-lockfile

# Dev schema currency is guaranteed by the API server's idempotent ensureSchema()
# on boot — the SAME mechanism production (Hostinger MySQL, no auto-migrate) uses.
# Workflow reconciliation restarts the API server right after this script, so any
# additive schema changes are applied then.
#
# drizzle-kit push is therefore best-effort here: in this environment it can exit
# non-zero while introspecting MariaDB (silent failure during "Pulling schema"),
# and that flakiness must NOT block a merge. If it succeeds it gives a fuller diff;
# if it fails, ensureSchema() on boot still keeps the dev DB current.
pnpm --filter @workspace/db run push-force \
  || echo "post-merge: drizzle-kit push skipped (schema is ensured on API server boot)"
