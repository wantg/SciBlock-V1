#!/usr/bin/env bash
# =============================================================================
# scripts/migrate.sh — Run all database migrations for SciBlock
# =============================================================================
# Usage:
#   pnpm migrate                        # run all pending migrations (preferred)
#   bash scripts/migrate.sh             # run all pending migrations
#   bash scripts/migrate.sh drizzle     # Drizzle only (Express tables)
#   bash scripts/migrate.sh goose       # goose only (Go backend tables)
#   bash scripts/migrate.sh goose down  # roll back the last goose migration
#   bash scripts/migrate.sh goose status # show goose migration status
#
# Prerequisites:
#   DATABASE_URL must be set in the environment.
#
# New environment setup:
#   1. pnpm migrate          — applies all migrations from scratch
#   2. bash scripts/seed-dev-user.sh — creates the dev/test instructor account
#
# Existing environment (first switch from push to migrate mode):
#   1. bash scripts/db-baseline.sh  — marks initial migration as applied (TRANSITION, once only)
#   2. pnpm migrate                 — picks up any new migrations going forward
#
# Migration ownership:
#   Drizzle → lib/db/migrations/        (users [incl. role], students, papers,
#                                         weekly_reports, report_comments, messages)
#   goose   → artifacts/go-api/internal/db/migrations/
#                                        (scinotes, experiment_records,
#                                         and 20260315001 which is a frozen
#                                         compatibility artifact for users.role —
#                                         Drizzle schema is now authoritative for
#                                         that column; goose migration is idempotent)
# =============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log()       { echo -e "${YELLOW}[migrate]${NC} $*"; }
log_ok()    { echo -e "${GREEN}[migrate]${NC} $*"; }
log_error() { echo -e "${RED}[migrate]${NC} $*" >&2; }

# ---------------------------------------------------------------------------
# Resolve DB URL — EXTERNAL_DATABASE_URL takes priority over DATABASE_URL
# ---------------------------------------------------------------------------
DB_URL="${EXTERNAL_DATABASE_URL:-${DATABASE_URL:-}}"

if [ -z "$DB_URL" ]; then
  log_error "Neither EXTERNAL_DATABASE_URL nor DATABASE_URL is set."
  log_error "Example: export EXTERNAL_DATABASE_URL=postgresql://user:pass@host:5432/db"
  exit 1
fi

# Log the active connection (host + database only — no password).
_CONN_SAFE=$(node -e "
try {
  const u = new URL(process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL || '');
  process.stdout.write(u.hostname + ':' + (u.port || '5432') + u.pathname);
} catch { process.stdout.write('(unparseable)'); }
" 2>/dev/null || echo "(unknown)")

log "DB source : ${EXTERNAL_DATABASE_URL:+EXTERNAL_DATABASE_URL}${EXTERNAL_DATABASE_URL:-DATABASE_URL}"
log "DB conn   : ${_CONN_SAFE}"

# ---------------------------------------------------------------------------
# Pre-migration data cleanup
# ---------------------------------------------------------------------------
# Runs idempotent DELETE statements that remove orphan records from
# Drizzle-managed tables before FK constraints are applied.
# The SQL file uses NOT IN guards — it matches 0 rows once the data is clean.
#
# This step lives in migrate.sh (not inside Drizzle's migration files) so that
# Drizzle's journal tracks only schema changes, with no manual journal editing.
run_cleanup() {
  local cleanup_sql="${ROOT_DIR}/scripts/sql/pre-fk-cleanup.sql"
  if [ -f "${cleanup_sql}" ]; then
    log "Running pre-migration data cleanup..."
    psql "${DB_URL}" -f "${cleanup_sql}" -q
    log_ok "Pre-migration data cleanup complete."
  fi
}

# ---------------------------------------------------------------------------
# Drizzle migration
# ---------------------------------------------------------------------------
run_drizzle() {
  run_cleanup

  log "Running Drizzle migrations (Express tables)..."

  # drizzle-kit migrate is non-interactive and idempotent.
  # It reads lib/db/migrations/, checks drizzle.__drizzle_migrations,
  # and applies only pending migrations.
  #
  # For existing environments that predate this migrate workflow, run
  # scripts/db-baseline.sh once before running migrate for the first time.
  # New (empty) environments: run this directly — no baseline step needed.
  pnpm --filter @workspace/db run migrate

  log_ok "Drizzle migration complete."
}

# ---------------------------------------------------------------------------
# goose migration
# ---------------------------------------------------------------------------
run_goose() {
  local subcommand="${1:-up}"
  local migrations_dir="${ROOT_DIR}/artifacts/go-api/internal/db/migrations"
  local goose_cmd

  if command -v goose &>/dev/null; then
    goose_cmd="goose"
  else
    # goose not on PATH — check the Go bin directory.
    local goose_bin
    goose_bin="$(go env GOPATH)/bin/goose"
    if [ -f "$goose_bin" ]; then
      goose_cmd="$goose_bin"
    else
      log "goose not found — installing..."
      go install github.com/pressly/goose/v3/cmd/goose@latest
      goose_cmd="$goose_bin"
    fi
  fi

  log "Running goose ${subcommand} (Go backend tables)..."
  "$goose_cmd" -dir "${migrations_dir}" postgres "${DB_URL}" "${subcommand}"
  log_ok "goose ${subcommand} complete."
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
MODE="${1:-all}"

case "$MODE" in
  drizzle)
    run_drizzle
    ;;
  goose)
    SUBCMD="${2:-up}"
    run_goose "$SUBCMD"
    ;;
  all)
    run_drizzle
    run_goose up
    log_ok "All migrations complete."
    ;;
  *)
    log_error "Unknown mode: ${MODE}. Use: all | drizzle | goose [up|down|status]"
    exit 1
    ;;
esac
