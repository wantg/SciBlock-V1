#!/usr/bin/env bash
# =============================================================================
# scripts/seed-dev.sh — Populate minimum viable dev data for SciBlock
# =============================================================================
# Usage:
#   bash scripts/seed-dev.sh
#
# What this script does:
#   1. Creates (or resets) the dev instructor account: dev@sciblock.local
#   2. Creates (or resets) demo student user: demo@sciblock.com
#   3. Seeds 5 student profiles, papers, weekly reports
#   4. Binds demo@sciblock.com to Li Ting's student profile
#   5. Seeds 5 demo inbox messages for demo@sciblock.com
#
# All steps are idempotent — safe to run multiple times.
# On re-run, only missing records are inserted; existing ones are left alone.
# The demo user's credentials are always reset to the seed values.
#
# Prerequisites:
#   - DATABASE_URL must be set
#   - pnpm migrate must have been run first (creates tables)
#   - Node.js and pnpm must be available
#
# After this script, the system is immediately usable without any HTTP trigger:
#   dev@sciblock.local  / DevPass1234  → instructor
#   demo@sciblock.com   / DemoPass1234 → student (bound to Li Ting)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log()       { echo -e "${YELLOW}[seed-dev]${NC} $*"; }
log_ok()    { echo -e "${GREEN}[seed-dev]${NC} $*"; }
log_error() { echo -e "${RED}[seed-dev]${NC} $*" >&2; }

# Resolve DB URL — EXTERNAL_DATABASE_URL takes priority over DATABASE_URL
DB_URL="${EXTERNAL_DATABASE_URL:-${DATABASE_URL:-}}"

if [ -z "$DB_URL" ]; then
  log_error "Neither EXTERNAL_DATABASE_URL nor DATABASE_URL is set."
  exit 1
fi

# Export so child scripts (seed-dev-user.sh) inherit the resolved URL.
export DATABASE_URL="$DB_URL"

# ---------------------------------------------------------------------------
# Step 1: Instructor account (dev@sciblock.local)
# ---------------------------------------------------------------------------
log "Step 1/2: Seeding instructor account..."
bash "${SCRIPT_DIR}/seed-dev-user.sh"

echo ""

# ---------------------------------------------------------------------------
# Step 2: Domain data (students, papers, reports, messages, binding)
# ---------------------------------------------------------------------------
log "Step 2/2: Seeding domain data..."
pnpm --filter @workspace/scripts run seed-dev-data

echo ""
log_ok "Dev seed complete."
echo ""
echo "  Instructor : dev@sciblock.local  / DevPass1234"
echo "  Student    : demo@sciblock.com   / DemoPass1234"
echo ""
echo "Login via Go API:"
echo "  POST \${GO_API_URL:-http://localhost:8082}/api/auth/login"
