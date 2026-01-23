#!/usr/bin/env node

/**
 * Test HubSpot Integration
 * Run with: npx tsx scripts/test-hubspot.ts
 */

import { testHubSpotConnection } from '../src/lib/hubspot/client';
import { syncHubSpotContacts } from '../src/lib/hubspot/sync-contacts';
import { logger } from '../src/lib/logger';

async function testHubSpot() {
  console.log('🔍 Testing HubSpot Integration...\n');

  // Test 1: Connection
  console.log('1️⃣  Testing HubSpot connection...');
  const isConnected = await testHubSpotConnection();
  
  if (!isConnected) {
    console.error('❌ HubSpot connection failed');
    console.error('   Check that HUBSPOT_API_KEY is set correctly in .env.local');
    process.exit(1);
  }
  
  console.log('✅ HubSpot connection successful\n');

  // Test 2: Sync a few contacts (limit to 5 for testing)
  console.log('2️⃣  Testing contact sync (limit: 5)...');
  try {
    const result = await syncHubSpotContacts({ limit: 5 });
    
    console.log('✅ Contact sync successful');
    console.log(`   - Imported: ${result.imported}`);
    console.log(`   - Updated: ${result.updated}`);
    console.log(`   - Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      result.errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.email || err.contactId}: ${err.error}`);
      });
    }
  } catch (error) {
    console.error('❌ Contact sync failed');
    console.error('   Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }

  console.log('\n✅ All tests passed!');
  console.log('\n📝 Next steps:');
  console.log('   - Test the API endpoint: POST /api/hubspot/sync/contacts');
  console.log('   - Run full sync without limit');
  console.log('   - Check database for imported contacts');
}

// Run tests
testHubSpot()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
