#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-dev}"

case "${MODE}" in
  dev)
    ENV_FILE="${ROOT_DIR}/docker/.env.dev"
    COMPOSE_FILE="${ROOT_DIR}/docker-compose.yml"
    ;;
  prod)
    ENV_FILE="${ROOT_DIR}/docker/.env.production"
    COMPOSE_FILE="${ROOT_DIR}/docker-compose.production.yml"
    ;;
  *)
    echo "Usage: cmd/deploy.health.sh [dev|prod]"
    exit 1
    ;;
esac

FRONTEND_PORT="$(grep -E '^FRONTEND_PORT=' "${ENV_FILE}" | cut -d= -f2)"
BACKEND_PORT="$(grep -E '^BACKEND_PORT=' "${ENV_FILE}" | cut -d= -f2)"

echo "[health] compose status"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps

echo "[health] backend /api/healthz"
curl -fsS "http://127.0.0.1:${BACKEND_PORT}/api/healthz" && echo

echo "[health] frontend /"
curl -fsS -I "http://127.0.0.1:${FRONTEND_PORT}/" | head -n 1

echo "[health] done"
