/**
 * API Route: Batch Enrich All Companies
 * POST /api/enrichment/linkedin/enrich-all
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { LinkedInExtractor } from '@/lib/enrichment/linkedin-extractor';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
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
  } catch (error: any) {
    console.error('LinkedIn batch enrichment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enrich LinkedIn profiles in batch' },
      { status: 500 }
    );
  }
}
