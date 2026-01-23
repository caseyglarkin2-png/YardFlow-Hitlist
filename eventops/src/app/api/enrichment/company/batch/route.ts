/**
 * API Route: Batch Enrich Companies
 * POST /api/enrichment/company/batch
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { CompanyEnrichmentOrchestrator } from '@/lib/enrichment/company-enrichment-orchestrator';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { limit = 50, dryRun = true } = await request.json();

    const orchestrator = new CompanyEnrichmentOrchestrator();
    const result = await orchestrator.enrichAll({ limit, dryRun });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Batch company enrichment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enrich companies in batch' },
      { status: 500 }
    );
  }
}
