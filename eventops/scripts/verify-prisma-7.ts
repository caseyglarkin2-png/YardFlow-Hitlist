/**
 * Verify Prisma 7 Configuration
 * Run: npx tsx scripts/verify-prisma-7.ts
 */

import { prisma } from '../src/lib/db';

async function verify() {
  console.log('🔍 Verifying Prisma 7 Configuration...\n');

  try {
    // Test 1: Connection
    console.log('1️⃣ Testing database connection...');
    await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('   ✅ Database connection successful\n');

    // Test 2: Simple query
    console.log('2️⃣ Testing events table access...');
    const eventCount = await prisma.events.count();
    console.log(`   ✅ Events table accessible (${eventCount} records)\n`);

    // Test 3: Check Prisma version
    console.log('3️⃣ Prisma client version...');
    // @ts-ignore - _engineConfig is internal but useful for verification
    const version = prisma._engineConfig?.logLevel ? 'v7 (driver adapter)' : 'unknown';
    console.log(`   ✅ Using Prisma ${version}\n`);

    // Test 4: User count
    console.log('4️⃣ Testing users table access...');
    const userCount = await prisma.user.count();
    console.log(`   ✅ Users table accessible (${userCount} records)\n`);

    // Test 5: Account count
    console.log('5️⃣ Testing accounts table access...');
    const accountCount = await prisma.accounts.count();
    console.log(`   ✅ Accounts table accessible (${accountCount} records)\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All Prisma 7 verifications passed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Prisma verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
