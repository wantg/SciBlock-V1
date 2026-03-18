#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-dev}"
SERVICE="${2:-}"

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
    echo "Usage: cmd/deploy.logs.sh [dev|prod] [service]"
    exit 1
    ;;
esac

if [ -n "${SERVICE}" ]; then
  docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" logs -f --tail=200 "${SERVICE}"
else
  docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" logs -f --tail=200
fi
