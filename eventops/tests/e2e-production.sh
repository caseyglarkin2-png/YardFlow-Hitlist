#!/bin/bash
# Sprint 30 - End-to-End Production Test Suite
# Tests all critical functionality after Railway setup is complete

set -e

PROD_URL="${1:-https://yardflow-hitlist-production.up.railway.app}"
echo "🧪 Testing YardFlow Hitlist Production"
echo "URL: $PROD_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass_count=0
fail_count=0

# Test function
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"
    local check_text="$4"
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo "000")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_code" ]; then
        if [ -n "$check_text" ]; then
            if echo "$body" | grep -q "$check_text"; then
                echo -e "${GREEN}✓ PASS${NC}"
                ((pass_count++))
                return 0
            else
                echo -e "${RED}✗ FAIL${NC} (missing: $check_text)"
                ((fail_count++))
                return 1
            fi
        else
            echo -e "${GREEN}✓ PASS${NC}"
            ((pass_count++))
            return 0
        fi
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code, expected $expected_code)"
        ((fail_count++))
        return 1
    fi
}

# TEST 1: Site is up
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 CONNECTIVITY TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Root URL" "$PROD_URL" "307"
test_endpoint "Login redirect" "$PROD_URL/login" "200"
echo ""

# TEST 2: Health Endpoint
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💚 HEALTH CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Health endpoint" "$PROD_URL/api/health" "200" "status"

# Check health details
health_response=$(curl -s "$PROD_URL/api/health" 2>/dev/null)
echo ""
echo "Health Check Details:"
echo "$health_response" | jq '.' 2>/dev/null || echo "$health_response"
echo ""

# Extract statuses
db_status=$(echo "$health_response" | jq -r '.checks.database // "unknown"' 2>/dev/null)
redis_status=$(echo "$health_response" | jq -r '.checks.redis // "unknown"' 2>/dev/null)
overall_status=$(echo "$health_response" | jq -r '.status // "unknown"' 2>/dev/null)

echo "System Status: $overall_status"
echo "  Database: $db_status"
echo "  Redis: $redis_status"
echo ""

# TEST 3: Static Pages
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 STATIC PAGES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Login page" "$PROD_URL/login" "200" "Sign in"
test_endpoint "404 page" "$PROD_URL/nonexistent" "404"
echo ""

# TEST 4: API Routes (Unauthenticated)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 AUTHENTICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Protected API (should reject)" "$PROD_URL/api/accounts" "401" "Unauthorized"
test_endpoint "Protected dashboard (should redirect)" "$PROD_URL/dashboard" "307"
echo ""

# TEST 5: Check if seed data exists (requires manual verification)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌱 SEED DATA VERIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  Manual verification required:"
echo ""
echo "1. Login Test:"
echo "   URL: $PROD_URL/login"
echo "   Email: admin@yardflow.com"
echo "   Password: YardFlow2026!"
echo ""
echo "2. After login, verify:"
echo "   ✓ Dashboard loads without errors"
echo "   ✓ See 5 target accounts"
echo "   ✓ See 10 contacts"
echo "   ✓ ICP scores displayed"
echo "   ✓ Campaign: 'Manifest 2026 - VP+ Outreach'"
echo "   ✓ Sequence: 'Manifest Exec - 5 Touch'"
echo ""

# TEST 6: Build artifacts
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 BUILD VERIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Next.js build" "$PROD_URL/_next/static/css" "200"
echo ""

# TEST 7: Worker status (if Redis provisioned)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚙️  WORKER STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$redis_status" = "healthy" ]; then
    echo -e "${GREEN}✓${NC} Redis connected - worker can process jobs"
    ((pass_count++))
else
    echo -e "${YELLOW}⚠${NC}  Redis status: $redis_status"
    echo "   Complete TASK 30.5 to provision Redis"
    echo "   Then complete TASK 30.6 to deploy worker"
fi
echo ""

# TEST 8: Environment variables check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 CONFIGURATION CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Deployment successful"
echo "✓ Health endpoint responding"
echo ""
echo "Verify in Railway dashboard:"
echo "  □ DATABASE_URL (PostgreSQL)"
echo "  □ REDIS_URL (after TASK 30.5)"
echo "  □ AUTH_SECRET (NextAuth)"
echo "  □ GOOGLE_CLIENT_ID (OAuth)"
echo "  □ GOOGLE_CLIENT_SECRET (OAuth)"
echo "  □ CRON_SECRET (after TASK 30.7)"
echo "  □ SENDGRID_API_KEY (optional, after TASK 30.7)"
echo "  □ GEMINI_API_KEY (optional, after TASK 30.7)"
echo ""

# SUMMARY
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
total_tests=$((pass_count + fail_count))
echo "Tests Run: $total_tests"
echo -e "Passed: ${GREEN}$pass_count${NC}"
echo -e "Failed: ${RED}$fail_count${NC}"
echo ""

if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}🎉 All automated tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Complete manual login test (see SEED DATA section above)"
    echo "2. If not done: Complete TASK 30.5 (Provision Redis)"
    echo "3. If not done: Complete TASK 30.6 (Deploy Worker)"
    echo "4. If not done: Complete TASK 30.7 (Set Environment Variables)"
    echo "5. Run seed: railway run npx prisma db seed"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "Check Railway logs for details:"
    echo "  railway logs -s yardflow-hitlist-production"
    echo ""
    exit 1
fi
