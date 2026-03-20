#!/usr/bin/env bash
# =============================================================================
# TRANSITION: scripts/db-baseline.sh
# =============================================================================
# Purpose:
#   Mark the Drizzle initial migration as already applied on an existing
#   database that predates the Drizzle generate+migrate workflow.
#
#   This script is a one-time operation for environments that were created
#   before Drizzle migration files existed (i.e., where the database was
#   previously kept in sync via `drizzle-kit push`).
#
# When to run:
#   - On any existing environment when first switching to generate+migrate mode.
#   - EXACTLY ONCE per existing database.
#   - Do NOT run on a fresh (empty) database — let `pnpm migrate` handle that.
#
# Safety:
#   Idempotent. If the migration hash is already present in
#   drizzle.__drizzle_migrations, this script exits cleanly without any change.
#
# New environments:
#   Do NOT run this script. Run `pnpm migrate` (or `sh scripts/migrate.sh`)
#   directly — it applies the initial migration SQL from scratch.
#
# Usage:
#   sh scripts/db-baseline.sh
# =============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATION_FILE="${ROOT_DIR}/lib/db/migrations/0000_far_luke_cage.sql"
JOURNAL_FILE="${ROOT_DIR}/lib/db/migrations/meta/_journal.json"

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log()       { echo -e "${YELLOW}[baseline]${NC} $*"; }
log_ok()    { echo -e "${GREEN}[baseline]${NC} $*"; }
log_error() { echo -e "${RED}[baseline]${NC} $*" >&2; }

# ---------------------------------------------------------------------------
# Preconditions
# ---------------------------------------------------------------------------
# Resolve DB URL — EXTERNAL_DATABASE_URL takes priority over DATABASE_URL
DB_URL="${EXTERNAL_DATABASE_URL:-${DATABASE_URL:-}}"

if [ -z "$DB_URL" ]; then
  log_error "Neither EXTERNAL_DATABASE_URL nor DATABASE_URL is set."
  exit 1
fi

if [ ! -f "$MIGRATION_FILE" ]; then
  log_error "Initial migration file not found: $MIGRATION_FILE"
  log_error "Run 'pnpm --filter @workspace/db run generate' first."
  exit 1
fi

if [ ! -f "$JOURNAL_FILE" ]; then
  log_error "Drizzle journal not found: $JOURNAL_FILE"
  log_error "Run 'pnpm --filter @workspace/db run generate' first."
  exit 1
fi

# ---------------------------------------------------------------------------
# Compute hash and timestamp
# Hash: SHA-256 of the migration SQL file content (matches drizzle-kit's
#       own hashing — verified against a live drizzle.__drizzle_migrations row).
# created_at: 'when' timestamp from _journal.json (milliseconds since epoch).
# ---------------------------------------------------------------------------
HASH=$(sha256sum "$MIGRATION_FILE" | awk '{print $1}')
CREATED_AT=$(node -e "
const j = JSON.parse(require('fs').readFileSync('${JOURNAL_FILE}', 'utf8'));
process.stdout.write(String(j.entries[0].when));
")

log "Migration file : $(basename "$MIGRATION_FILE")"
log "Hash           : $HASH"
log "created_at     : $CREATED_AT"
log ""

# ---------------------------------------------------------------------------
# Apply baseline
# ---------------------------------------------------------------------------
psql "$DB_URL" <<SQL
-- Ensure the drizzle tracking schema and table exist.
CREATE SCHEMA IF NOT EXISTS drizzle;

CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id         SERIAL PRIMARY KEY,
  hash       TEXT    NOT NULL,
  created_at BIGINT
);

-- Insert the initial migration as already-applied, if not already present.
-- This tells drizzle-kit migrate to skip it without executing the SQL.
DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = '${HASH}'
  ) THEN
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES ('${HASH}', ${CREATED_AT});
    RAISE NOTICE 'Baseline: initial migration marked as applied.';
  ELSE
    RAISE NOTICE 'Baseline: initial migration already present — no change.';
  END IF;
END;
\$\$;
SQL

log_ok "Baseline complete."
log ""
log "The initial Drizzle migration is now marked as applied."
log "Run 'pnpm migrate' to apply any pending migrations going forward."
