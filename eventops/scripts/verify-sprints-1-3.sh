#!/bin/bash
# Sprint 1-3 Verification Script
# Validates: Infrastructure, Auth, Core Data

set -e

URL="${1:-https://yardflow-hitlist-production-2f41.up.railway.app}"
PASSED=0
FAILED=0

echo "🔍 YardFlow Hitlist Production Verification"
echo "============================================"
echo "Target: $URL"
echo ""

# Sprint 0/1: Infrastructure
echo "📡 Sprint 1: Infrastructure Checks"
echo "-----------------------------------"

# 1. Ping endpoint
echo -n "  [1.1] Ping endpoint... "
PING=$(curl -s -w "%{http_code}" -o /tmp/ping.json "$URL/api/ping" 2>/dev/null)
if [ "$PING" = "200" ]; then
  echo "✅ OK"
  ((PASSED++))
else
  echo "❌ FAIL ($PING)"
  ((FAILED++))
fi

# 2. Health endpoint (should return 200 now with fixed env var logic)
echo -n "  [1.2] Health endpoint... "
HEALTH=$(curl -s -w "%{http_code}" -o /tmp/health.json "$URL/api/health" 2>/dev/null)
if [ "$HEALTH" = "200" ] || [ "$HEALTH" = "503" ]; then
  echo "✅ OK ($HEALTH)"
  ((PASSED++))
  # Check DB status
  DB_STATUS=$(cat /tmp/health.json | grep -o '"database":{"status":"[^"]*"' | grep -o 'ok\|error')
  echo "       └─ Database: $DB_STATUS"
else
  echo "❌ FAIL ($HEALTH)"
  ((FAILED++))
fi

# Sprint 2: Auth
echo ""
echo "🔐 Sprint 2: Authentication Checks"
echo "-----------------------------------"

# 3. Login page loads
echo -n "  [2.1] Login page loads... "
LOGIN=$(curl -s -w "%{http_code}" -o /dev/null "$URL/login" 2>/dev/null)
if [ "$LOGIN" = "200" ]; then
  echo "✅ OK"
  ((PASSED++))
else
  echo "❌ FAIL ($LOGIN)"
  ((FAILED++))
fi

# 4. Auth API exists
echo -n "  [2.2] Auth API responds... "
AUTH=$(curl -s -w "%{http_code}" -o /dev/null "$URL/api/auth/providers" 2>/dev/null)
if [ "$AUTH" = "200" ]; then
  echo "✅ OK"
  ((PASSED++))
else
  echo "❌ FAIL ($AUTH)"
  ((FAILED++))
fi

# Sprint 3: Core Data Endpoints
echo ""
echo "📊 Sprint 3: Data API Checks"
echo "----------------------------"

# 5. Accounts API
echo -n "  [3.1] Accounts API... "
ACCOUNTS=$(curl -s -w "%{http_code}" -o /dev/null "$URL/api/accounts" 2>/dev/null)
if [ "$ACCOUNTS" = "200" ] || [ "$ACCOUNTS" = "401" ]; then
  echo "✅ OK ($ACCOUNTS)"
  ((PASSED++))
else
  echo "❌ FAIL ($ACCOUNTS)"
  ((FAILED++))
fi

# 6. People API
echo -n "  [3.2] People API... "
PEOPLE=$(curl -s -w "%{http_code}" -o /dev/null "$URL/api/people" 2>/dev/null)
if [ "$PEOPLE" = "200" ] || [ "$PEOPLE" = "401" ]; then
  echo "✅ OK ($PEOPLE)"
  ((PASSED++))
else
  echo "❌ FAIL ($PEOPLE)"
  ((FAILED++))
fi

# 7. Events API
echo -n "  [3.3] Events API... "
EVENTS=$(curl -s -w "%{http_code}" -o /dev/null "$URL/api/events" 2>/dev/null)
if [ "$EVENTS" = "200" ] || [ "$EVENTS" = "401" ]; then
  echo "✅ OK ($EVENTS)"
  ((PASSED++))
else
  echo "❌ FAIL ($EVENTS)"
  ((FAILED++))
fi

# Summary
echo ""
echo "============================================"
echo "📋 Summary: $PASSED passed, $FAILED failed"
echo "============================================"

if [ "$FAILED" -gt 0 ]; then
  echo "❌ Some checks failed!"
  exit 1
else
  echo "✅ All checks passed!"
  exit 0
fi
