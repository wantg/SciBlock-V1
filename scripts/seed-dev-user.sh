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

# Resolve DB URL — EXTERNAL_DATABASE_URL takes priority over DATABASE_URL
DB_URL="${EXTERNAL_DATABASE_URL:-${DATABASE_URL:-}}"

if [ -z "$DB_URL" ]; then
  echo "[seed] ERROR: Neither EXTERNAL_DATABASE_URL nor DATABASE_URL is set." >&2
  exit 1
fi

EMAIL="dev@sciblock.local"
PASSWORD="DevPass1234"
NAME="Dev User"
ROLE="instructor"

echo "[seed] Hashing password with bcrypt (cost=12)..."

# Use node + bcryptjs to hash the password (already installed in api-server).
HASH=$(node -e "
const bcrypt = require('$(pwd)/artifacts/api-server/node_modules/bcryptjs');
bcrypt.hash(process.argv[1], 12).then(h => process.stdout.write(h));
" "$PASSWORD" 2>/dev/null)

if [ -z "$HASH" ]; then
  echo "[seed] ERROR: bcrypt hashing failed. Make sure bcryptjs is installed in artifacts/api-server." >&2
  exit 1
fi

echo "[seed] Upserting user: $EMAIL..."

psql "$DB_URL" <<SQL
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
