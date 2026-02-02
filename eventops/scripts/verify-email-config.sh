#!/bin/bash
# scripts/verify-email-config.sh
# Verifies email configuration is correct for production
#
# Usage:
#   ./scripts/verify-email-config.sh
#   BACKEND_URL=http://localhost:3000 ./scripts/verify-email-config.sh

BACKEND_URL="${BACKEND_URL:-https://yardflow-hitlist-production-2f41.up.railway.app}"
GTM_ORIGIN="https://gtm-yard-flow.vercel.app"

echo "==========================================="
echo " YardFlow Email Configuration Verification"
echo "==========================================="
echo "Backend: $BACKEND_URL"
echo "GTM Origin: $GTM_ORIGIN"
echo ""

PASS=0
FAIL=0
WARN=0

# 1. Health Check
echo "1. Checking backend health..."
HEALTH=$(curl -sf "$BACKEND_URL/api/health" 2>/dev/null || echo '{"status":"error"}')
STATUS=$(echo "$HEALTH" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ "$STATUS" = "healthy" ]; then
  echo "   ✅ Backend is healthy"
  PASS=$((PASS + 1))
else
  echo "   ❌ Backend unhealthy: $HEALTH"
  FAIL=$((FAIL + 1))
fi

# 2. Environment Check
echo "2. Checking environment variables..."
CRITICAL_MISSING=$(echo "$HEALTH" | grep -o '"criticalMissing":\[[^]]*\]' | grep -o '\[.*\]')
if [ "$CRITICAL_MISSING" = "[]" ]; then
  echo "   ✅ All critical env vars present"
  PASS=$((PASS + 1))
else
  echo "   ❌ Missing critical vars: $CRITICAL_MISSING"
  FAIL=$((FAIL + 1))
fi

# 3. CORS Check
echo "3. Checking CORS configuration..."
CORS_ORIGIN=$(curl -sf -I -X OPTIONS "$BACKEND_URL/api/accounts" \
  -H "Origin: $GTM_ORIGIN" 2>&1 | grep -i "access-control-allow-origin" | head -1)
if echo "$CORS_ORIGIN" | grep -qi "$GTM_ORIGIN"; then
  echo "   ✅ CORS allows GTM origin"
  PASS=$((PASS + 1))
else
  echo "   ⚠️ CORS may not be configured for GTM"
  echo "   Got: $CORS_ORIGIN"
  WARN=$((WARN + 1))
fi

# 4. Auth Enforcement Check
echo "4. Checking auth enforcement..."
AUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/accounts")
if [ "$AUTH_CODE" = "401" ]; then
  echo "   ✅ Unauthenticated requests blocked (HTTP 401)"
  PASS=$((PASS + 1))
else
  echo "   ⚠️ Expected 401, got $AUTH_CODE"
  WARN=$((WARN + 1))
fi

# 5. Database connectivity (from health)
echo "5. Checking database connectivity..."
DB_STATUS=$(echo "$HEALTH" | grep -o '"database":{[^}]*}' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
if [ "$DB_STATUS" = "ok" ]; then
  echo "   ✅ Database connected"
  PASS=$((PASS + 1))
else
  echo "   ❌ Database not connected"
  FAIL=$((FAIL + 1))
fi

# 6. Redis connectivity (from health)
echo "6. Checking Redis connectivity..."
REDIS_STATUS=$(echo "$HEALTH" | grep -o '"redis":{[^}]*}' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
if [ "$REDIS_STATUS" = "ok" ]; then
  echo "   ✅ Redis connected"
  PASS=$((PASS + 1))
else
  echo "   ❌ Redis not connected"
  FAIL=$((FAIL + 1))
fi

# 7. Worker status (from health)
echo "7. Checking worker status..."
WORKER_STATUS=$(echo "$HEALTH" | grep -o '"worker":{[^}]*}' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
if [ "$WORKER_STATUS" = "ok" ]; then
  echo "   ✅ Worker is running"
  PASS=$((PASS + 1))
else
  echo "   ⚠️ Worker status: $WORKER_STATUS"
  WARN=$((WARN + 1))
fi

# Summary
echo ""
echo "==========================================="
echo " Summary"
echo "==========================================="
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo "Warnings: $WARN"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "❌ VERIFICATION FAILED - Fix critical issues before proceeding"
  exit 1
elif [ $WARN -gt 0 ]; then
  echo "⚠️ VERIFICATION PASSED WITH WARNINGS - Review warnings"
  exit 0
else
  echo "✅ VERIFICATION PASSED - All checks OK"
  exit 0
fi
