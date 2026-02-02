#!/bin/bash
# scripts/test-email-pipeline.sh
# Complete email pipeline test - tests S2S auth and email sending
#
# Usage:
#   SERVICE_TO_SERVICE_SECRET=xxx CRON_SECRET=yyy ./scripts/test-email-pipeline.sh
#   Or create .env.test with these values and: source .env.test && ./scripts/test-email-pipeline.sh

BACKEND_URL="${BACKEND_URL:-https://yardflow-hitlist-production-2f41.up.railway.app}"
S2S_SECRET="${SERVICE_TO_SERVICE_SECRET}"
CRON_KEY="${CRON_SECRET}"
TEST_EMAIL="${TEST_EMAIL:-casey@freightroll.com}"

echo "==========================================="
echo " YardFlow Email Pipeline Test"
echo "==========================================="
echo "Backend: $BACKEND_URL"
echo "Test Email: $TEST_EMAIL"
echo ""

# Check required secrets
MISSING=""
if [ -z "$S2S_SECRET" ]; then
  MISSING="$MISSING SERVICE_TO_SERVICE_SECRET"
fi
if [ -z "$CRON_KEY" ]; then
  MISSING="$MISSING CRON_SECRET"
fi

if [ -n "$MISSING" ]; then
  echo "❌ Missing required environment variables:$MISSING"
  echo ""
  echo "Usage:"
  echo "  SERVICE_TO_SERVICE_SECRET=xxx CRON_SECRET=yyy ./scripts/test-email-pipeline.sh"
  echo ""
  exit 1
fi

PASS=0
FAIL=0

# Test 1: Health Check
echo "1. Health Check..."
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/health")
if [ "$HEALTH_CODE" = "200" ]; then
  echo "   ✅ PASS - Backend healthy (HTTP 200)"
  PASS=$((PASS + 1))
else
  echo "   ❌ FAIL - Backend unhealthy (HTTP $HEALTH_CODE)"
  FAIL=$((FAIL + 1))
fi

# Test 2: S2S Auth with x-service-key
echo "2. S2S Authentication (x-service-key)..."
S2S_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/accounts" \
  -H "x-service-key: $S2S_SECRET")
if [ "$S2S_CODE" = "200" ]; then
  echo "   ✅ PASS - S2S auth works (HTTP 200)"
  PASS=$((PASS + 1))
else
  echo "   ❌ FAIL - S2S auth failed (HTTP $S2S_CODE)"
  FAIL=$((FAIL + 1))
fi

# Test 3: S2S Auth with Bearer token
echo "3. S2S Authentication (Bearer token)..."
BEARER_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/accounts" \
  -H "Authorization: Bearer $CRON_KEY")
if [ "$BEARER_CODE" = "200" ]; then
  echo "   ✅ PASS - Bearer auth works (HTTP 200)"
  PASS=$((PASS + 1))
else
  echo "   ❌ FAIL - Bearer auth failed (HTTP $BEARER_CODE)"
  FAIL=$((FAIL + 1))
fi

# Test 4: Email Stats Endpoint
echo "4. Email Stats Endpoint..."
STATS_RESULT=$(curl -s "$BACKEND_URL/api/email/stats" \
  -H "Authorization: Bearer $CRON_KEY")
if echo "$STATS_RESULT" | grep -q "totalSent"; then
  TOTAL_SENT=$(echo "$STATS_RESULT" | grep -o '"totalSent":[0-9]*' | cut -d: -f2)
  echo "   ✅ PASS - Email stats accessible (totalSent: $TOTAL_SENT)"
  PASS=$((PASS + 1))
else
  echo "   ❌ FAIL - Email stats failed: $STATS_RESULT"
  FAIL=$((FAIL + 1))
fi

# Test 5: Send Test Email
echo "5. Send Test Email..."
TEST_RESULT=$(curl -s -X POST "$BACKEND_URL/api/email/test" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRON_KEY" \
  -d "{\"to\": \"$TEST_EMAIL\"}")

if echo "$TEST_RESULT" | grep -q '"success":true'; then
  MSG_ID=$(echo "$TEST_RESULT" | grep -o '"messageId":"[^"]*"' | cut -d'"' -f4)
  echo "   ✅ PASS - Test email sent (messageId: $MSG_ID)"
  PASS=$((PASS + 1))
  echo ""
  echo "   📬 Check $TEST_EMAIL inbox (including spam folder)"
elif echo "$TEST_RESULT" | grep -q "SendGrid not configured"; then
  echo "   ❌ FAIL - SendGrid not configured in Railway"
  echo "   Response: $TEST_RESULT"
  FAIL=$((FAIL + 1))
else
  echo "   ❌ FAIL - Test email failed"
  echo "   Response: $TEST_RESULT"
  FAIL=$((FAIL + 1))
fi

# Summary
echo ""
echo "==========================================="
echo " Summary"
echo "==========================================="
echo "Passed: $PASS / $((PASS + FAIL))"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "❌ SOME TESTS FAILED"
  exit 1
else
  echo "✅ ALL TESTS PASSED"
  echo ""
  echo "Next Steps:"
  echo "  1. Verify test email arrived in inbox"
  echo "  2. Test sending via outreach ID:"
  echo "     curl -X POST '$BACKEND_URL/api/outreach/send-email' \\"
  echo "       -H 'Authorization: Bearer YOUR_CRON_SECRET' \\"
  echo "       -H 'Content-Type: application/json' \\"
  echo "       -d '{\"outreachId\": \"YOUR_OUTREACH_ID\"}'"
  exit 0
fi
