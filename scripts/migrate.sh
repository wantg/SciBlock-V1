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
# Check DATABASE_URL
# ---------------------------------------------------------------------------
if [ -z "${DATABASE_URL:-}" ]; then
  log_error "DATABASE_URL is not set. Export it before running this script."
  log_error "Example: export DATABASE_URL=postgresql://user:pass@localhost:5432/sciblock"
  exit 1
fi

log "DATABASE_URL is set."

# ---------------------------------------------------------------------------
# Drizzle migration
# ---------------------------------------------------------------------------
run_drizzle() {
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
  "$goose_cmd" -dir "${migrations_dir}" postgres "${DATABASE_URL}" "${subcommand}"
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
