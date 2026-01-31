#!/bin/bash
set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BASE_URL=${1:-"http://localhost:3000"}
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo "🔍 Running smoke tests against: $BASE_URL"
echo ""

# Helper functions
test_endpoint() {
  local name=$1
  local url=$2
  local expected_status=$3
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  echo -n "Testing: $name ... "
  
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10 || echo "000")
  
  if [ "$status" -eq "$expected_status" ]; then
    echo -e "${GREEN}PASS${NC} (${status})"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}FAIL${NC} (got $status, expected $expected_status)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

# Test for redirect (302, 303, 307, or 308)
test_redirect() {
  local name=$1
  local url=$2
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  echo -n "Testing: $name ... "
  
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10 -L -I 2>/dev/null | head -1 | grep -oE '[0-9]{3}' | head -1 || echo "000")
  # Use follow redirects to get the chain, but check first status with manual
  first_status=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10 --max-redirs 0 2>/dev/null || echo "000")
  
  if [ "$first_status" -eq 302 ] || [ "$first_status" -eq 303 ] || [ "$first_status" -eq 307 ] || [ "$first_status" -eq 308 ]; then
    echo -e "${GREEN}PASS${NC} (redirects with ${first_status})"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}FAIL${NC} (got $first_status, expected redirect)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

# Test API returns 401 for unauthenticated requests
test_auth_required() {
  local name=$1
  local url=$2
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  echo -n "Testing: $name ... "
  
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10 || echo "000")
  
  if [ "$status" -eq 401 ]; then
    echo -e "${GREEN}PASS${NC} (401 Unauthorized)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}FAIL${NC} (got $status, expected 401)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

# Tests
echo "═══════════════════════════════════════"
echo "  Health & Infrastructure"
echo "═══════════════════════════════════════"

test_endpoint "Ping" "$BASE_URL/api/ping" 200
test_endpoint "Health" "$BASE_URL/api/health" 200

echo ""
echo "═══════════════════════════════════════"
echo "  Page Load Tests"
echo "═══════════════════════════════════════"

# Allow either 200 OK or 307 redirect for home
status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" --max-time 10 || echo "000")
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ "$status" -eq 200 ] || [ "$status" -eq 307 ]; then
  echo -e "Testing: Home page ... ${GREEN}PASS${NC} (${status})"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "Testing: Home page ... ${RED}FAIL${NC} (got $status, expected 200 or 307)"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

test_endpoint "Login page" "$BASE_URL/login" 200

echo ""
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  Auth Flow Tests (U3.1)${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

test_redirect "Dashboard redirects without auth" "$BASE_URL/dashboard"
test_redirect "Event Day redirects without auth" "$BASE_URL/dashboard/event-day"
test_redirect "Accounts redirects without auth" "$BASE_URL/dashboard/accounts"
test_endpoint "NextAuth session endpoint" "$BASE_URL/api/auth/session" 200

echo ""
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  API Security Tests (U3.2-U3.4)${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

test_auth_required "GET /api/accounts" "$BASE_URL/api/accounts"
test_auth_required "GET /api/meetings" "$BASE_URL/api/meetings"
test_auth_required "GET /api/people" "$BASE_URL/api/people"

echo ""
echo "═══════════════════════════════════════"
echo "  Summary"
echo "═══════════════════════════════════════"

echo "Total tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ All smoke tests passed!${NC}"
  exit 0
else
  echo ""
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi
