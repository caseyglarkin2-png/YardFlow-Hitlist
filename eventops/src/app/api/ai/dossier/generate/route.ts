/**
 * API Route: Generate Company Dossier (Gemini Pro)
 * POST /api/ai/dossier/generate
 *
 * Returns frontend-compatible dossier format for GTM-YardFlow's DossierPanel.
 * Supports both session auth and S2S auth for frontend proxy.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { AIDossierGenerator } from '@/lib/ai/dossier-generator';
import { transformToFrontendResponse } from '@/lib/ai/dossier-transformer';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, dryRun = false } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    // Fetch account data for transformation
    const account = await prisma.target_accounts.findUnique({
      where: { id: accountId },
      select: { website: true, headquarters: true },
    });

    const generator = new AIDossierGenerator();
    const result = await generator.generateDossier(accountId);

    // Save if successful and not dry run
    if (!dryRun && result.success && result.dossier) {
      await generator.saveDossier(accountId, result.dossier);
    }

    // Transform to frontend-compatible format
    const frontendResponse = transformToFrontendResponse(result, {
      website: account?.website,
      headquarters: account?.headquarters,
    });

    logger.info('Dossier generated', {
      userId: authResult.userId,
      accountId,
      success: result.success,
      confidence: frontendResponse.confidence?.overall,
    });

    return NextResponse.json(frontendResponse);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate dossier';
    captureRouteError(error, {
      route: '/api/ai/dossier/generate',
      method: 'POST',
      userId: authResult?.userId,
    });
    logger.error('Dossier generation error', { error: errorMessage });
    return NextResponse.json(
      { 
        success: false, 
        data: null, 
        error: errorMessage,
        researchedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
