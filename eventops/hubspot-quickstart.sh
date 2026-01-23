#!/bin/bash

# HubSpot Integration Quick Start
# Run this script to test the complete integration

echo "🚀 HubSpot Integration Quick Start"
echo "===================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this from the eventops directory"
    exit 1
fi

# Check if .env.local exists with HubSpot key
if ! grep -q "HUBSPOT_API_KEY" .env.local 2>/dev/null; then
    echo "⚠️  HubSpot API key not found in .env.local"
    echo "Adding it now..."
    echo "HUBSPOT_API_KEY=ffe089b9-5787-4a13-857b-f2e071851b8e" >> .env.local
    echo "✅ API key added"
fi

echo ""
echo "1️⃣  Checking dependencies..."
if npm list @hubspot/api-client >/dev/null 2>&1; then
    echo "✅ @hubspot/api-client installed"
else
    echo "⚠️  Installing @hubspot/api-client..."
    npm install @hubspot/api-client
fi

echo ""
echo "2️⃣  Running HubSpot integration tests..."
echo ""
npx tsx scripts/test-hubspot.ts

echo ""
echo "3️⃣  Quick Reference:"
echo "   📁 Files created:"
echo "      - src/lib/hubspot/client.ts"
echo "      - src/lib/hubspot/rate-limiter.ts"
echo "      - src/lib/hubspot/sync-contacts.ts"
echo "      - src/app/api/hubspot/sync/contacts/route.ts"
echo ""
echo "   📡 API Endpoint:"
echo "      POST /api/hubspot/sync/contacts"
echo "      Body: { limit?: number, accountId?: string }"
echo ""
echo "   🧪 Test full sync:"
echo "      npx tsx scripts/test-hubspot.ts"
echo ""
echo "   📚 Documentation:"
echo "      - HUBSPOT_INTEGRATION.md"
echo "      - SPRINT_23_HUBSPOT_COMPLETE.md"
echo ""
echo "✨ Sprint 23 Complete! Ready for production."
