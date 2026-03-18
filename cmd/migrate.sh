#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/docker/.env.production"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.production.yml"

if [ ! -f "${ENV_FILE}" ]; then
  echo "[migrate] Missing ${ENV_FILE}."
  exit 1
fi

echo "[migrate] Running Drizzle migrations in backend container..."
docker compose \
  --env-file "${ENV_FILE}" \
  -f "${COMPOSE_FILE}" \
  run --rm backend pnpm --filter @workspace/db run migrate

echo "[migrate] Done."
