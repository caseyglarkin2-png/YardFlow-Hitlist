/**
 * API Route: Batch Enrich LinkedIn Profiles for Company
 * POST /api/enrichment/linkedin/enrich-company
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

    const { accountId, dryRun = true, limit = 50 } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    const extractor = new LinkedInExtractor();
    const result = await extractor.enrichCompanyContacts(accountId, {
      dryRun,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    captureRouteError(error, {
      route: '/api/enrichment/linkedin/enrich-company',
      method: 'POST',
      userId: authResult?.userId,
    });
    console.error('LinkedIn company enrichment error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to enrich company LinkedIn profiles',
      },
      { status: 500 }
    );
  }
}
