#!/bin/bash
# Quick production verification for Sprint 18

echo "🔍 Sprint 18 Production Verification"
echo "======================================"
echo ""

# Check if deployed
echo "1️⃣  Checking production deployment..."
PROD_URL="https://yardflow-hitlist-production-2f41.up.railway.app"

# Test main app
if curl -s -o /dev/null -w "%{http_code}" "$PROD_URL" | grep -q "200\|307\|308"; then
    echo "   ✅ Main app is live"
else
    echo "   ❌ Main app not responding"
    # Don't exit yet, check deep health
fi

echo ""
echo "🔍 Checking Deep Health..."
DEEP_HEALTH=$(curl -s "$PROD_URL/api/health/deep")
if echo "$DEEP_HEALTH" | grep -q "healthy"; then
    echo "   ✅ Deep Health Check: PASS"
    echo "      $DEEP_HEALTH"
else
    echo "   ⚠️ Deep Health Check: FAIL or UNREACHABLE"
    echo "      Response: $DEEP_HEALTH"
fi

# Test OAuth connect endpoint (should redirect)
echo ""
echo "2️⃣  Checking Google OAuth endpoints..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/google/connect")
if [ "$STATUS" = "302" ] || [ "$STATUS" = "307" ]; then
    echo "   ✅ OAuth connect endpoint active (redirect)"
else
    echo "   ⚠️  OAuth connect returned: $STATUS (needs login or env vars)"
fi

# Test cron endpoint (should return 401 without secret)
echo ""
echo "3️⃣  Checking cron endpoint security..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/cron/google-sync")
if [ "$STATUS" = "401" ]; then
    echo "   ✅ Cron endpoint protected (401 without auth)"
else
    echo "   ⚠️  Cron endpoint returned: $STATUS"
fi

# Check vercel env vars
echo ""
echo "4️⃣  Checking Vercel environment variables..."
if command -v vercel &> /dev/null; then
    ENV_COUNT=$(vercel env ls 2>/dev/null | grep -c "production" || echo "0")
    if [ "$ENV_COUNT" -gt "0" ]; then
        echo "   ✅ Environment variables configured"
        vercel env ls 2>/dev/null | grep -E "GOOGLE_|CRON_" | head -5
    else
        echo "   ⚠️  Run: vercel env ls to check configuration"
    fi
else
    echo "   ⚠️  Vercel CLI not installed (npm i -g vercel)"
fi

echo ""
echo "5️⃣  Checking database schema..."
cd eventops
if command -v psql &> /dev/null && [ -n "$DATABASE_URL" ]; then
    LOCK_TABLE=$(psql "$DATABASE_URL" -tAc "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_name = 'google_sync_locks';
    " 2>/dev/null || echo "0")
    
    if [ "$LOCK_TABLE" = "1" ]; then
        echo "   ✅ google_sync_locks table exists"
    else
        echo "   ⚠️  google_sync_locks table missing (run: npx prisma db push)"
    fi
    
    USER_COLS=$(psql "$DATABASE_URL" -tAc "
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name LIKE 'google%';
    " 2>/dev/null || echo "0")
    
    if [ "$USER_COLS" -ge "9" ]; then
        echo "   ✅ User Google fields added ($USER_COLS columns)"
    else
        echo "   ⚠️  User Google fields missing (run: npx prisma db push)"
    fi
else
    echo "   ⚠️  Database not accessible (check DATABASE_URL)"
fi
cd ..

echo ""
echo "6️⃣  Vercel cron configuration..."
if [ -f "eventops/vercel.json" ]; then
    if grep -q "google-sync" eventops/vercel.json; then
        echo "   ✅ Cron job configured in vercel.json"
        grep -A2 "google-sync" eventops/vercel.json
    else
        echo "   ❌ Cron job missing from vercel.json"
    fi
else
    echo "   ❌ vercel.json not found"
fi

echo ""
echo "📋 Summary"
echo "=========="
echo ""
echo "✅ Ready for production if all checks passed"
echo ""
echo "Next steps:"
echo "  1. Set environment variables: ./eventops/scripts/setup-google-production.sh"
echo "  2. Create OAuth credentials: See GOOGLE_CLOUD_SETUP.md"
echo "  3. Deploy: vercel deploy --prod"
echo "  4. Test: Navigate to $PROD_URL/dashboard/settings/integrations"
echo ""
