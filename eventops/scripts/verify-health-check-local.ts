import { prisma } from '@/lib/db';
import { getRedisClient } from '@/lib/redis-cache';

async function main() {
  console.log('🏥 Running local health verification...');

  // Database Check
  try {
    process.stdout.write('Checking Database... ');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Connected');
  } catch (error) {
    console.log('❌ Failed');
    console.error(error);
  }

  // Redis Check
  try {
    process.stdout.write('Checking Redis... ');
    const redis = getRedisClient();
    if (redis) {
      const result = await redis.ping();
      if (result === 'PONG') {
        console.log('✅ Connected');
      } else {
        console.log('❌ Invalid response: ' + result);
      }
    } else {
      if (process.env.REDIS_URL) {
        console.log('❌ Failed to initialize (REDIS_URL present)');
      } else {
        console.log('⚠️ Skipped (No REDIS_URL)');
      }
    }
  } catch (error) {
    console.log('❌ Failed');
    console.error(error);
  }

  process.exit(0);
}

main();
