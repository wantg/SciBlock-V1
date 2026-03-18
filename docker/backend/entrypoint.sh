#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[backend-init] %s\n' "$*"
}

fail() {
  log "ERROR: $*"
  exit 1
}

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    fail "required env ${name} is not set"
  fi
}

rewrite_localhost_db_url() {
  local input="$1"
  echo "$input" | sed -E 's#@localhost([:/])#@host.docker.internal\1#g; s#@127\.0\.0\.1([:/])#@host.docker.internal\1#g'
}

wait_for_db() {
  local tries="${DB_WAIT_TRIES:-45}"
  local delay="${DB_WAIT_DELAY_SECONDS:-2}"

  for i in $(seq 1 "$tries"); do
    if psql "${DATABASE_URL}" -c 'select 1;' >/dev/null 2>&1; then
      log "Database is reachable"
      return 0
    fi
    log "Waiting for database (${i}/${tries})..."
    sleep "$delay"
  done

  fail "database is not reachable after ${tries} attempts"
}

run_bootstrap_sql() {
  if [ "${RUN_BOOTSTRAP_SQL:-true}" != "true" ]; then
    log "Skipping bootstrap SQL (RUN_BOOTSTRAP_SQL=false)"
    return 0
  fi

  log "Applying idempotent bootstrap SQL"
  psql "${DATABASE_URL}" -f /app/docker/backend/init-drizzle.sql -q
}

run_migrations() {
  if [ "${RUN_MIGRATIONS:-true}" != "true" ]; then
    log "Skipping migrations (RUN_MIGRATIONS=false)"
    return 0
  fi

  log "Running Drizzle migrations"
  pnpm --filter @workspace/db run migrate
}

run_seed_if_enabled() {
  if [ "${RUN_SEED:-false}" != "true" ]; then
    log "Skipping seed (RUN_SEED=false)"
    return 0
  fi

  log "Seeding development data"
  bash /app/scripts/seed-dev.sh
}

start_go_api() {
  local go_port="$1"
  local auto_migrate="${AUTO_MIGRATE:-false}"

  log "Starting Go API on :${go_port} (AUTO_MIGRATE=${auto_migrate})"
  PORT="${go_port}" AUTO_MIGRATE="${auto_migrate}" /app/artifacts/go-api/bin/server &
  GO_PID=$!
}

cleanup() {
  if [ -n "${GO_PID:-}" ] && kill -0 "${GO_PID}" >/dev/null 2>&1; then
    kill "${GO_PID}" >/dev/null 2>&1 || true
    wait "${GO_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

require_env DATABASE_URL
require_env JWT_SECRET
require_env ADMIN_SECRET

if [ "${DB_REWRITE_LOCALHOST:-true}" = "true" ]; then
  export DATABASE_URL="$(rewrite_localhost_db_url "${DATABASE_URL}")"
  log "DATABASE_URL host rewrite enabled (localhost -> host.docker.internal)"
else
  log "DATABASE_URL host rewrite disabled"
fi

BACKEND_PORT="${BACKEND_PORT:-8080}"
GO_PORT="${GO_PORT:-8082}"
GO_API_URL="${GO_API_URL:-http://127.0.0.1:${GO_PORT}}"

export NODE_ENV="${NODE_ENV:-production}"
export ENV="${ENV:-production}"

wait_for_db
run_bootstrap_sql
run_migrations
run_seed_if_enabled
start_go_api "${GO_PORT}"

log "Starting Express API on :${BACKEND_PORT} (GO_API_URL=${GO_API_URL})"
exec PORT="${BACKEND_PORT}" GO_API_URL="${GO_API_URL}" node /app/artifacts/api-server/dist/index.cjs
