/**
 * API Route: AI Status
 * GET /api/ai/status
 *
 * Returns AI provider health, usage stats, and configuration.
 * Used by frontend Brain to show provider status and fallback info.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { logger } from '@/lib/logger';
import { getRedisConnection } from '@/lib/queue/client';

export const dynamic = 'force-dynamic';

// Redis keys for tracking AI usage
const AI_USAGE_PREFIX = 'ai:usage:';
const AI_ERRORS_PREFIX = 'ai:errors:';

interface ProviderStats {
  requestCount: number;
  errorCount: number;
  lastUsed: string | null;
  lastError: string | null;
  status: 'ok' | 'degraded' | 'error';
}

async function getProviderStats(provider: string): Promise<ProviderStats> {
  const redis = getRedisConnection();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    const [requestCount, errorCount, lastUsed, lastError] = await Promise.all([
      redis.get(`${AI_USAGE_PREFIX}${provider}:${today}:requests`),
      redis.get(`${AI_ERRORS_PREFIX}${provider}:${today}:count`),
      redis.get(`${AI_USAGE_PREFIX}${provider}:last_used`),
      redis.get(`${AI_ERRORS_PREFIX}${provider}:last_error`),
    ]);

    const requests = parseInt(requestCount || '0', 10);
    const errors = parseInt(errorCount || '0', 10);
    const errorRate = requests > 0 ? errors / requests : 0;

    let status: ProviderStats['status'] = 'ok';
    if (errorRate > 0.5) {
      status = 'error';
    } else if (errorRate > 0.1) {
      status = 'degraded';
    }

    return {
      requestCount: requests,
      errorCount: errors,
      lastUsed: lastUsed || null,
      lastError: lastError || null,
      status,
    };
  } catch (error) {
    logger.warn('Failed to get provider stats', { provider, error });
    return {
      requestCount: 0,
      errorCount: 0,
      lastUsed: null,
      lastError: null,
      status: 'ok', // Assume ok if we can't get stats
    };
  }
}

/**
 * Track AI provider usage (call this from provider.ts)
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
    logger.warn('Failed to track provider usage', { provider, error });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get stats for each provider
    const [geminiStats, openaiStats] = await Promise.all([
      getProviderStats('gemini'),
      getProviderStats('openai'),
    ]);

    // Check environment configuration
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;
    const hasOpenaiKey = !!process.env.OPENAI_API_KEY;
    const preferredProvider = process.env.AI_PROVIDER || 'gemini';

    // Determine overall status
    let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';
    if (geminiStats.status === 'error' && openaiStats.status === 'error') {
      overallStatus = 'error';
    } else if (geminiStats.status !== 'ok' || openaiStats.status !== 'ok') {
      overallStatus = 'degraded';
    }

    const response = {
      status: overallStatus,
      providers: {
        gemini: {
          configured: hasGeminiKey,
          preferred: preferredProvider === 'gemini',
          ...geminiStats,
        },
        openai: {
          configured: hasOpenaiKey,
          preferred: preferredProvider === 'openai',
          ...openaiStats,
        },
      },
      fallback: {
        enabled: hasGeminiKey && hasOpenaiKey,
        order: preferredProvider === 'gemini' ? ['gemini', 'openai'] : ['openai', 'gemini'],
      },
      capabilities: [
        'chat',
        'dossier-generation',
        'content-generation',
        'sequence-generation',
        'icp-scoring',
        'sentiment-analysis',
        'brain-actions',
        'conversation-memory',
      ],
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('AI status check failed', { error: errorMessage });
    return NextResponse.json(
      { error: 'Failed to get AI status', details: errorMessage },
      { status: 500 }
    );
  }
}
