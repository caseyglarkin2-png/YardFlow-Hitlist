#!/bin/bash
# scripts/test-s2s-auth-prod.sh
# Tests S2S authentication against production Railway backend
#
# Usage:
#   SERVICE_TO_SERVICE_SECRET=xxx ./scripts/test-s2s-auth-prod.sh
#   Or set the secret in .env and source it first

BACKEND_URL="${BACKEND_URL:-https://yardflow-hitlist-production-2f41.up.railway.app}"
S2S_SECRET="${SERVICE_TO_SERVICE_SECRET}"
GTM_ORIGIN="https://gtm-yard-flow.vercel.app"

echo "==========================================="
echo " S2S Authentication Test"
echo "==========================================="
echo "Backend: $BACKEND_URL"
echo ""

if [ -z "$S2S_SECRET" ]; then
  echo "❌ SERVICE_TO_SERVICE_SECRET not set"
  echo ""
  echo "Usage: SERVICE_TO_SERVICE_SECRET=your-secret ./scripts/test-s2s-auth-prod.sh"
  exit 1
fi

# Test 1: Should fail without key
echo "Test 1: Without auth (expect 401)..."
RESULT=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/accounts")
if [ "$RESULT" = "401" ]; then
  echo "   ✅ PASS - HTTP $RESULT"
else
  echo "   ❌ FAIL - Expected 401, got $RESULT"
fi

# Test 2: Should succeed with x-service-key
echo "Test 2: With x-service-key header..."
RESULT=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/accounts" \
  -H "x-service-key: $S2S_SECRET")
if [ "$RESULT" = "200" ]; then
  echo "   ✅ PASS - HTTP $RESULT"
else
  echo "   ❌ FAIL - Expected 200, got $RESULT"
fi

# Test 3: CORS preflight with GTM origin
echo "Test 3: CORS preflight from GTM origin..."
CORS=$(curl -s -I -X OPTIONS "$BACKEND_URL/api/accounts" \
  -H "Origin: $GTM_ORIGIN" 2>&1 | grep -i "access-control-allow-origin")
if echo "$CORS" | grep -qi "$GTM_ORIGIN"; then
  echo "   ✅ PASS - CORS allows GTM"
else
  echo "   ❌ FAIL - CORS not configured"
fi

# Test 4: Full request with GTM headers
echo "Test 4: Full request simulating GTM frontend..."
RESULT=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/accounts" \
  -H "Origin: $GTM_ORIGIN" \
  -H "x-service-key: $S2S_SECRET" \
  -H "Content-Type: application/json")
if [ "$RESULT" = "200" ]; then
  echo "   ✅ PASS - GTM simulation successful (HTTP $RESULT)"
else
  echo "   ❌ FAIL - Expected 200, got $RESULT"
fi

echo ""
echo "==========================================="
echo " Test Complete"
echo "==========================================="
