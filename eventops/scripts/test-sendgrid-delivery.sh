#!/bin/bash
# Test SendGrid email delivery
# Usage: ./scripts/test-sendgrid-delivery.sh [test_email]

set -e

BASE_URL="${RAILWAY_URL:-https://yardflow-hitlist-production-2f41.up.railway.app}"
S2S_KEY="${SERVICE_TO_SERVICE_SECRET:-s2s_yf_9d8f7a6c2b3e4f5a1d2c3b4e5f6a7b8c}"
TEST_EMAIL="${1:-casey@freightroll.com}"

echo "=== SendGrid Delivery Test ==="
echo "Base URL: $BASE_URL"
echo "Test Email: $TEST_EMAIL"
echo ""

# Check health first
echo "1. Checking health..."
HEALTH=$(curl -s "$BASE_URL/api/health")
EMAIL_STATUS=$(echo "$HEALTH" | jq -r '.checks.email.status')
if [ "$EMAIL_STATUS" != "ok" ]; then
  echo "❌ Email health check failed: $EMAIL_STATUS"
  echo "$HEALTH" | jq '.checks.email'
  exit 1
fi
echo "✅ Email health: ok"
echo ""

# Check for test prospect or create context
echo "2. Checking SendGrid configuration..."
CONFIG_CHECK=$(curl -s "$BASE_URL/api/health" | jq '.checks.environment')
echo "Environment: $CONFIG_CHECK"
echo ""

echo "3. Testing email endpoint accessibility..."
AUTH_CHECK=$(curl -s -w "%{http_code}" -o /tmp/email_auth_check.json \
  "$BASE_URL/api/outreach/send-email" \
  -H "x-service-key: $S2S_KEY" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{}')

if [ "$AUTH_CHECK" = "401" ]; then
  echo "❌ Authentication failed - check S2S key"
  exit 1
fi
echo "✅ Authentication working (got $AUTH_CHECK, expected 400 for empty body)"
echo ""

echo "=== Manual Verification Required ==="
echo ""
echo "To complete SendGrid verification:"
echo ""
echo "1. Go to SendGrid Dashboard → Settings → Sender Authentication"
echo "2. Verify your sending domain has:"
echo "   - SPF record configured"
echo "   - DKIM records configured"  
echo "   - Domain verified status: ✅"
echo ""
echo "3. To test actual email delivery, you need a valid personId."
echo "   Create a test prospect first, then use:"
echo ""
echo "   curl -X POST '$BASE_URL/api/outreach/send-email' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'x-service-key: $S2S_KEY' \\"
echo "     -d '{\"personId\":\"YOUR_PERSON_ID\",\"subject\":\"Test\",\"content\":\"Hello\"}'"
echo ""
echo "4. Check the recipient inbox (not spam folder)"
echo ""
echo "=== Test Complete ==="
