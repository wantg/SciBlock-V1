#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[backend-init] %s\n' "$*"
}

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    log "ERROR: required env ${name} is not set"
    exit 1
  fi
}

rewrite_localhost_db_url() {
  local input="$1"
  echo "$input" | sed -E 's#@localhost([:/])#@host.docker.internal\1#g; s#@127\.0\.0\.1([:/])#@host.docker.internal\1#g'
}

wait_for_db() {
  local tries=30
  local delay=2

  for i in $(seq 1 "$tries"); do
    if psql "${DATABASE_URL}" -c 'select 1;' >/dev/null 2>&1; then
      log "Database is reachable"
      return 0
    fi
    log "Waiting for database (${i}/${tries})..."
    sleep "$delay"
  done

  log "ERROR: database is not reachable after ${tries} attempts"
  exit 1
}

require_env DATABASE_URL
require_env JWT_SECRET
require_env ADMIN_SECRET

export DATABASE_URL="$(rewrite_localhost_db_url "${DATABASE_URL}")"

BACKEND_PORT="${BACKEND_PORT:-8080}"
GO_PORT="${GO_PORT:-8082}"
export NODE_ENV="${NODE_ENV:-production}"
export ENV="${ENV:-development}"

log "Using DATABASE_URL host rewrite for container access"
wait_for_db

log "Ensuring core schema exists"
psql "${DATABASE_URL}" -f /app/docker/backend/init-drizzle.sql -q

log "Running development seed data"
bash /app/scripts/seed-dev.sh

log "Starting Go API on :${GO_PORT}"
PORT="${GO_PORT}" AUTO_MIGRATE="true" /app/artifacts/go-api/bin/server &
GO_PID=$!

cleanup() {
  if kill -0 "${GO_PID}" >/dev/null 2>&1; then
    kill "${GO_PID}" >/dev/null 2>&1 || true
    wait "${GO_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

log "Starting Express API on :${BACKEND_PORT}"
PORT="${BACKEND_PORT}" GO_API_URL="http://127.0.0.1:${GO_PORT}" node /app/artifacts/api-server/dist/index.cjs
