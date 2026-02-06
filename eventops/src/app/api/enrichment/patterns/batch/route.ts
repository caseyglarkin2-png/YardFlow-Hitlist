/**
 * API Route: Batch Apply Email Patterns
 * POST /api/enrichment/patterns/batch
 */

import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { PatternApplicator } from '@/lib/enrichment/pattern-applicator';
import { captureRouteError } from '@/lib/sentry-utils';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
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
  } catch (error) {
    captureRouteError(error, {
      route: '/api/enrichment/patterns/batch',
      method: 'POST',
    });
    console.error('Batch pattern application error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply patterns in batch' },
      { status: 500 }
    );
  }
}
