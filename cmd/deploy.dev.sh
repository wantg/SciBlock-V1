#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/docker/.env.dev"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.yml"

if [ ! -f "${ENV_FILE}" ]; then
  cp "${ROOT_DIR}/docker/.env.example" "${ENV_FILE}"
  echo "[deploy:dev] Created ${ENV_FILE} from template."
fi

echo "[deploy:dev] Building and starting local stack..."
docker compose \
  --env-file "${ENV_FILE}" \
  -f "${COMPOSE_FILE}" \
  up -d --build --remove-orphans

echo "[deploy:dev] Stack is up."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps

echo "[deploy:dev] Frontend: http://localhost:$(grep -E '^FRONTEND_PORT=' "${ENV_FILE}" | cut -d= -f2)"
echo "[deploy:dev] Backend : http://localhost:$(grep -E '^BACKEND_PORT=' "${ENV_FILE}" | cut -d= -f2)/api/healthz"
