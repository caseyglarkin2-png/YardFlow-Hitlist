/**
 * scripts/create-test-outreach.ts
 * Creates test data for email pipeline testing
 *
 * Usage:
 *   TEST_EMAIL=your@email.com npx tsx scripts/create-test-outreach.ts
 *   npx tsx scripts/create-test-outreach.ts --cleanup
 */

import { prisma } from '../src/lib/db';

const TEST_EMAIL = process.env.TEST_EMAIL || 'casey@freightroll.com';
const TEST_PREFIX = 'test-';

async function createTestOutreach() {
  console.log('===========================================');
  console.log(' Creating Test Outreach Data');
  console.log('===========================================');
  console.log(`Test email: ${TEST_EMAIL}`);
  console.log('');

  // Find or create test event
  let event = await prisma.events.findFirst({
    where: { name: 'Test Event' },
  });

  if (!event) {
    event = await prisma.events.create({
      data: {
        id: `${TEST_PREFIX}event-${Date.now()}`,
        name: 'Test Event',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'PLANNING',
        updatedAt: new Date(),
      },
    });
    console.log(`✅ Created test event: ${event.id}`);
  } else {
    console.log(`✅ Using existing test event: ${event.id}`);
  }

  // Find or create test account
  let account = await prisma.target_accounts.findFirst({
    where: { name: 'Test Account' },
  });

  if (!account) {
    account = await prisma.target_accounts.create({
      data: {
        id: `${TEST_PREFIX}account-${Date.now()}`,
        name: 'Test Account',
        website: 'https://example.com',
        icpScore: 80,
        eventId: event.id,
        updatedAt: new Date(),
      },
    });
    console.log(`✅ Created test account: ${account.id}`);
  } else {
    console.log(`✅ Using existing test account: ${account.id}`);
  }

  // Find or create test person with the test email
  let person = await prisma.people.findFirst({
    where: { email: TEST_EMAIL },
  });

  if (!person) {
    person = await prisma.people.create({
      data: {
        id: `${TEST_PREFIX}person-${Date.now()}`,
        name: 'Test Person',
        email: TEST_EMAIL,
        title: 'VP Operations',
        accountId: account.id,
        tier: 'Tier 1',
        score: 85,
        status: 'active',
        updatedAt: new Date(),
      },
    });
    console.log(`✅ Created test person: ${person.id}`);
  } else {
    console.log(`✅ Using existing test person: ${person.id}`);
  }

  // Create fresh outreach record
  const outreach = await prisma.outreach.create({
    data: {
      id: `${TEST_PREFIX}outreach-${Date.now()}`,
      personId: person.id,
      channel: 'EMAIL',
      status: 'DRAFT',
      subject: 'Quick question about Manifest 2026',
      message: `<p>Hi ${person.name.split(' ')[0]},</p>
<p>I noticed you'll be at Manifest 2026 and wanted to connect.</p>
<p>Would you have 15 minutes to chat about yard operations challenges?</p>
<p>We've helped companies like XYZ reduce yard dwell time by 40%.</p>
<p>Best,<br/>Casey</p>`,
      updatedAt: new Date(),
    },
  });
  console.log(`✅ Created test outreach: ${outreach.id}`);

  console.log('');
  console.log('===========================================');
  console.log(' Test Data Created Successfully');
  console.log('===========================================');
  console.log('');
  console.log('To send a test email, run:');
  console.log('');
  console.log(`  curl -X POST "https://yardflow-hitlist-production-2f41.up.railway.app/api/outreach/send-email" \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -H "Authorization: Bearer YOUR_CRON_SECRET" \\`);
  console.log(`    -d '{"outreachId": "${outreach.id}"}'`);
  console.log('');

  return outreach;
}

async function cleanupTestData() {
  console.log('===========================================');
  console.log(' Cleaning Up Test Data');
  console.log('===========================================');
  console.log('');

  // Delete in order due to foreign key constraints
  const deletedOutreach = await prisma.outreach.deleteMany({
    where: { id: { startsWith: TEST_PREFIX } },
  });
  console.log(`Deleted ${deletedOutreach.count} outreach records`);

  const deletedPeople = await prisma.people.deleteMany({
    where: { id: { startsWith: TEST_PREFIX } },
  });
  console.log(`Deleted ${deletedPeople.count} people records`);

  const deletedAccounts = await prisma.target_accounts.deleteMany({
    where: { id: { startsWith: TEST_PREFIX } },
  });
  console.log(`Deleted ${deletedAccounts.count} account records`);

  const deletedEvents = await prisma.events.deleteMany({
    where: { id: { startsWith: TEST_PREFIX } },
  });
  console.log(`Deleted ${deletedEvents.count} event records`);

  console.log('');
  console.log('✅ Cleanup complete');
}

// Main execution
const isCleanup = process.argv.includes('--cleanup');

if (isCleanup) {
  cleanupTestData()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('❌ Cleanup failed:', e);
      process.exit(1);
    });
} else {
  createTestOutreach()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('❌ Creation failed:', e);
      process.exit(1);
    });
}
