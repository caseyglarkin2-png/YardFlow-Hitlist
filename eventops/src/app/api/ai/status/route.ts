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
import { AI_USAGE_PREFIX, AI_ERRORS_PREFIX } from '@/lib/ai/usage-tracker';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

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
    captureRouteError(error, {
      route: '/api/ai/status',
      method: 'GET',
      userId: authResult?.userId,
    });
    logger.error('AI status check failed', { error: errorMessage });
    return NextResponse.json(
      { error: 'Failed to get AI status', details: errorMessage },
      { status: 500 }
    );
  }
}
