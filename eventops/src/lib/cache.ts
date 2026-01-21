import { prisma } from '@/lib/db';

interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 300 = 5 minutes)
}

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const ttl = options.ttl || 300;

  try {
    // Check cache
    const cached = await prisma.cacheEntry.findUnique({
      where: { key },
    });

    if (cached && cached.expiresAt > new Date()) {
      // Update hit count and last accessed
      await prisma.cacheEntry.update({
        where: { key },
        data: {
          hitCount: { increment: 1 },
          lastAccessedAt: new Date(),
        },
      });

      return cached.value as T;
    }

    // Fetch fresh data
    const data = await fetcher();

    // Store in cache
    await prisma.cacheEntry.upsert({
      where: { key },
      update: {
        value: data as object,
        expiresAt: new Date(Date.now() + ttl * 1000),
        hitCount: 0,
        lastAccessedAt: new Date(),
      },
      create: {
        key,
        value: data as object,
        expiresAt: new Date(Date.now() + ttl * 1000),
        hitCount: 0,
        lastAccessedAt: new Date(),
      },
    });

    return data;
  } catch (error) {
    console.error('Cache error:', error);
    // Fallback to fetcher on cache error
    return fetcher();
  }
}

export async function invalidateCache(pattern: string) {
  try {
    await prisma.cacheEntry.deleteMany({
      where: {
        key: {
          contains: pattern,
        },
      },
    });
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}

export async function clearExpiredCache() {
  try {
    await prisma.cacheEntry.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  } catch (error) {
    console.error('Cache cleanup error:', error);
  }
}
