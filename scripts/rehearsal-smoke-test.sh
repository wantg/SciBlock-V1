#!/usr/bin/env bash
# =============================================================================
# scripts/rehearsal-smoke-test.sh — SciBlock 迁移预演 Smoke Test
# =============================================================================
#
# 职责：仅做验证——不建库、不迁移、不 seed。
#
# 前置条件：
#   1. 数据库已建，pnpm migrate 已执行
#   2. seed-dev.sh 已执行（依赖 dev@sciblock.local + demo@sciblock.com 账户）
#   3. Go API 已启动（默认 :8082）
#   4. Express API 已启动（默认 :8080）
#
# 用法：
#   bash scripts/rehearsal-smoke-test.sh
#
# 可覆盖的环境变量：
#   BASE_URL              Express API 地址（默认 http://localhost:8080）
#   GO_API_URL            Go API 直连地址（默认 http://localhost:8082）
#   INSTRUCTOR_EMAIL      默认 dev@sciblock.local
#   INSTRUCTOR_PASSWORD   默认 DevPass1234
#   STUDENT_EMAIL         默认 demo@sciblock.com
#   STUDENT_PASSWORD      默认 DemoPass1234
#
# 退出码：
#   0 — 所有测试 PASS
#   1 — 至少一项 FAIL
# =============================================================================

set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
GO_API_URL="${GO_API_URL:-http://localhost:8082}"
INSTRUCTOR_EMAIL="${INSTRUCTOR_EMAIL:-dev@sciblock.local}"
INSTRUCTOR_PASSWORD="${INSTRUCTOR_PASSWORD:-DevPass1234}"
STUDENT_EMAIL="${STUDENT_EMAIL:-demo@sciblock.com}"
STUDENT_PASSWORD="${STUDENT_PASSWORD:-DemoPass1234}"

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0
declare -a FAILURES=()

pass() { echo -e "  ${GREEN}PASS${NC}  $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo -e "  ${RED}FAIL${NC}  $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); FAILURES+=("$1"); }
section() { echo -e "\n${CYAN}── $1 ──${NC}"; }

# ---------------------------------------------------------------------------
# HTTP helper
#
# http_call <METHOD> <URL> [<BEARER_TOKEN>] [<JSON_BODY>]
# Sets globals: HTTP_STATUS  HTTP_BODY
# ---------------------------------------------------------------------------
HTTP_STATUS=""
HTTP_BODY=""

http_call() {
  local method="$1"
  local url="$2"
  local token="${3:-}"
  local body="${4:-}"

  local args=(-s -X "$method")
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
  if [[ -n "$body" ]]; then
    args+=(-H "Content-Type: application/json" -d "$body")
  fi
  args+=(-w "\n%{http_code}" "$url")

  local raw
  raw=$(curl "${args[@]}" 2>/dev/null)

  HTTP_STATUS=$(echo "$raw" | tail -1)
  HTTP_BODY=$(echo "$raw" | head -n -1)
}

# Extract a JSON string field from HTTP_BODY: json_field <key>
json_field() {
  echo "$HTTP_BODY" | grep -o "\"$1\":\"[^\"]*\"" | head -1 | cut -d'"' -f4
}

# ---------------------------------------------------------------------------
# Cleanup registry — test records created during this run
# ---------------------------------------------------------------------------
CLEANUP_SCINOTE_ID=""
CLEANUP_EXPERIMENT_ID=""

cleanup() {
  if [[ -n "$CLEANUP_EXPERIMENT_ID" ]]; then
    http_call "DELETE" "$BASE_URL/api/experiments/$CLEANUP_EXPERIMENT_ID" "$INSTRUCTOR_TOKEN" >/dev/null 2>&1 || true
  fi
  if [[ -n "$CLEANUP_SCINOTE_ID" ]]; then
    http_call "DELETE" "$BASE_URL/api/scinotes/$CLEANUP_SCINOTE_ID" "$INSTRUCTOR_TOKEN" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# State — populated by login tests
# ---------------------------------------------------------------------------
INSTRUCTOR_TOKEN=""
STUDENT_TOKEN=""

echo -e "${YELLOW}SciBlock Smoke Test${NC}"
echo    "  BASE_URL   : $BASE_URL"
echo    "  GO_API_URL : $GO_API_URL"
echo    "  Started at : $(date)"

# ===========================================================================
# 1. HEALTH CHECKS
# ===========================================================================
section "1. Health Checks"

http_call "GET" "$GO_API_URL/healthz"
if [[ "$HTTP_STATUS" == "200" ]] && echo "$HTTP_BODY" | grep -q "sciblock-go-api"; then
  pass "Go API /healthz returns 200 + correct service name"
else
  fail "Go API /healthz — expected 200, got $HTTP_STATUS"
fi

http_call "GET" "$BASE_URL/api/healthz"
if [[ "$HTTP_STATUS" == "200" ]]; then
  pass "Express API /api/healthz returns 200"
else
  fail "Express API /api/healthz — expected 200, got $HTTP_STATUS"
fi

# ===========================================================================
# 2. AUTHENTICATION — Login
# ===========================================================================
section "2. Authentication — Login"

# Instructor login
http_call "POST" "$BASE_URL/api/auth/login" "" \
  "{\"email\":\"$INSTRUCTOR_EMAIL\",\"password\":\"$INSTRUCTOR_PASSWORD\"}"
if [[ "$HTTP_STATUS" == "200" ]]; then
  INSTRUCTOR_TOKEN=$(json_field "token")
  if [[ -n "$INSTRUCTOR_TOKEN" ]]; then
    pass "Instructor login (200 + token present)"
  else
    fail "Instructor login — 200 but no token in response"
  fi
else
  fail "Instructor login — expected 200, got $HTTP_STATUS"
fi

# Student login
http_call "POST" "$BASE_URL/api/auth/login" "" \
  "{\"email\":\"$STUDENT_EMAIL\",\"password\":\"$STUDENT_PASSWORD\"}"
if [[ "$HTTP_STATUS" == "200" ]]; then
  STUDENT_TOKEN=$(json_field "token")
  if [[ -n "$STUDENT_TOKEN" ]]; then
    pass "Student login (200 + token present)"
  else
    fail "Student login — 200 but no token in response"
  fi
else
  fail "Student login — expected 200, got $HTTP_STATUS"
fi

# Abort early if we have no tokens — remaining tests require them
if [[ -z "$INSTRUCTOR_TOKEN" || -z "$STUDENT_TOKEN" ]]; then
  echo -e "\n${RED}Cannot continue: login failed. Fix login before re-running.${NC}"
  echo -e "${RED}FAILED — $FAIL_COUNT test(s) failed, $PASS_COUNT passed${NC}"
  exit 1
fi

# ===========================================================================
# 3. JWT CROSS-SERVICE VALIDATION
#    The same token must be accepted by both Express (proxy) and Go API (direct).
# ===========================================================================
section "3. JWT Cross-Service Validation"

# Via Express proxy
http_call "GET" "$BASE_URL/api/auth/me" "$INSTRUCTOR_TOKEN"
if [[ "$HTTP_STATUS" == "200" ]]; then
  pass "GET /api/auth/me via Express — 200 (JWT accepted by Express)"
else
  fail "GET /api/auth/me via Express — expected 200, got $HTTP_STATUS"
fi

# Directly to Go API (bypasses Express, proves shared JWT_SECRET)
http_call "GET" "$GO_API_URL/api/auth/me" "$INSTRUCTOR_TOKEN"
if [[ "$HTTP_STATUS" == "200" ]]; then
  pass "GET /api/auth/me via Go API direct — 200 (JWT_SECRET identical in both services)"
else
  fail "GET /api/auth/me via Go API direct — expected 200, got $HTTP_STATUS (JWT_SECRET mismatch?)"
fi

# ===========================================================================
# 4. AUTHENTICATION BOUNDARIES — Unauthenticated requests must be rejected
# ===========================================================================
section "4. Authentication Boundaries"

for path in \
  "/api/auth/me" \
  "/api/team/members" \
  "/api/reports" \
  "/api/messages" \
  "/api/scinotes"; do
  http_call "GET" "$BASE_URL$path"
  if [[ "$HTTP_STATUS" == "401" ]]; then
    pass "No token → 401 on $path"
  else
    fail "No token on $path — expected 401, got $HTTP_STATUS"
  fi
done

# Forged token must also be rejected
FAKE_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIn0.fake"
http_call "GET" "$BASE_URL/api/auth/me" "$FAKE_TOKEN"
if [[ "$HTTP_STATUS" == "401" ]]; then
  pass "Forged token → 401 on /api/auth/me"
else
  fail "Forged token on /api/auth/me — expected 401, got $HTTP_STATUS"
fi

# ===========================================================================
# 5. SCINOTE CRUD
# ===========================================================================
section "5. SciNote CRUD"

# Create
SMOKE_SCINOTE_TITLE="smoke-test-scinote-$(date +%s)"
http_call "POST" "$BASE_URL/api/scinotes" "$INSTRUCTOR_TOKEN" \
  "{\"title\":\"$SMOKE_SCINOTE_TITLE\"}"
if [[ "$HTTP_STATUS" == "201" ]]; then
  CLEANUP_SCINOTE_ID=$(json_field "id")
  if [[ -n "$CLEANUP_SCINOTE_ID" ]]; then
    pass "POST /api/scinotes — 201 + id returned (id=$CLEANUP_SCINOTE_ID)"
  else
    fail "POST /api/scinotes — 201 but no id in response"
  fi
else
  fail "POST /api/scinotes — expected 201, got $HTTP_STATUS"
fi

# List — confirms the created record is visible
if [[ -n "$CLEANUP_SCINOTE_ID" ]]; then
  http_call "GET" "$BASE_URL/api/scinotes" "$INSTRUCTOR_TOKEN"
  if [[ "$HTTP_STATUS" == "200" ]] && echo "$HTTP_BODY" | grep -q "$CLEANUP_SCINOTE_ID"; then
    pass "GET /api/scinotes — 200 + created record present in list"
  elif [[ "$HTTP_STATUS" == "200" ]]; then
    fail "GET /api/scinotes — 200 but created record not found in list"
  else
    fail "GET /api/scinotes — expected 200, got $HTTP_STATUS"
  fi
fi

# ===========================================================================
# 6. EXPERIMENT CRUD
#    Minimum legal payload: title (required), experimentStatus, experimentCode
# ===========================================================================
section "6. Experiment CRUD"

if [[ -n "$CLEANUP_SCINOTE_ID" ]]; then
  SMOKE_EXP_TITLE="smoke-test-exp-$(date +%s)"
  http_call "POST" "$BASE_URL/api/scinotes/$CLEANUP_SCINOTE_ID/experiments" \
    "$INSTRUCTOR_TOKEN" \
    "{\"title\":\"$SMOKE_EXP_TITLE\",\"experimentStatus\":\"探索中\",\"experimentCode\":\"SM-001\"}"
  if [[ "$HTTP_STATUS" == "201" ]]; then
    CLEANUP_EXPERIMENT_ID=$(json_field "id")
    if [[ -n "$CLEANUP_EXPERIMENT_ID" ]]; then
      pass "POST /api/scinotes/:id/experiments — 201 + id returned"
    else
      fail "POST /api/scinotes/:id/experiments — 201 but no id in response"
    fi
  else
    fail "POST /api/scinotes/:id/experiments — expected 201, got $HTTP_STATUS"
  fi

  # List experiments under the SciNote
  http_call "GET" "$BASE_URL/api/scinotes/$CLEANUP_SCINOTE_ID/experiments" \
    "$INSTRUCTOR_TOKEN"
  if [[ "$HTTP_STATUS" == "200" ]] && echo "$HTTP_BODY" | grep -q "$SMOKE_EXP_TITLE"; then
    pass "GET /api/scinotes/:id/experiments — 200 + experiment in list"
  elif [[ "$HTTP_STATUS" == "200" ]]; then
    fail "GET /api/scinotes/:id/experiments — 200 but created experiment not found"
  else
    fail "GET /api/scinotes/:id/experiments — expected 200, got $HTTP_STATUS"
  fi

  # Get experiment by standalone ID
  if [[ -n "$CLEANUP_EXPERIMENT_ID" ]]; then
    http_call "GET" "$BASE_URL/api/experiments/$CLEANUP_EXPERIMENT_ID" \
      "$INSTRUCTOR_TOKEN"
    if [[ "$HTTP_STATUS" == "200" ]]; then
      pass "GET /api/experiments/:id — 200"
    else
      fail "GET /api/experiments/:id — expected 200, got $HTTP_STATUS"
    fi
  fi
else
  fail "Experiment tests skipped — SciNote creation failed earlier"
fi

# ===========================================================================
# 7. TEAM MEMBERS
# ===========================================================================
section "7. Team Members"

http_call "GET" "$BASE_URL/api/team/members" "$INSTRUCTOR_TOKEN"
if [[ "$HTTP_STATUS" == "200" ]]; then
  pass "GET /api/team/members (instructor token) — 200"
else
  fail "GET /api/team/members — expected 200, got $HTTP_STATUS"
fi

# ===========================================================================
# 8. REPORTS (role-based routing)
# ===========================================================================
section "8. Reports"

# Student → returns own reports (not 409 means studentId binding exists)
http_call "GET" "$BASE_URL/api/reports" "$STUDENT_TOKEN"
if [[ "$HTTP_STATUS" == "200" ]]; then
  pass "GET /api/reports (student token) — 200 (student profile bound)"
elif [[ "$HTTP_STATUS" == "409" ]]; then
  fail "GET /api/reports (student token) — 409: student account not bound to a student profile (run seed?)"
else
  fail "GET /api/reports (student token) — expected 200, got $HTTP_STATUS"
fi

# Instructor → returns full list
http_call "GET" "$BASE_URL/api/reports" "$INSTRUCTOR_TOKEN"
if [[ "$HTTP_STATUS" == "200" ]]; then
  pass "GET /api/reports (instructor token) — 200"
else
  fail "GET /api/reports (instructor token) — expected 200, got $HTTP_STATUS"
fi

# ===========================================================================
# 9. MESSAGES
# ===========================================================================
section "9. Messages"

http_call "GET" "$BASE_URL/api/messages" "$INSTRUCTOR_TOKEN"
if [[ "$HTTP_STATUS" == "200" ]]; then
  pass "GET /api/messages (instructor token) — 200"
else
  fail "GET /api/messages — expected 200, got $HTTP_STATUS"
fi

# ===========================================================================
# 10. AI STATUS
# ===========================================================================
section "10. AI Status"

http_call "GET" "$BASE_URL/api/ai/status"
if [[ "$HTTP_STATUS" == "200" ]]; then
  if echo "$HTTP_BODY" | grep -q '"available"'; then
    pass "GET /api/ai/status — 200 + available field present"
    if echo "$HTTP_BODY" | grep -q '"available":false'; then
      pass "  └─ available: false (no AI key configured — UI disabled state expected)"
    elif echo "$HTTP_BODY" | grep -q '"available":true'; then
      pass "  └─ available: true (AI key is configured)"
    fi
  else
    fail "GET /api/ai/status — 200 but 'available' field missing"
  fi
else
  fail "GET /api/ai/status — expected 200, got $HTTP_STATUS"
fi

# Verify 503 is returned when AI unavailable and chat is called
http_call "POST" "$BASE_URL/api/ai/chat" "" \
  '{"messages":[{"role":"user","content":"ping"}]}'
if echo "$HTTP_BODY" | grep -q '"available":true'; then
  # AI is configured — chat should work (skip 503 check)
  true
elif [[ "$HTTP_STATUS" == "503" ]] && echo "$HTTP_BODY" | grep -q "ai_not_configured"; then
  pass "POST /api/ai/chat without key — 503 ai_not_configured (correct)"
else
  fail "POST /api/ai/chat without key — expected 503 ai_not_configured, got $HTTP_STATUS"
fi

# ===========================================================================
# 11. CORS (tested against Go API directly)
# ===========================================================================
section "11. CORS (Go API)"

# In development (CORS_ORIGINS not set) → wildcard
CORS_HEADER=$(curl -sI -H "Origin: https://any-origin.example.com" \
  "$GO_API_URL/healthz" 2>/dev/null | grep -i "access-control-allow-origin" || echo "")
if echo "$CORS_HEADER" | grep -q "\*"; then
  pass "CORS_ORIGINS unset → Access-Control-Allow-Origin: * (permissive dev mode)"
else
  fail "CORS_ORIGINS unset — expected wildcard header, got: '$CORS_HEADER'"
fi

# OPTIONS preflight must be handled (204)
PREFLIGHT_STATUS=$(curl -sI -X OPTIONS \
  -H "Origin: https://test.example.com" \
  -H "Access-Control-Request-Method: POST" \
  "$GO_API_URL/api/auth/login" 2>/dev/null | grep "HTTP/" | awk '{print $2}')
if [[ "$PREFLIGHT_STATUS" == "204" ]]; then
  pass "OPTIONS preflight on Go API — 204 No Content"
else
  fail "OPTIONS preflight on Go API — expected 204, got $PREFLIGHT_STATUS"
fi

# ===========================================================================
# SUMMARY
# ===========================================================================
echo ""
echo "═══════════════════════════════════════════"
TOTAL=$((PASS_COUNT + FAIL_COUNT))
if [[ $FAIL_COUNT -eq 0 ]]; then
  echo -e "${GREEN}ALL TESTS PASSED${NC}  ($PASS_COUNT / $TOTAL)"
  echo "═══════════════════════════════════════════"
  echo ""
  echo "Rehearsal verdict: ✅  Safe to proceed with production migration."
  exit 0
else
  echo -e "${RED}FAILED${NC}  ($FAIL_COUNT failed, $PASS_COUNT passed, $TOTAL total)"
  echo "═══════════════════════════════════════════"
  echo ""
  echo -e "${RED}Failed tests:${NC}"
  for f in "${FAILURES[@]}"; do
    echo "  • $f"
  done
  echo ""
  echo "Rehearsal verdict: ❌  Do NOT migrate until all tests pass."
  exit 1
fi
