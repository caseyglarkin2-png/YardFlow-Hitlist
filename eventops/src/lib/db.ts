import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { getDatabaseUrl, env } from './env';
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
  // Create PostgreSQL connection pool using helper that checks both env vars
  // Pool settings tuned for Railway shared PostgreSQL:
  //   Web: max 10 connections, Worker: max 5 — total stays under Railway's ~20 limit
  //   idleTimeoutMillis: 30s — free idle connections quickly under burst
  //   connectionTimeoutMillis: 5s — fail fast if DB is unreachable
  const isWorker = process.env.WORKER_MODE === 'true';
  const maxPoolSize = isWorker ? 5 : 10;
  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString: getDatabaseUrl(),
      max: maxPoolSize,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

  if (!globalForPrisma.pool) {
    globalForPrisma.pool = pool;
  }

  // Create Prisma adapter for pg pool (pass pool directly, not as object)
  const adapter = new PrismaPg(pool);

  logger.info('🔌 Prisma Client Initialized with PrismaPg driver adapter (v7)');

  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

/**
 * Get Prisma client (lazy initialization)
 * Connection is only created on first access, not at module load
 */
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// Lazy initialization via getter - connection created on first use, not import
// This prevents crashes during worker startup before health server is ready
export const db = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return getPrismaClient()[prop as keyof PrismaClient];
  },
});

// Alias for convenience
export const prisma = db;

/**
 * Gracefully disconnect Prisma and close pool
 * Call this on app shutdown
 */
export async function disconnectPrisma(): Promise<void> {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect();
  }
  if (globalForPrisma.pool) {
    await globalForPrisma.pool.end();
    logger.info('🔌 Prisma Client and pg pool disconnected');
  }
}

/**
 * Get connection pool metrics for health monitoring
 * Returns current pool utilization stats
 */
export function getPoolMetrics(): {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  activeCount: number;
  maxConnections: number;
} {
  const pool = globalForPrisma.pool;
  const isWorker = process.env.WORKER_MODE === 'true';
  const maxPoolSize = isWorker ? 5 : 10;
  if (!pool) {
    return { totalCount: 0, idleCount: 0, waitingCount: 0, activeCount: 0, maxConnections: maxPoolSize };
  }
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    activeCount: pool.totalCount - pool.idleCount,
    maxConnections: maxPoolSize,
  };
}
