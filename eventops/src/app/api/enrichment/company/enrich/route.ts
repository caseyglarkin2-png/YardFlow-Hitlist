/**
 * API Route: Enrich Company Data
 * POST /api/enrichment/company/enrich
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { CompanyEnrichmentOrchestrator } from '@/lib/enrichment/company-enrichment-orchestrator';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, dryRun = false } = await request.json();

    if (!accountId || typeof accountId !== 'string') {
      return NextResponse.json(
        { error: 'accountId is required and must be a string' },
        { status: 400 }
      );
    }

    // Basic UUID format validation
    if (!accountId.match(/^[a-zA-Z0-9_-]+$/)) {
      return NextResponse.json(
        { error: 'Invalid accountId format' },
        { status: 400 }
      );
    }

    const orchestrator = new CompanyEnrichmentOrchestrator();
    const result = await orchestrator.enrichCompany(accountId);

    // Save if successful and not dry run
    if (!dryRun && result.success) {
      await orchestrator.saveEnrichmentData(accountId, result.data);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Company enrichment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enrich company' },
      { status: 500 }
    );
  }
}
