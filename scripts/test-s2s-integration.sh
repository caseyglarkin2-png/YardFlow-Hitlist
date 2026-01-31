#!/bin/bash
#
# S2S (Service-to-Service) Integration Test
# Sprint U4 - Platform Integration Validation
#
# Tests CORS preflight and S2S auth from external origin
#
# Usage: ./test-s2s-integration.sh [service_secret]
# 
# If SERVICE_TO_SERVICE_SECRET is not provided, only public endpoints are tested.

set -e

PROD_URL="${RAILWAY_URL:-https://yardflow-hitlist-production-2f41.up.railway.app}"
SERVICE_KEY="${1:-$SERVICE_TO_SERVICE_SECRET}"
ORIGIN="https://gtm-yard-flow.vercel.app"

echo "=========================================="
echo "  S2S Integration Test"
echo "=========================================="
echo "Target: $PROD_URL"
echo "Origin: $ORIGIN"
echo ""

PASSED=0
FAILED=0

# Helper function
test_result() {
    if [ "$1" = "pass" ]; then
        echo "✅ $2"
        PASSED=$((PASSED + 1))
    else
        echo "❌ $2"
        FAILED=$((FAILED + 1))
    fi
}

# ============================================
# Test 1: Health Check (Public)
# ============================================
echo "--- Test 1: Health Check ---"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/health")
if [ "$HEALTH" = "200" ]; then
    test_result "pass" "Health check returns 200"
else
    test_result "fail" "Health check returns $HEALTH (expected 200)"
fi

# ============================================
# Test 2: CORS Preflight
# ============================================
echo ""
echo "--- Test 2: CORS Preflight ---"

PREFLIGHT=$(curl -s -i -X OPTIONS \
    -H "Origin: $ORIGIN" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: x-service-key,x-user-id" \
    "$PROD_URL/api/accounts" 2>&1)

# Check for CORS headers
if echo "$PREFLIGHT" | grep -qi "access-control-allow-origin"; then
    test_result "pass" "CORS preflight returns Access-Control-Allow-Origin"
else
    test_result "fail" "CORS preflight missing Access-Control-Allow-Origin"
fi

if echo "$PREFLIGHT" | grep -qi "access-control-allow-headers.*x-service-key"; then
    test_result "pass" "CORS allows x-service-key header"
else
    test_result "fail" "CORS does not allow x-service-key header"
fi

if echo "$PREFLIGHT" | grep -qi "access-control-allow-credentials.*true"; then
    test_result "pass" "CORS allows credentials"
else
    test_result "fail" "CORS does not allow credentials"
fi

# ============================================
# Test 3: S2S Authentication
# ============================================
echo ""
echo "--- Test 3: S2S Authentication ---"

if [ -z "$SERVICE_KEY" ]; then
    echo "⚠️  Skipping S2S auth test (no SERVICE_TO_SERVICE_SECRET provided)"
    echo "   Set SERVICE_TO_SERVICE_SECRET env var or pass as argument"
else
    # Test with valid S2S key
    S2S_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "x-service-key: $SERVICE_KEY" \
        -H "x-user-id: test@integration.com" \
        -H "Origin: $ORIGIN" \
        "$PROD_URL/api/accounts")
    
    if [ "$S2S_RESPONSE" = "200" ]; then
        test_result "pass" "S2S auth with valid key returns 200"
    else
        test_result "fail" "S2S auth returns $S2S_RESPONSE (expected 200)"
    fi
    
    # Test with invalid S2S key
    INVALID_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "x-service-key: invalid-key-12345" \
        -H "x-user-id: test@integration.com" \
        -H "Origin: $ORIGIN" \
        "$PROD_URL/api/accounts")
    
    if [ "$INVALID_RESPONSE" = "401" ]; then
        test_result "pass" "Invalid S2S key correctly rejected (401)"
    else
        test_result "fail" "Invalid S2S key returns $INVALID_RESPONSE (expected 401)"
    fi
fi

# ============================================
# Test 4: Protected Routes Without Auth
# ============================================
echo ""
echo "--- Test 4: Protected Routes (No Auth) ---"

UNAUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Origin: $ORIGIN" \
    "$PROD_URL/api/accounts")

if [ "$UNAUTH_RESPONSE" = "401" ]; then
    test_result "pass" "Protected route returns 401 without auth"
elif [ "$UNAUTH_RESPONSE" = "307" ] || [ "$UNAUTH_RESPONSE" = "302" ]; then
    test_result "pass" "Protected route redirects to login without auth"
else
    test_result "fail" "Protected route returns $UNAUTH_RESPONSE (expected 401 or redirect)"
fi

# ============================================
# Summary
# ============================================
echo ""
echo "=========================================="
echo "  Results"
echo "=========================================="
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "✅ All S2S integration tests passed!"
    exit 0
else
    echo "❌ Some tests failed. Check output above."
    exit 1
fi
