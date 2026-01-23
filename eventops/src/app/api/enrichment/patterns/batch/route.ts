/**
 * API Route: Batch Apply Email Patterns
 * POST /api/enrichment/patterns/batch
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { PatternApplicator } from '@/lib/enrichment/pattern-applicator';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { limit = 100, minConfidence = 70, dryRun = true } = await request.json();

    const applicator = new PatternApplicator();
    const result = await applicator.enrichAllCompanies({
      limit,
      minConfidence,
      dryRun,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Batch pattern application error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to apply patterns in batch' },
      { status: 500 }
    );
  }
}
