#!/usr/bin/env bash
# =============================================================================
# scripts/seed-dev-user.sh — Create a deterministic dev/test user in the DB
# =============================================================================
# Usage:
#   sh scripts/seed-dev-user.sh
#
# Creates:
#   email:    dev@sciblock.local
#   password: DevPass1234
#   name:     Dev User
#   role:     instructor   (so all permission checks pass during dev)
#
# Idempotent: if the user already exists, it updates the password hash and role.
#
# Requirements: DATABASE_URL must be set; Node.js must be available (for bcrypt).
# =============================================================================

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[seed] ERROR: DATABASE_URL is not set." >&2
  exit 1
fi

EMAIL="dev@sciblock.local"
PASSWORD="DevPass1234"
NAME="Dev User"
ROLE="instructor"

echo "[seed] Hashing password with bcrypt (cost=12)..."

# Find bcryptjs module in various possible locations
BCRYPTJS_PATH=""
for path in \
  "$(pwd)/node_modules/bcryptjs" \
  "$(pwd)/scripts/node_modules/bcryptjs" \
  "$(pwd)/artifacts/api-server/node_modules/bcryptjs" \
  "$(dirname "$0")/../node_modules/bcryptjs" \
  "$(dirname "$0")/node_modules/bcryptjs"
do
  if [ -d "$path" ]; then
    BCRYPTJS_PATH="$path"
    break
  fi
done

if [ -z "$BCRYPTJS_PATH" ]; then
  echo "[seed] ERROR: bcryptjs module not found. Checked: node_modules, scripts/node_modules, api-server/node_modules" >&2
  exit 1
fi

echo "[seed] Using bcryptjs from: $BCRYPTJS_PATH"

HASH=$(node -e "
const bcrypt = require('$BCRYPTJS_PATH');
bcrypt.hash(process.argv[1], 12).then(h => process.stdout.write(h));
" "$PASSWORD" 2>/dev/null)

if [ -z "$HASH" ]; then
  echo "[seed] ERROR: bcrypt hashing failed." >&2
  exit 1
fi

echo "[seed] Upserting user: $EMAIL..."

psql "$DATABASE_URL" <<SQL
INSERT INTO users (id, email, password_hash, name, role)
VALUES (
  gen_random_uuid()::text,
  '$EMAIL',
  '$HASH',
  '$NAME',
  '$ROLE'
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name          = EXCLUDED.name,
  role          = EXCLUDED.role;
SQL

echo "[seed] Done."
echo ""
echo "  Email:    $EMAIL"
echo "  Password: $PASSWORD"
echo "  Role:     $ROLE"
echo ""
echo "Login via Go API:"
echo "  POST http://localhost:8082/api/auth/login"
echo "  { \"email\": \"$EMAIL\", \"password\": \"$PASSWORD\" }"
