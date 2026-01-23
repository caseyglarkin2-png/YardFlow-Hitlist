/**
 * API Route: Generate Company Dossier (Gemini Pro)
 * POST /api/ai/dossier/generate
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { AIDossierGenerator } from '@/lib/ai/dossier-generator';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, dryRun = false } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    const generator = new AIDossierGenerator();
    const result = await generator.generateDossier(accountId);

    // Save if successful and not dry run
    if (!dryRun && result.success && result.dossier) {
      await generator.saveDossier(accountId, result.dossier);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Dossier generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate dossier' },
      { status: 500 }
    );
  }
}
