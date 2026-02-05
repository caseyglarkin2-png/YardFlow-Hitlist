/**
 * API Route: Batch Research
 * POST /api/ai/research/batch
 *
 * Research multiple companies at once with rate limiting.
 * Returns research results for up to 10 companies in parallel.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authServiceOrSession } from '@/lib/auth-service';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';
import { getRedisConnection } from '@/lib/queue/client';
import { AIDossierGenerator } from '@/lib/ai/dossier-generator';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

// Rate limiting config
const RATE_LIMIT_WINDOW = 60; // 1 minute
const RATE_LIMIT_MAX = 20; // Max 20 accounts per minute per user
const MAX_BATCH_SIZE = 10; // Max 10 accounts per request

const BatchRequestSchema = z.object({
  accountIds: z
    .array(z.string().uuid())
    .min(1, 'At least one account required')
    .max(MAX_BATCH_SIZE, `Maximum ${MAX_BATCH_SIZE} accounts per batch`),
  forceRefresh: z.boolean().optional().default(false),
});

interface BatchResult {
  accountId: string;
  accountName: string;
  status: 'success' | 'error' | 'cached' | 'rate_limited';
  dossier?: Record<string, unknown>;
  error?: string;
  generatedAt?: string;
}

/**
 * Check and update rate limit
 * Returns remaining quota or -1 if rate limited
 */
async function checkRateLimit(userId: string): Promise<number> {
  const redis = getRedisConnection();
  const key = `rate:batch_research:${userId}`;

  try {
    // Get current count
    const current = await redis.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= RATE_LIMIT_MAX) {
      return -1; // Rate limited
    }

    // Increment and set expiry atomically
    const multi = redis.multi();
    multi.incr(key);
    multi.expire(key, RATE_LIMIT_WINDOW);
    await multi.exec();

    return RATE_LIMIT_MAX - count - 1;
  } catch (error) {
    logger.warn('Rate limit check failed, allowing request', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return RATE_LIMIT_MAX; // Allow on error
  }
}

/**
 * POST - Research multiple companies
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = BatchRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { accountIds, forceRefresh } = validationResult.data;

    // Check rate limit
    const remaining = await checkRateLimit(authResult.userId);
    if (remaining < 0) {
      logger.warn('Batch research rate limited', {
        userId: authResult.userId,
        requestedAccounts: accountIds.length,
      });

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Maximum ${RATE_LIMIT_MAX} accounts per minute. Please wait.`,
          retryAfterSeconds: RATE_LIMIT_WINDOW,
        },
        { status: 429 }
      );
    }

    logger.info('Batch research started', {
      userId: authResult.userId,
      accountCount: accountIds.length,
      forceRefresh,
      remainingQuota: remaining,
    });

    // Fetch accounts
    const accounts = await prisma.target_accounts.findMany({
      where: { id: { in: accountIds } },
      include: {
        company_dossiers: true,
        people: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });

    // Map for quick lookup
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    // Process each account
    const results: BatchResult[] = [];
    const generator = new AIDossierGenerator();

    for (const accountId of accountIds) {
      const account = accountMap.get(accountId);

      if (!account) {
        results.push({
          accountId,
          accountName: 'Unknown',
          status: 'error',
          error: 'Account not found',
        });
        continue;
      }

      try {
        // Check for existing dossier
        if (account.company_dossiers && !forceRefresh) {
          const dossierAge = account.company_dossiers.updatedAt
            ? Math.floor(
                (Date.now() - new Date(account.company_dossiers.updatedAt).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 999;

          // If dossier is less than 7 days old, return cached
          if (dossierAge < 7) {
            results.push({
              accountId,
              accountName: account.name,
              status: 'cached',
              dossier: {
                companyOverview: account.company_dossiers.companyOverview,
                keyPainPoints: account.company_dossiers.keyPainPoints,
                industryContext: account.company_dossiers.industryContext,
                outreachAngles: account.company_dossiers.outreachAngles,
                talkingPoints: account.company_dossiers.talkingPoints,
                competitors: account.company_dossiers.competitors,
                manifestContext: account.company_dossiers.manifestContext,
              },
              generatedAt: account.company_dossiers.updatedAt?.toISOString(),
            });
            continue;
          }
        }

        // Generate new dossier
        const result = await generator.generateDossier(accountId);

        if (!result.success || !result.dossier) {
          results.push({
            accountId,
            accountName: account.name,
            status: 'error',
            error: result.error || 'Dossier generation failed',
          });
          continue;
        }

        results.push({
          accountId,
          accountName: account.name,
          status: 'success',
          dossier: {
            companyOverview: result.dossier.companyOverview,
            keyPainPoints: result.dossier.keyPainPoints,
            outreachAngles: result.dossier.outreachAngles,
            talkingPoints: result.dossier.talkingPoints,
            competitors: result.dossier.competitors,
          },
          generatedAt: new Date().toISOString(),
        });
      } catch (error) {
        captureRouteError(error, {
          route: '/api/ai/research/batch',
          method: 'POST',
          userId: authResult?.userId,
        });
        logger.error('Failed to research account', {
          accountId,
          error: error instanceof Error ? error.message : 'Unknown',
        });

        results.push({
          accountId,
          accountName: account.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Research failed',
        });
      }
    }

    const summary = {
      total: results.length,
      success: results.filter((r) => r.status === 'success').length,
      cached: results.filter((r) => r.status === 'cached').length,
      errors: results.filter((r) => r.status === 'error').length,
    };

    logger.info('Batch research completed', {
      userId: authResult.userId,
      ...summary,
    });

    return NextResponse.json({
      results,
      summary,
      rateLimit: {
        remaining,
        window: RATE_LIMIT_WINDOW,
        max: RATE_LIMIT_MAX,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    captureRouteError(error, {
      route: '/api/ai/research/batch',
      method: 'POST',
      userId: authResult?.userId,
    });
    logger.error('Batch research error', { error: errorMessage });

    return NextResponse.json(
      { error: 'Failed to process batch research', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET - Get rate limit status
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const redis = getRedisConnection();
    const key = `rate:batch_research:${authResult.userId}`;

    const current = await redis.get(key);
    const count = current ? parseInt(current, 10) : 0;
    const ttl = await redis.ttl(key);

    return NextResponse.json({
      rateLimit: {
        used: count,
        remaining: Math.max(0, RATE_LIMIT_MAX - count),
        max: RATE_LIMIT_MAX,
        resetsInSeconds: ttl > 0 ? ttl : 0,
        window: RATE_LIMIT_WINDOW,
      },
      maxBatchSize: MAX_BATCH_SIZE,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    captureRouteError(error, {
      route: '/api/ai/research/batch',
      method: 'GET',
      userId: authResult?.userId,
    });
    logger.error('Rate limit check error', { error: errorMessage });
    return NextResponse.json(
      { error: 'Failed to get rate limit', details: errorMessage },
      { status: 500 }
    );
  }
}
