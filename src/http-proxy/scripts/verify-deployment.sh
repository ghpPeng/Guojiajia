#!/bin/bash
# Deployment verification script for Guojiajia HTTP Proxy
set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
TIMEOUT="${TIMEOUT:-30}"
PASS=0
FAIL=0

green() { echo -e "\033[32m✓ $1\033[0m"; }
red()   { echo -e "\033[31m✕ $1\033[0m"; }
info()  { echo -e "\033[34m→ $1\033[0m"; }

check() {
  local desc="$1"; shift
  if "$@" &>/dev/null; then
    green "$desc"
    PASS=$((PASS+1))
  else
    red "$desc"
    FAIL=$((FAIL+1))
  fi
}

info "Verifying deployment at $BASE_URL"
echo ""

# 1. Health check
info "1. Health checks"
check "GET /health returns 200" \
  curl -sf "$BASE_URL/health"

check "/health response has status=healthy" \
  bash -c "curl -sf '$BASE_URL/health' | grep -q 'healthy'"

check "GET /api/health returns 200" \
  curl -sf "$BASE_URL/api/health"

# 2. Device registration
info "2. Device registration"
DEVICE_NAME="verify-device-$$"
REG_RESPONSE=$(curl -sf -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"deviceName\":\"$DEVICE_NAME\",\"deviceType\":\"embedded\",\"osVersion\":\"1.0\",\"appVersion\":\"1.0\"}" 2>/dev/null || echo "")

check "POST /api/auth/register returns token" \
  bash -c "echo '$REG_RESPONSE' | grep -q 'token'"

TOKEN=$(echo "$REG_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',d).get('token',''))" 2>/dev/null || echo "")

check "Token is a valid JWT (3 parts)" \
  bash -c "echo '$TOKEN' | tr '.' '\n' | wc -l | grep -q 3"

# 3. Token verification
info "3. Token verification"
check "GET /api/auth/verify with valid token returns 200" \
  curl -sf "$BASE_URL/api/auth/verify" -H "Authorization: Bearer $TOKEN"

check "GET /api/auth/verify without token returns 401" \
  bash -c "curl -s -o /dev/null -w '%{http_code}' '$BASE_URL/api/auth/verify' | grep -q 401"

# 4. Error handling
info "4. Error handling"
check "POST /api/auth/register without body returns 400" \
  bash -c "curl -s -o /dev/null -w '%{http_code}' -X POST '$BASE_URL/api/auth/register' -H 'Content-Type: application/json' -d '{}' | grep -q 400"

check "Unknown route returns 404" \
  bash -c "curl -s -o /dev/null -w '%{http_code}' '$BASE_URL/nonexistent' | grep -q 404"

# 5. WebSocket (if wscat available)
info "5. WebSocket"
if command -v wscat &>/dev/null && [ -n "$TOKEN" ]; then
  WS_URL="${BASE_URL/http/ws}"
  check "WebSocket connects with valid token" \
    bash -c "echo '' | timeout 3 wscat -c '$WS_URL/ws?token=$TOKEN' 2>&1 | grep -q 'Connected'"
else
  echo "  (skipped - wscat not available or no token)"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Results: $PASS passed, $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

[ $FAIL -eq 0 ] && green "All checks passed" && exit 0 || red "Some checks failed" && exit 1
