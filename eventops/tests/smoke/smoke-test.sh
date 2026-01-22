#!/bin/bash
set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
  
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
  
  if [ "$status" -eq "$expected_status" ]; then
    echo -e "${GREEN}PASS${NC} (${status})"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}FAIL${NC} (got $status, expected $expected_status)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

# Tests
echo "═══════════════════════════════════════"
echo "  Health & Page Load Tests"
echo "═══════════════════════════════════════"

# Allow either 200 OK or 307 redirect for home
status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" || echo "000")
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
