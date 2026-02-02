#!/bin/bash
# scripts/test-gtm-proxy.sh
# Simulates GTM frontend calling Railway backend
# Usage: SERVICE_TO_SERVICE_SECRET=xxx ./scripts/test-gtm-proxy.sh

set -e

BACKEND_URL="${BACKEND_URL:-https://yardflow-hitlist-production-2f41.up.railway.app}"
S2S_SECRET="${SERVICE_TO_SERVICE_SECRET:-}"
GTM_ORIGIN="https://gtm-yard-flow.vercel.app"

PASS=0
FAIL=0
WARN=0

echo "==========================================="
echo " GTM Frontend Integration Test"
echo "==========================================="
echo "Backend: $BACKEND_URL"
echo "Origin:  $GTM_ORIGIN"
echo ""

# Check required secret
if [ -z "$S2S_SECRET" ]; then
  echo "❌ ERROR: SERVICE_TO_SERVICE_SECRET not set"
  echo ""
  echo "Usage: SERVICE_TO_SERVICE_SECRET=xxx ./scripts/test-gtm-proxy.sh"
  exit 1
fi

# Test 1: Health check
echo "1. Backend Health Check..."
HEALTH_CODE=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/health")
if [ "$HEALTH_CODE" = "200" ]; then
  echo "   ✅ PASS - Backend healthy (HTTP $HEALTH_CODE)"
  PASS=$((PASS + 1))
else
  echo "   ❌ FAIL - Backend unhealthy (HTTP $HEALTH_CODE)"
  FAIL=$((FAIL + 1))
fi

# Test 2: CORS Preflight
echo "2. CORS Preflight for GTM Origin..."
CORS_HEADERS=$(curl -s --max-time 10 -I -X OPTIONS "$BACKEND_URL/api/accounts" \
  -H "Origin: $GTM_ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: x-service-key,content-type" 2>&1)
if echo "$CORS_HEADERS" | grep -qi "access-control-allow-origin"; then
  echo "   ✅ PASS - CORS headers present"
  PASS=$((PASS + 1))
else
  echo "   ⚠️  WARN - CORS headers not detected (may work anyway)"
  WARN=$((WARN + 1))
fi

# Test 3: Unauthenticated request should fail
echo "3. Auth Enforcement (no key should fail)..."
NO_AUTH_CODE=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" \
  -X GET "$BACKEND_URL/api/accounts" \
  -H "Origin: $GTM_ORIGIN")
if [ "$NO_AUTH_CODE" = "401" ]; then
  echo "   ✅ PASS - Unauthenticated returns 401"
  PASS=$((PASS + 1))
else
  echo "   ❌ FAIL - Expected 401, got $NO_AUTH_CODE"
  FAIL=$((FAIL + 1))
fi

# Test 4: S2S Auth with GTM headers
echo "4. S2S Authentication (x-service-key)..."
AUTH_CODE=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" \
  -X GET "$BACKEND_URL/api/accounts" \
  -H "Origin: $GTM_ORIGIN" \
  -H "x-service-key: $S2S_SECRET" \
  -H "Content-Type: application/json")
if [ "$AUTH_CODE" = "200" ]; then
  echo "   ✅ PASS - S2S auth successful (HTTP $AUTH_CODE)"
  PASS=$((PASS + 1))
else
  echo "   ❌ FAIL - S2S auth failed (HTTP $AUTH_CODE)"
  FAIL=$((FAIL + 1))
fi

# Test 5: Email stats endpoint
echo "5. Email Stats Endpoint..."
STATS=$(curl -s --max-time 10 \
  -X GET "$BACKEND_URL/api/email/stats" \
  -H "Origin: $GTM_ORIGIN" \
  -H "x-service-key: $S2S_SECRET")
if echo "$STATS" | grep -q '"sent"'; then
  SENT_COUNT=$(echo "$STATS" | grep -o '"sent":[0-9]*' | cut -d':' -f2)
  echo "   ✅ PASS - Stats returned (sent: $SENT_COUNT emails)"
  PASS=$((PASS + 1))
else
  echo "   ❌ FAIL - Stats endpoint error"
  FAIL=$((FAIL + 1))
fi

# Test 6: Send email endpoint (validation only)
echo "6. Send Email Endpoint (validation test)..."
SEND_RESULT=$(curl -s --max-time 15 -w "\n%{http_code}" \
  -X POST "$BACKEND_URL/api/outreach/send-email" \
  -H "Origin: $GTM_ORIGIN" \
  -H "x-service-key: $S2S_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"outreachId": "gtm-test-nonexistent"}')
SEND_CODE=$(echo "$SEND_RESULT" | tail -1)
SEND_BODY=$(echo "$SEND_RESULT" | head -n -1)
if [ "$SEND_CODE" = "404" ]; then
  echo "   ✅ PASS - Returns 404 for non-existent (auth works)"
  PASS=$((PASS + 1))
elif [ "$SEND_CODE" = "401" ]; then
  echo "   ❌ FAIL - Auth failed (HTTP 401)"
  FAIL=$((FAIL + 1))
else
  echo "   ⚠️  WARN - Unexpected response: HTTP $SEND_CODE"
  echo "       Body: $SEND_BODY"
  WARN=$((WARN + 1))
fi

# Summary
echo ""
echo "==========================================="
echo " Test Summary"
echo "==========================================="
echo "   PASS: $PASS"
echo "   WARN: $WARN"
echo "   FAIL: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "✅ All critical tests passed!"
  echo ""
  echo "Next: Test from GTM frontend UI at:"
  echo "  https://gtm-yard-flow.vercel.app"
  exit 0
else
  echo "❌ $FAIL test(s) failed. Review errors above."
  exit 1
fi
