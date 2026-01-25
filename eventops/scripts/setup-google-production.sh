#!/bin/bash
# Sprint 18 Production Deployment Guide
# Run this to set up Google Integration in Vercel

set -e

echo "🚀 Sprint 18 - Google Integration Production Setup"
echo "=================================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install with: npm i -g vercel"
    exit 1
fi

echo "📝 Step 1: Generate CRON_SECRET"
echo "================================"
CRON_SECRET=$(openssl rand -base64 32)
echo "Generated: $CRON_SECRET"
echo ""

echo "🔐 Step 2: Set Vercel Environment Variables"
echo "============================================"
echo ""
echo "Please provide the following from Google Cloud Console:"
echo "(Create at: https://console.cloud.google.com/apis/credentials)"
echo ""

read -p "Enter GOOGLE_CLIENT_ID: " GOOGLE_CLIENT_ID
read -p "Enter GOOGLE_CLIENT_SECRET: " GOOGLE_CLIENT_SECRET

echo ""
echo "Setting environment variables in Vercel..."

# Set production environment variables
vercel env add GOOGLE_CLIENT_ID production <<< "$GOOGLE_CLIENT_ID"
vercel env add GOOGLE_CLIENT_SECRET production <<< "$GOOGLE_CLIENT_SECRET"
vercel env add CRON_SECRET production <<< "$CRON_SECRET"

echo ""
echo "✅ Environment variables set!"
echo ""
echo "📋 Summary:"
echo "  GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:0:20}..."
echo "  GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:0:10}..."
echo "  CRON_SECRET: ${CRON_SECRET:0:10}..."
echo ""

echo "🔄 Step 3: Redeploy to activate"
echo "==============================="
echo "Run: vercel deploy --prod"
echo ""

echo "✨ Next steps:"
echo "  1. Navigate to: https://yardflow-hitlist-production-2f41.up.railway.app/dashboard/settings/integrations"
echo "  2. Click 'Connect Google Account'"
echo "  3. Complete OAuth flow"
echo "  4. Toggle dry-run mode off when ready for live sync"
echo "  5. Monitor cron logs at next hour: vercel logs --follow"
echo ""

# Save CRON_SECRET to local .env for testing
if [ -f "eventops/.env" ]; then
    if grep -q "CRON_SECRET=" eventops/.env; then
        sed -i.bak "s/CRON_SECRET=.*/CRON_SECRET=\"$CRON_SECRET\"/" eventops/.env
    else
        echo "CRON_SECRET=\"$CRON_SECRET\"" >> eventops/.env
    fi
    echo "💾 CRON_SECRET also saved to eventops/.env for local testing"
fi

echo ""
echo "🎉 Production setup complete!"
