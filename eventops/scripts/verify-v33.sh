#!/bin/bash
# =============================================================================
# Sprint V33 Production Verification Script
# Verifies Railway API endpoints match RAILWAY_API_CONTRACT.md
# =============================================================================

set -eo pipefail

# Configuration
RAILWAY_URL="${RAILWAY_URL:-https://yardflow-hitlist-production-2f41.up.railway.app}"
S2S_KEY="${SERVICE_TO_SERVICE_SECRET:-}"
CRON_KEY="${CRON_SECRET:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

# Helper functions
log_pass() {
  echo -e "${GREEN}✓ $1${NC}"
  ((PASS++))
}

log_fail() {
  echo -e "${RED}✗ $1${NC}"
  ((FAIL++))
}

log_warn() {
  echo -e "${YELLOW}⚠ $1${NC}"
  ((WARN++))
}

log_info() {
  echo -e "  $1"
}

# Get auth header - prefer CRON_SECRET, fallback to S2S
get_auth_header() {
  if [[ -n "$CRON_KEY" ]]; then
    echo "Authorization: Bearer $CRON_KEY"
  elif [[ -n "$S2S_KEY" ]]; then
    echo "x-service-key: $S2S_KEY"
  else
    echo ""
  fi
}

AUTH_HEADER=$(get_auth_header)

echo "=============================================="
echo " Sprint V33 Production Verification"
echo " Railway: $RAILWAY_URL"
echo " Auth: ${AUTH_HEADER:+configured}${AUTH_HEADER:-NOT CONFIGURED}"
echo "=============================================="
echo ""

# =============================================================================
# 1. Health Check (no auth required)
# =============================================================================
echo "1. Health Check"
echo "---------------"

HEALTH=$(curl -s "$RAILWAY_URL/api/health" 2>/dev/null || echo '{"error":"connection_failed"}')

if echo "$HEALTH" | jq -e '.status' > /dev/null 2>&1; then
  STATUS=$(echo "$HEALTH" | jq -r '.status')
  
  if [[ "$STATUS" == "healthy" ]]; then
    log_pass "Health status: $STATUS"
  elif [[ "$STATUS" == "degraded" ]]; then
    log_warn "Health status: $STATUS"
  else
    log_fail "Health status: $STATUS"
  fi
  
  # Check individual components
  DB_STATUS=$(echo "$HEALTH" | jq -r '.checks.database.status // "unknown"')
  REDIS_STATUS=$(echo "$HEALTH" | jq -r '.checks.redis.status // "unknown"')
  AI_STATUS=$(echo "$HEALTH" | jq -r '.checks.ai.status // "unknown"')
  
  [[ "$DB_STATUS" == "ok" ]] && log_pass "Database: ok" || log_fail "Database: $DB_STATUS"
  [[ "$REDIS_STATUS" == "ok" ]] && log_pass "Redis: ok" || log_fail "Redis: $REDIS_STATUS"
  
  if [[ "$AI_STATUS" == "ok" ]]; then
    log_pass "AI Provider: ok"
  elif [[ "$AI_STATUS" == "degraded" ]]; then
    GEMINI_WAIT=$(echo "$HEALTH" | jq -r '.checks.ai.gemini.waitSeconds // 0')
    log_warn "AI Provider: degraded (Gemini rate limited, ${GEMINI_WAIT}s)"
  else
    log_fail "AI Provider: $AI_STATUS"
  fi
else
  log_fail "Health endpoint failed: $HEALTH"
fi

echo ""

# =============================================================================
# 2. AI Content Generation (requires auth)
# =============================================================================
echo "2. AI Content Generation"
echo "------------------------"

if [[ -z "$AUTH_HEADER" ]]; then
  log_warn "Skipping - no auth configured"
else
  # Test FreightRoll tone (should work)
  CONTENT_RESP=$(curl -s -X POST "$RAILWAY_URL/api/ai/content/generate" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d '{"type":"email","tone":"freightroll","context":{"prospectName":"Test User","companyName":"Acme Corp"}}' \
    2>/dev/null || echo '{"error":"connection_failed"}')
  
  if echo "$CONTENT_RESP" | jq -e '.subject' > /dev/null 2>&1; then
    PROVIDER=$(echo "$CONTENT_RESP" | jq -r '.provider // "unknown"')
    SUBJECT_LEN=$(echo "$CONTENT_RESP" | jq -r '.subject | length')
    log_pass "Content generation works (provider: $PROVIDER, subject: ${SUBJECT_LEN} chars)"
    
    # Verify FreightRoll branding - should NOT contain Luis
    CONTENT=$(echo "$CONTENT_RESP" | jq -r '.content // ""')
    if echo "$CONTENT" | grep -qi "luis"; then
      log_fail "Content contains 'Luis' - rebrand incomplete!"
    else
      log_pass "No 'Luis' in generated content"
    fi
  elif echo "$CONTENT_RESP" | jq -e '.error' > /dev/null 2>&1; then
    ERROR=$(echo "$CONTENT_RESP" | jq -r '.error')
    log_fail "Content generation failed: $ERROR"
  else
    log_fail "Content generation failed: unexpected response"
  fi
  
  # Test luis tone (should fail with 400)
  LUIS_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$RAILWAY_URL/api/ai/content/generate" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d '{"type":"email","tone":"luis","context":{"prospectName":"Test","companyName":"Test"}}' \
    2>/dev/null || echo "000")
  
  if [[ "$LUIS_RESP" == "400" ]]; then
    log_pass "'luis' tone correctly rejected (400)"
  elif [[ "$LUIS_RESP" == "200" ]]; then
    log_fail "'luis' tone should be rejected but returned 200"
  else
    log_warn "'luis' tone test returned HTTP $LUIS_RESP"
  fi
fi

echo ""

# =============================================================================
# 3. Email Analytics
# =============================================================================
echo "3. Email Analytics"
echo "------------------"

if [[ -z "$AUTH_HEADER" ]]; then
  log_warn "Skipping - no auth configured"
else
  ANALYTICS=$(curl -s "$RAILWAY_URL/api/email/analytics" \
    -H "$AUTH_HEADER" \
    2>/dev/null || echo '{"error":"connection_failed"}')
  
  if echo "$ANALYTICS" | jq -e '.sent' > /dev/null 2>&1; then
    SENT=$(echo "$ANALYTICS" | jq -r '.sent')
    OPEN_RATE=$(echo "$ANALYTICS" | jq -r '.openRate')
    log_pass "Analytics returns data (sent: $SENT, openRate: $OPEN_RATE)"
    
    # Verify openRate is decimal not percentage
    if [[ $(echo "$OPEN_RATE > 1" | bc -l 2>/dev/null || echo "0") -eq 1 ]]; then
      log_fail "openRate is percentage ($OPEN_RATE), should be decimal"
    else
      log_pass "openRate is decimal format"
    fi
    
    # Verify 'opens' field exists (not 'opened')
    if echo "$ANALYTICS" | jq -e '.opens' > /dev/null 2>&1; then
      log_pass "Uses 'opens' field name (correct)"
    else
      log_fail "Missing 'opens' field - using wrong field name?"
    fi
  else
    ERROR=$(echo "$ANALYTICS" | jq -r '.error // "unknown"')
    log_fail "Analytics failed: $ERROR"
  fi
fi

echo ""

# =============================================================================
# 4. People API
# =============================================================================
echo "4. People API"
echo "-------------"

if [[ -z "$AUTH_HEADER" ]]; then
  log_warn "Skipping - no auth configured"
else
  PEOPLE=$(curl -s "$RAILWAY_URL/api/people?limit=5" \
    -H "$AUTH_HEADER" \
    2>/dev/null || echo '{"error":"connection_failed"}')
  
  if echo "$PEOPLE" | jq -e '.people' > /dev/null 2>&1; then
    COUNT=$(echo "$PEOPLE" | jq '.people | length')
    TOTAL=$(echo "$PEOPLE" | jq -r '.pagination.total // 0')
    log_pass "People endpoint works (returned: $COUNT, total: $TOTAL)"
    
    # Verify pagination.total exists
    if echo "$PEOPLE" | jq -e '.pagination.total' > /dev/null 2>&1; then
      log_pass "Pagination includes total count"
    else
      log_fail "Pagination missing total count"
    fi
  else
    ERROR=$(echo "$PEOPLE" | jq -r '.error // "unknown"')
    log_fail "People API failed: $ERROR"
  fi
fi

echo ""

# =============================================================================
# 5. Sequences API
# =============================================================================
echo "5. Sequences API"
echo "----------------"

if [[ -z "$AUTH_HEADER" ]]; then
  log_warn "Skipping - no auth configured"
else
  SEQUENCES=$(curl -s "$RAILWAY_URL/api/sequences" \
    -H "$AUTH_HEADER" \
    2>/dev/null || echo '{"error":"connection_failed"}')
  
  if echo "$SEQUENCES" | jq -e '.sequences' > /dev/null 2>&1; then
    COUNT=$(echo "$SEQUENCES" | jq '.sequences | length')
    log_pass "Sequences endpoint works (count: $COUNT)"
  else
    ERROR=$(echo "$SEQUENCES" | jq -r '.error // "unknown"')
    log_fail "Sequences API failed: $ERROR"
  fi
fi

echo ""

# =============================================================================
# 6. Enrollments API
# =============================================================================
echo "6. Enrollments API"
echo "------------------"

if [[ -z "$AUTH_HEADER" ]]; then
  log_warn "Skipping - no auth configured"
else
  ENROLLMENTS=$(curl -s "$RAILWAY_URL/api/enrollments?limit=5" \
    -H "$AUTH_HEADER" \
    2>/dev/null || echo '{"error":"connection_failed"}')
  
  if echo "$ENROLLMENTS" | jq -e '.data' > /dev/null 2>&1; then
    COUNT=$(echo "$ENROLLMENTS" | jq '.data | length')
    log_pass "Enrollments endpoint works (count: $COUNT)"
    
    # Verify response format
    if echo "$ENROLLMENTS" | jq -e '.pagination.hasMore' > /dev/null 2>&1; then
      log_pass "Pagination format correct"
    else
      log_fail "Pagination format incorrect"
    fi
  else
    ERROR=$(echo "$ENROLLMENTS" | jq -r '.error // "unknown"')
    log_fail "Enrollments API failed: $ERROR"
  fi
fi

echo ""

# =============================================================================
# Summary
# =============================================================================
echo "=============================================="
echo " Summary"
echo "=============================================="
echo -e " ${GREEN}Passed:${NC} $PASS"
echo -e " ${RED}Failed:${NC} $FAIL"
echo -e " ${YELLOW}Warnings:${NC} $WARN"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}VERIFICATION FAILED${NC}"
  exit 1
elif [[ $WARN -gt 0 ]]; then
  echo -e "${YELLOW}VERIFICATION PASSED WITH WARNINGS${NC}"
  exit 0
else
  echo -e "${GREEN}VERIFICATION PASSED${NC}"
  exit 0
fi
