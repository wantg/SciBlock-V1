#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/docker/.env.production"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.production.yml"

if [ ! -f "${ENV_FILE}" ]; then
  echo "[deploy:prod] Missing ${ENV_FILE}."
  echo "[deploy:prod] Copy docker/.env.production and fill real values first."
  exit 1
fi

if grep -q 'CHANGE_ME' "${ENV_FILE}"; then
  echo "[deploy:prod] Found CHANGE_ME placeholder in ${ENV_FILE}."
  echo "[deploy:prod] Replace all placeholders before deploying."
  exit 1
fi

echo "[deploy:prod] Building and starting production stack..."
docker compose \
  --env-file "${ENV_FILE}" \
  -f "${COMPOSE_FILE}" \
  up -d --build --remove-orphans

echo "[deploy:prod] Stack is up."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps
