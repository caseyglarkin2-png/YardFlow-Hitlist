import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from '@/lib/logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  (() => {
    logger.info('🔌 Prisma Client Initialized');
    return new PrismaClient({
      log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  })();

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Alias for convenience
export const prisma = db;
