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
    echo "Usage: cmd/deploy.stop.sh [dev|prod]"
    exit 1
    ;;
esac

echo "[deploy:stop] Stopping ${MODE} stack..."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" down --remove-orphans

echo "[deploy:stop] Done."
