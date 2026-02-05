/**
 * API Route: Batch Enrich Companies
 * POST /api/enrichment/company/batch
 */

import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { CompanyEnrichmentOrchestrator } from '@/lib/enrichment/company-enrichment-orchestrator';
import { captureRouteError } from '@/lib/sentry-utils';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { limit = 50, dryRun = true } = await request.json();

    const orchestrator = new CompanyEnrichmentOrchestrator();
    const result = await orchestrator.enrichAll({ limit, dryRun });

    return NextResponse.json(result);
  } catch (error) {
    captureRouteError(error, {
      route: '/api/enrichment/company/batch',
      method: 'POST',
      userId: authResult?.userId,
    });
    console.error('Batch company enrichment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to enrich companies in batch' },
      { status: 500 }
    );
  }
}
