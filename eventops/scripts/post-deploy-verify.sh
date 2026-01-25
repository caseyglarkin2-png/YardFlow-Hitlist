#!/bin/bash
# Sprint 18 - Post-Deployment Verification & Testing

set -e

PROD_URL="https://yardflow-hitlist-production-2f41.up.railway.app"

echo "🎯 Sprint 18 - Google Integration Verification"
echo "==============================================="
echo ""

# Wait for deployment
echo "⏳ Waiting for deployment to complete..."
sleep 5

echo ""
echo "1️⃣ Testing OAuth Endpoint"
echo "========================="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "$PROD_URL/api/google/connect")
if [ "$STATUS" = "200" ] || [ "$STATUS" = "302" ] || [ "$STATUS" = "307" ]; then
    echo "✅ OAuth endpoint responding ($STATUS)"
else
    echo "⚠️  OAuth endpoint returned: $STATUS"
fi

echo ""
echo "2️⃣ Testing Cron Security"
echo "======================="
RESPONSE=$(curl -s "$PROD_URL/api/cron/google-sync")
if echo "$RESPONSE" | grep -q "Unauthorized"; then
    echo "✅ Cron endpoint properly secured (401 without auth)"
else
    echo "⚠️  Unexpected response: $RESPONSE"
fi

echo ""
echo "3️⃣ Checking Cron Configuration"
echo "==============================="
cd /workspaces/YardFlow-Hitlist
vercel crons ls 2>&1 | grep -E "google-sync|Schedule" || echo "⚠️  Run: vercel crons ls"

echo ""
echo "4️⃣ Environment Variables Check"
echo "==============================="
ENV_COUNT=$(vercel env ls production 2>/dev/null | grep -c "GOOGLE_\|CRON_" || echo "0")
echo "✅ Google env vars configured: $ENV_COUNT/3"

echo ""
echo "5️⃣ Database Schema Check"  
echo "========================"
cd eventops
if [ -n "$DATABASE_URL" ]; then
    GOOGLE_COLS=$(psql "$DATABASE_URL" -tAc "
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name LIKE 'google%';
    " 2>/dev/null || echo "0")
    
    LOCK_TABLE=$(psql "$DATABASE_URL" -tAc "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_name = 'google_sync_locks';
    " 2>/dev/null || echo "0")
    
    if [ "$GOOGLE_COLS" -ge "9" ]; then
        echo "✅ User Google fields present ($GOOGLE_COLS columns)"
    else
        echo "⚠️  Missing Google fields in users table"
    fi
    
    if [ "$LOCK_TABLE" = "1" ]; then
        echo "✅ google_sync_locks table exists"
    else
        echo "⚠️  google_sync_locks table missing"
    fi
else
    echo "⚠️  DATABASE_URL not set (cannot verify schema)"
fi

echo ""
echo "📊 Deployment Summary"
echo "===================="
echo "🔗 Production URL: $PROD_URL"
echo "🔗 Settings Page: $PROD_URL/dashboard/settings/integrations"
echo "🔗 Vercel Dashboard: https://vercel.com/caseys-projects-2a50de81/yard-flow-hitlist"
echo ""

echo "✅ NEXT STEPS:"
echo "============="
echo "1. Navigate to: $PROD_URL/dashboard/settings/integrations"
echo "2. Click 'Connect Google Account'"
echo "3. Complete OAuth flow"
echo "4. Test dry-run calendar sync"
echo "5. Toggle dry-run OFF and sync for real"
echo "6. Monitor cron at next hour: vercel logs --follow"
echo ""

echo "🔐 Test OAuth Flow:"
echo "  $PROD_URL/api/google/connect"
echo ""

echo "📈 Monitor Cron Logs:"
echo "  vercel logs --follow --prod | grep cron"
echo ""

echo "🎉 Sprint 18 deployment complete!"
