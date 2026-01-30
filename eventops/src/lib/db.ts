import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { env } from './env';
import { logger } from '@/lib/logger';

// Global singleton to prevent multiple instances during hot-reload
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

/**
 * Create Prisma client with PrismaPg driver adapter
 * Follows lazy initialization pattern per project guidelines
 */
function createPrismaClient(): PrismaClient {
  // Create PostgreSQL connection pool
  const pool = globalForPrisma.pool ?? new Pool({
    connectionString: env.DATABASE_URL,
    max: 10, // Maximum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  if (!globalForPrisma.pool) {
    globalForPrisma.pool = pool;
  }

  // Create Prisma adapter for pg pool
  const adapter = new PrismaPg({ pool });

  logger.info('🔌 Prisma Client Initialized with PrismaPg driver adapter (v7)');

  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

// Lazy initialization
export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Alias for convenience
export const prisma = db;

/**
 * Gracefully disconnect Prisma and close pool
 * Call this on app shutdown
 */
export async function disconnectPrisma(): Promise<void> {
  await db.$disconnect();
  if (globalForPrisma.pool) {
    await globalForPrisma.pool.end();
    logger.info('🔌 Prisma Client and pg pool disconnected');
  }
}
