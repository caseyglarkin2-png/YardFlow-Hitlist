import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  actual?: number | string;
  expected?: number | string;
}

async function verifyDatabase(): Promise<void> {
  const results: CheckResult[] = [];
  let allPassed = true;

  console.log('🔍 Starting database verification...\n');

  // Check 1: Migration status
  try {
    await prisma.$queryRaw`SELECT 1`;
    results.push({
      name: 'Database Connection',
      passed: true,
      message: 'Successfully connected to database',
    });
  } catch (error) {
    results.push({
      name: 'Database Connection',
      passed: false,
      message: `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    allPassed = false;
  }

  // Check 2: Count people (expect 5409)
  try {
    const peopleCount = await prisma.people.count();
    const expected = 5409;
    const passed = peopleCount === expected;

    results.push({
      name: 'People Count',
      passed,
      message: passed
        ? `People count matches expected value`
        : `People count mismatch`,
      actual: peopleCount,
      expected,
    });

    if (!passed) allPassed = false;
  } catch (error) {
    results.push({
      name: 'People Count',
      passed: false,
      message: `Failed to count people: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    allPassed = false;
  }

  // Check 3: Count target_accounts (expect 2653)
  try {
    const accountsCount = await prisma.target_accounts.count();
    const expected = 2653;
    const passed = accountsCount === expected;

    results.push({
      name: 'Target Accounts Count',
      passed,
      message: passed
        ? `Target accounts count matches expected value`
        : `Target accounts count mismatch`,
      actual: accountsCount,
      expected,
    });

    if (!passed) allPassed = false;
  } catch (error) {
    results.push({
      name: 'Target Accounts Count',
      passed: false,
      message: `Failed to count target accounts: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    allPassed = false;
  }

  // Check 4: Verify key indexes exist
  try {
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename IN ('people', 'target_accounts')
    `;

    const expectedIndexes = [
      'people_pkey',
      'target_accounts_pkey',
      'people_email_key',
    ];

    const indexNames = indexes.map((idx) => idx.indexname);
    const missingIndexes = expectedIndexes.filter(
      (name) => !indexNames.includes(name)
    );

    const passed = missingIndexes.length === 0;

    results.push({
      name: 'Database Indexes',
      passed,
      message: passed
        ? `All expected indexes exist`
        : `Missing indexes: ${missingIndexes.join(', ')}`,
      actual: indexNames.length,
      expected: `At least ${expectedIndexes.length} key indexes`,
    });

    if (!passed) allPassed = false;
  } catch (error) {
    results.push({
      name: 'Database Indexes',
      passed: false,
      message: `Failed to verify indexes: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    allPassed = false;
  }

  // Print results
  console.log('📊 Verification Results:\n');
  results.forEach((result) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);
    if (result.actual !== undefined && result.expected !== undefined) {
      console.log(`   Expected: ${result.expected}, Actual: ${result.actual}`);
    }
  });

  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All database verification checks passed!');
    process.exit(0);
  } else {
    console.log('❌ Some database verification checks failed!');
    process.exit(1);
  }
}

// Run verification
verifyDatabase()
  .catch((error) => {
    console.error('❌ Verification script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
