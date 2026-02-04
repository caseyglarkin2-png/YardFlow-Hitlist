#!/bin/bash
# Test AI content generation E2E
# Usage: ./test-ai-content.sh [BACKEND_URL]

set -e

# Configuration
BACKEND_URL="${1:-https://yardflow-hitlist-production-2f41.up.railway.app}"
S2S_SECRET="${SERVICE_TO_SERVICE_SECRET:-s2s_yf_9d8f7a6c2b3e4f5a1d2c3b4e5f6a7b8c}"

echo "🤖 AI Content E2E Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Backend: $BACKEND_URL"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Test 1: Check AI health first
echo "📋 Test 1: AI Provider Health Check"
echo "────────────────────────────────────"

HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/api/health" 2>/dev/null || echo '{"error":"connection failed"}')

if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
    echo -e "${GREEN}✓ Health endpoint OK${NC}"
    
    # Extract AI status
    AI_STATUS=$(echo "$HEALTH_RESPONSE" | grep -o '"ai":{[^}]*}' | head -1 || echo "not found")
    echo "  AI Status: $AI_STATUS"
else
    echo -e "${YELLOW}⚠ Health endpoint degraded or unreachable${NC}"
    echo "  Response: $(echo "$HEALTH_RESPONSE" | head -c 200)"
fi
echo ""

# Test 2: Generate email content (legitimate business use case)
echo "📋 Test 2: Generate Email Content"
echo "────────────────────────────────────"

PAYLOAD='{
  "companyName": "Test Logistics Inc",
  "personName": "John Smith",
  "context": {
    "eventName": "Manifest 2026",
    "eventLocation": "Las Vegas",
    "companySize": "500 employees"
  },
  "tone": "professional",
  "messageType": "email_initial",
  "options": {
    "includeCalendly": true,
    "maxLength": 200
  }
}'

echo "Request payload:"
echo "$PAYLOAD" | head -10
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$BACKEND_URL/api/ai/content/generate" \
  -H "Content-Type: application/json" \
  -H "x-service-key: $S2S_SECRET" \
  -d "$PAYLOAD" 2>/dev/null)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Content generated successfully!${NC}"
    echo ""
    echo "Response:"
    echo "$BODY" | head -20
    
    # Check if fallback was used
    if echo "$BODY" | grep -q '"fallbackUsed":true'; then
        echo -e "${YELLOW}⚠ OpenAI fallback was used (Gemini may be rate limited)${NC}"
    fi
    
    # Check provider
    PROVIDER=$(echo "$BODY" | grep -o '"provider":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$PROVIDER" ]; then
        echo "  Provider used: $PROVIDER"
    fi
elif [ "$HTTP_CODE" = "429" ]; then
    echo -e "${YELLOW}⚠ Rate limited - both providers exhausted${NC}"
    echo "  Response: $BODY"
    echo ""
    echo "  Action: Add OPENAI_API_KEY to Railway env vars for fallback"
elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "${RED}✗ Authentication failed${NC}"
    echo "  Check SERVICE_TO_SERVICE_SECRET env var"
elif [ "$HTTP_CODE" = "500" ]; then
    echo -e "${RED}✗ Internal server error${NC}"
    echo "  Response: $BODY"
else
    echo -e "${RED}✗ Unexpected response${NC}"
    echo "  Response: $BODY"
fi
echo ""

# Test 3: Test with different tones
echo "📋 Test 3: Multi-tone Generation"
echo "────────────────────────────────────"

for TONE in "friendly" "direct" "consultative"; do
    echo -n "  Testing tone '$TONE': "
    
    TONE_PAYLOAD=$(cat <<EOF
{
  "companyName": "Acme Freight",
  "personName": "Jane Doe",
  "context": {"eventName": "Manifest 2026"},
  "tone": "$TONE",
  "messageType": "email_initial"
}
EOF
)

    TONE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "$BACKEND_URL/api/ai/content/generate" \
      -H "Content-Type: application/json" \
      -H "x-service-key: $S2S_SECRET" \
      -d "$TONE_PAYLOAD" 2>/dev/null)
    
    if [ "$TONE_RESPONSE" = "200" ]; then
        echo -e "${GREEN}✓ OK${NC}"
    elif [ "$TONE_RESPONSE" = "429" ]; then
        echo -e "${YELLOW}rate limited${NC}"
    else
        echo -e "${RED}failed ($TONE_RESPONSE)${NC}"
    fi
done
echo ""

# Test 4: Check request ID header
echo "📋 Test 4: Request ID Propagation"
echo "────────────────────────────────────"

HEADERS=$(curl -s -I "$BACKEND_URL/api/health" 2>/dev/null | grep -i "x-request-id" || echo "")

if [ -n "$HEADERS" ]; then
    echo -e "${GREEN}✓ Request ID header present${NC}"
    echo "  $HEADERS"
else
    echo -e "${YELLOW}⚠ Request ID header not found${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏁 E2E Test Complete"
echo ""
echo "Next steps if tests failed:"
echo "  1. Check Railway logs: railway logs"
echo "  2. Verify env vars: GEMINI_API_KEY, OPENAI_API_KEY"
echo "  3. Check /api/health for detailed status"
