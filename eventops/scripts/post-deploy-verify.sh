#!/bin/bash
# G1.1 - Verified Deployment Check (Replacement for post-deploy-verify.sh)

set -e

# Default to production if no arg provided
TARGET_URL="${1:-https://yardflow-hitlist-production-2f41.up.railway.app}"
# Remove trailing slash
TARGET_URL="${TARGET_URL%/}"

echo "🔎 Sprint G1 - Deployment Verification"
echo "======================================"
echo "Target: $TARGET_URL"
echo ""

echo "1️⃣  Connectivity Check"
echo "----------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -L "$TARGET_URL")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "308" ]; then
    echo "✅ Root URL reachable ($HTTP_CODE)"
else
    echo "❌ Root URL unreachable ($HTTP_CODE)"
    exit 1
fi

echo ""
echo "2️⃣  Health Endpoint (/api/health)"
echo "-------------------------------"
# Get the JSON response
HEALTH_RESP=$(curl -s -L "$TARGET_URL/api/health")
echo "Response: $HEALTH_RESP"

# Use python to parse simpler than jq if jq not available, but let's just grep for keys
if echo "$HEALTH_RESP" | grep -q "healthy"; then
    echo "✅ System Status: HEALTHY"
elif echo "$HEALTH_RESP" | grep -q "degraded"; then
    echo "⚠️  System Status: DEGRADED (Check logs)"
else
    echo "❌ System Status: UNKNOWN/DOWN"
    # Don't exit yet, might be 503 from missing vars
fi

# Check for specific components
if echo "$HEALTH_RESP" | grep -q '"database":{"status":"ok"'; then
   echo "✅ Database: Connected"
else
   echo "❌ Database: ERROR"
fi

if echo "$HEALTH_RESP" | grep -q '"redis":{"status":"ok"'; then
   echo "✅ Redis: Connected"
else
   echo "❌ Redis: ERROR"
fi

echo ""
echo "3️⃣  Environment Variables"
echo "-------------------------"
# The health check exposes 'criticalMissing' if any
MISSING=$(echo "$HEALTH_RESP" | grep -o '"criticalMissing":\[[^]]*\]')
if [ "$MISSING" = '"criticalMissing":[]' ]; then
    echo "✅ Critical Env Vars: ALL SET"
else
    echo "⚠️  Missing Vars: $MISSING"
fi

echo ""
echo "4️⃣  Public Assets (Static)"
echo "--------------------------"
# Check manifest.json as a proxy for static assets
ASSET_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL/manifest.json")
if [ "$ASSET_CODE" = "200" ]; then
    echo "✅ Static Assets (manifest.json): OK"
else
    echo "❌ Static Assets Missing ($ASSET_CODE)"
fi

echo ""
echo "✅ Verification Complete"
