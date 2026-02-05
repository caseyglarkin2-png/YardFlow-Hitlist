#!/bin/bash
# =============================================================================
# Sprint 34 Production Verification Script
# Run after Railway deploy to verify email sending and webhook configuration
# =============================================================================

set -e

# Configuration - set these before running
RAILWAY_URL="${RAILWAY_URL:-https://yardflow-hitlist-production-2f41.up.railway.app}"
CRON_SECRET="${CRON_SECRET:-}"
SERVICE_SECRET="${SERVICE_TO_SERVICE_SECRET:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=============================================="
echo "Sprint 34 Production Verification"
echo "Railway URL: $RAILWAY_URL"
echo "=============================================="

# Check required env vars
if [ -z "$CRON_SECRET" ] && [ -z "$SERVICE_SECRET" ]; then
  echo -e "${RED}ERROR: Set CRON_SECRET or SERVICE_TO_SERVICE_SECRET${NC}"
  echo "Usage: CRON_SECRET=xxx ./scripts/verify-v34-email.sh"
  exit 1
fi

# Use whichever secret is available
if [ -n "$CRON_SECRET" ]; then
  AUTH_HEADER="Authorization: Bearer $CRON_SECRET"
else
  AUTH_HEADER="x-service-key: $SERVICE_SECRET"
fi

# =============================================================================
# Test 1: Health Check
# =============================================================================
echo ""
echo "1. Health Check..."
HEALTH=$(curl -s "$RAILWAY_URL/api/health" | jq -r '.status')
if [ "$HEALTH" = "healthy" ]; then
  echo -e "${GREEN}✓ Health: $HEALTH${NC}"
else
  echo -e "${RED}✗ Health: $HEALTH${NC}"
  exit 1
fi

# =============================================================================
# Test 2: Email Service Health
# =============================================================================
echo ""
echo "2. Email Service Health..."
EMAIL_HEALTH=$(curl -s "$RAILWAY_URL/api/email/health" \
  -H "$AUTH_HEADER" | jq -r '.status')
if [ "$EMAIL_HEALTH" = "healthy" ] || [ "$EMAIL_HEALTH" = "degraded" ]; then
  echo -e "${GREEN}✓ Email Service: $EMAIL_HEALTH${NC}"
  
  # Check SendGrid config
  SENDGRID_STATUS=$(curl -s "$RAILWAY_URL/api/email/health" \
    -H "$AUTH_HEADER" | jq -r '.checks.sendgrid.status')
  echo "  SendGrid Status: $SENDGRID_STATUS"
else
  echo -e "${RED}✗ Email Service: $EMAIL_HEALTH${NC}"
fi

# =============================================================================
# Test 3: Templates Endpoint (T34D.2 debug)
# =============================================================================
echo ""
echo "3. Templates Endpoint (T34D.2)..."
TEMPLATES_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/api/templates" \
  -H "$AUTH_HEADER")
if [ "$TEMPLATES_STATUS" = "200" ]; then
  echo -e "${GREEN}✓ GET /api/templates: HTTP $TEMPLATES_STATUS${NC}"
else
  echo -e "${RED}✗ GET /api/templates: HTTP $TEMPLATES_STATUS${NC}"
  echo "  Debug: Check if frontend is sending correct auth header"
fi

# =============================================================================
# Test 4: Outreach POST Endpoint
# =============================================================================
echo ""
echo "4. Outreach POST Endpoint..."
OUTREACH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/api/outreach" \
  -X POST \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"personId":"test","channel":"EMAIL","message":"test"}')
# 400/404 is ok (validation error), 401/403 is auth problem
if [ "$OUTREACH_STATUS" = "200" ] || [ "$OUTREACH_STATUS" = "201" ] || [ "$OUTREACH_STATUS" = "400" ] || [ "$OUTREACH_STATUS" = "404" ]; then
  echo -e "${GREEN}✓ POST /api/outreach: HTTP $OUTREACH_STATUS (auth working)${NC}"
else
  echo -e "${RED}✗ POST /api/outreach: HTTP $OUTREACH_STATUS${NC}"
fi

# =============================================================================
# Test 5: Outreach Activity Endpoint
# =============================================================================
echo ""
echo "5. Outreach Activity Endpoint..."
ACTIVITY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/api/outreach/activity" \
  -X POST \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"outreachId":"test","type":"OPENED"}')
# 400/404 is ok, 401/403 is auth problem
if [ "$ACTIVITY_STATUS" = "200" ] || [ "$ACTIVITY_STATUS" = "400" ] || [ "$ACTIVITY_STATUS" = "404" ]; then
  echo -e "${GREEN}✓ POST /api/outreach/activity: HTTP $ACTIVITY_STATUS (auth working)${NC}"
else
  echo -e "${RED}✗ POST /api/outreach/activity: HTTP $ACTIVITY_STATUS${NC}"
fi

# =============================================================================
# Test 6: Direct Email Send (requires valid prospect)
# =============================================================================
echo ""
echo "6. Direct Email Send Test..."
echo -e "${YELLOW}   Skipping - requires valid prospectId${NC}"
echo "   To test manually:"
echo "   curl -X POST '$RAILWAY_URL/api/email/send' \\"
echo "     -H '$AUTH_HEADER' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"to\":\"your@email.com\",\"subject\":\"V34 Test\",\"htmlBody\":\"<p>Test</p>\"}'"

# =============================================================================
# Test 7: SendGrid Webhook Endpoint
# =============================================================================
echo ""
echo "7. SendGrid Webhook Endpoint..."
WEBHOOK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/api/webhooks/sendgrid" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '[{"event":"test","email":"test@example.com","timestamp":1234567890,"sg_message_id":"test"}]')
# 200 is good, 403 means verification key required, 500 is processing error
if [ "$WEBHOOK_STATUS" = "200" ]; then
  echo -e "${GREEN}✓ POST /api/webhooks/sendgrid: HTTP $WEBHOOK_STATUS${NC}"
elif [ "$WEBHOOK_STATUS" = "403" ]; then
  echo -e "${YELLOW}! POST /api/webhooks/sendgrid: HTTP $WEBHOOK_STATUS (signature verification enabled)${NC}"
else
  echo -e "${RED}✗ POST /api/webhooks/sendgrid: HTTP $WEBHOOK_STATUS${NC}"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "=============================================="
echo "Verification Complete"
echo "=============================================="
echo ""
echo "Next Steps:"
echo "1. If templates returns 403 from frontend, check GTM-YardFlow headers"
echo "2. Register SendGrid webhook URL: $RAILWAY_URL/api/webhooks/sendgrid"
echo "3. Test email send with real outreach record"
