import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('🔌 Testing Prisma Connection...');
  const prisma = new PrismaClient();

  try {
    const start = Date.now();
    await prisma.$connect();
    console.log(`✅ Connected in ${Date.now() - start}ms`);

    const queryStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    console.log(`✅ Query (SELECT 1) in ${Date.now() - queryStart}ms`);

    // Check migrations table
    const migrations = await prisma.$queryRaw`SELECT count(*) as count FROM _prisma_migrations`;
    console.log('✅ Migrations table accessible:', migrations);

    process.exit(0);
  } catch (error) {
    console.error('❌ Database Connection Failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
