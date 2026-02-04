/**
 * API Route: Generate Company Dossier (Gemini Pro)
 * POST /api/ai/dossier/generate
 * 
 * Supports both session auth and S2S auth for frontend proxy
 */

import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { AIDossierGenerator } from '@/lib/ai/dossier-generator';

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

    const generator = new AIDossierGenerator();
    const result = await generator.generateDossier(accountId);

    // Save if successful and not dry run
    if (!dryRun && result.success && result.dossier) {
      await generator.saveDossier(accountId, result.dossier);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Dossier generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate dossier' },
      { status: 500 }
    );
  }
}
