/**
 * AI Usage Tracker
 *
 * Tracks AI provider usage metrics in Redis.
 * Used by provider.ts to track requests and errors.
 * Metrics retrieved by /api/ai/status endpoint.
 */

import { getRedisConnection } from '@/lib/queue/client';
import { logger } from '@/lib/logger';

// Redis keys for tracking AI usage
export const AI_USAGE_PREFIX = 'ai:usage:';
export const AI_ERRORS_PREFIX = 'ai:errors:';

/**
 * Track AI provider usage
 *
 * @param provider - Provider name (gemini, openai)
 * @param success - Whether the request succeeded
 * @param errorMessage - Error message if failed
 */
export async function trackProviderUsage(
  provider: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  const redis = getRedisConnection();
  const today = new Date().toISOString().split('T')[0];
  const TTL = 60 * 60 * 24 * 7; // 7 days

  try {
    const pipeline = redis.pipeline();

    // Track request count
    const requestKey = `${AI_USAGE_PREFIX}${provider}:${today}:requests`;
    pipeline.incr(requestKey);
    pipeline.expire(requestKey, TTL);

    // Track last used
    pipeline.set(`${AI_USAGE_PREFIX}${provider}:last_used`, new Date().toISOString());

    if (!success) {
      // Track error count
      const errorKey = `${AI_ERRORS_PREFIX}${provider}:${today}:count`;
      pipeline.incr(errorKey);
      pipeline.expire(errorKey, TTL);

      // Track last error
      if (errorMessage) {
        pipeline.set(
          `${AI_ERRORS_PREFIX}${provider}:last_error`,
          JSON.stringify({ message: errorMessage, timestamp: new Date().toISOString() })
        );
      }
    }

    await pipeline.exec();
  } catch (error) {
    // Non-fatal: log but don't throw
    logger.warn('Failed to track provider usage', {
      provider,
      error: error instanceof Error ? error.message : 'Unknown',
    });
  }
}
