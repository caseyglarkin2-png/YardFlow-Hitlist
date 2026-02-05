/**
 * API Route: Batch Enrich All Companies
 * POST /api/enrichment/linkedin/enrich-all
 */

import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { LinkedInExtractor } from '@/lib/enrichment/linkedin-extractor';
import { captureRouteError } from '@/lib/sentry-utils';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { limit = 10, peoplePerCompany = 10, dryRun = true } = await request.json();

    const extractor = new LinkedInExtractor();
    const result = await extractor.enrichAllCompanies({
      limit,
      peoplePerCompany,
      dryRun,
    });

    return NextResponse.json(result);
  } catch (error) {
    captureRouteError(error, {
      route: '/api/enrichment/linkedin/enrich-all',
      method: 'POST',
      userId: authResult?.userId,
    });
    console.error('LinkedIn batch enrichment error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to enrich LinkedIn profiles in batch',
      },
      { status: 500 }
    );
  }
}
