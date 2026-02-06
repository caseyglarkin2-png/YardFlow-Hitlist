/**
 * Shared Redis-backed rate limiter
 *
 * Uses Redis INCR + EXPIRE for a sliding-window counter.
 * Falls back to allowing requests if Redis is unavailable (fail-open).
 *
 * Usage:
 *   const result = await checkRateLimit('ai:content:user123', 10, 60);
 *   if (!result.allowed) {
 *     return NextResponse.json({ error: 'Rate limit exceeded' }, {
 *       status: 429,
 *       headers: { 'Retry-After': String(result.retryAfter) },
 *     });
 *   }
 */

import { getRedisConnection } from '@/lib/queue/client';
import { logger } from '@/lib/logger';

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
}

/**
 * Check and increment a rate limit counter in Redis.
 *
 * @param key       - Unique key for this rate limit (e.g., 'ai:content:user123')
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param windowSeconds - Window duration in seconds (default: 60)
 * @returns RateLimitResult with allowed status and remaining/retryAfter info
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number = 100,
  windowSeconds: number = 60,
): Promise<RateLimitResult> {
  try {
    const redis = getRedisConnection();
    const redisKey = `ratelimit:${key}`;

    const count = await redis.incr(redisKey);

    // Set expiry only on first request in a window
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }

    if (count > maxRequests) {
      const ttl = await redis.ttl(redisKey);
      return {
        allowed: false,
        retryAfter: ttl > 0 ? ttl : windowSeconds,
        remaining: 0,
      };
    }

    return {
      allowed: true,
      remaining: maxRequests - count,
    };
  } catch (error) {
    // Fail open — if Redis is down, allow the request
    logger.warn('Rate limiter Redis error, failing open', {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return { allowed: true, remaining: maxRequests };
  }
}

/**
 * Build a standard rate limit key from components.
 * Produces consistent namespacing across the app.
 *
 * @example rateLimitKey('ai', 'chat', userId) => 'ai:chat:<userId>'
 */
export function rateLimitKey(...parts: string[]): string {
  return parts.join(':');
}
