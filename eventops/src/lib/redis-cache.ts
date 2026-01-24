import Redis from 'ioredis';
import { logger } from '@/lib/logger';

/**
 * Redis Client for Content Hub Caching
 * 
 * Uses lazy initialization to prevent Railway build hangs.
 * Implements 24-hour TTL for content hub responses.
 */

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  // Skip Redis if not configured (development mode)
  if (!process.env.REDIS_URL) {
    logger.warn('Redis URL not configured, caching disabled');
    return null;
  }

  if (!redisClient) {
    try {
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            logger.error('Redis connection failed after 3 retries');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
      });

      redisClient.on('error', (err) => {
        logger.error('Redis client error', { error: err });
      });

      redisClient.on('connect', () => {
        logger.info('Redis client connected');
      });

      logger.info('Redis client initialized');
    } catch (error) {
      logger.error('Failed to initialize Redis client', { error });
      return null;
    }
  }

  return redisClient;
}

/**
 * Cache content hub responses with 24hr TTL.
 */
export async function cacheSet(
  key: string,
  value: any,
  ttlSeconds: number = 86400 // 24 hours
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
    logger.debug('Cache set', { key, ttl: ttlSeconds });
  } catch (error) {
    logger.error('Cache set failed', { error, key });
  }
}

/**
 * Get cached content hub response.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const value = await redis.get(key);
    if (value) {
      logger.debug('Cache hit', { key });
      return JSON.parse(value) as T;
    }
    logger.debug('Cache miss', { key });
    return null;
  } catch (error) {
    logger.error('Cache get failed', { error, key });
    return null;
  }
}

/**
 * Delete cached content hub response.
 */
export async function cacheDel(key: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.del(key);
    logger.debug('Cache deleted', { key });
  } catch (error) {
    logger.error('Cache delete failed', { error, key });
  }
}

/**
 * Clear all content hub cache.
 */
export async function cacheClear(pattern: string = 'content_hub:*'): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info('Cache cleared', { pattern, keysDeleted: keys.length });
    }
  } catch (error) {
    logger.error('Cache clear failed', { error, pattern });
  }
}

/**
 * Generate cache key for content hub requests.
 */
export function generateCacheKey(type: string, params: any): string {
  const paramsString = JSON.stringify(params);
  return `content_hub:${type}:${Buffer.from(paramsString).toString('base64')}`;
}
