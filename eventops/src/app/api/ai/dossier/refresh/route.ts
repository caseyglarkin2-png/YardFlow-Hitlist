/**
 * API Route: Dossier Refresh
 * POST /api/ai/dossier/refresh
 *
 * Force-refresh a company dossier even if cached.
 * Regenerates all dossier fields including enhanced Sprint 31B fields.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authServiceOrSession } from '@/lib/auth-service';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';
import { AIDossierGenerator } from '@/lib/ai/dossier-generator';

export const dynamic = 'force-dynamic';

const RefreshRequestSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
});

/**
 * Check dossier staleness
 */
function getDossierAge(researchedAt: Date | null): {
  daysOld: number;
  isStale: boolean;
} {
  if (!researchedAt) {
    return { daysOld: Infinity, isStale: true };
  }
  const now = new Date();
  const diffMs = now.getTime() - researchedAt.getTime();
  const daysOld = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  // Consider stale after 7 days
  return { daysOld, isStale: daysOld > 7 };
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = RefreshRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { accountId } = validationResult.data;

    // Check if account exists
    const account = await prisma.target_accounts.findUnique({
      where: { id: accountId },
      include: { company_dossiers: true },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Get current dossier age
    const previousAge = account.company_dossiers
      ? getDossierAge(account.company_dossiers.researchedAt)
      : { daysOld: Infinity, isStale: true };

    logger.info('Refreshing dossier', {
      userId: authResult.userId,
      accountId,
      companyName: account.name,
      previousDaysOld: previousAge.daysOld,
      wasStale: previousAge.isStale,
    });

    // Generate fresh dossier
    const generator = new AIDossierGenerator();
    const result = await generator.generateDossier(accountId);

    if (!result.success || !result.dossier) {
      logger.warn('Dossier refresh failed', {
        accountId,
        error: result.error,
      });
      return NextResponse.json(
        { error: 'Failed to generate dossier', details: result.error },
        { status: 500 }
      );
    }

    // Save to database
    await generator.saveDossier(accountId, result.dossier);

    logger.info('Dossier refreshed successfully', {
      userId: authResult.userId,
      accountId,
      companyName: account.name,
      hasTalkingPoints: !!result.dossier.talkingPoints?.length,
      hasCompetitors: !!result.dossier.competitors?.length,
      hasOutreachAngles: !!result.dossier.outreachAngles?.length,
    });

    return NextResponse.json({
      refreshed: true,
      accountId,
      companyName: account.name,
      dossier: result.dossier,
      previousAge: previousAge.daysOld,
      newFields: {
        talkingPoints: result.dossier.talkingPoints?.length || 0,
        competitors: result.dossier.competitors?.length || 0,
        outreachAngles: result.dossier.outreachAngles?.length || 0,
        hasManifestContext: !!result.dossier.manifestContext,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Dossier refresh error', { error: errorMessage });
    return NextResponse.json(
      { error: 'Failed to refresh dossier', details: errorMessage },
      { status: 500 }
    );
  }
}
