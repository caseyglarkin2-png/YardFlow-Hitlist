/**
 * API Route: Batch Enrich LinkedIn Profiles for Company
 * POST /api/enrichment/linkedin/enrich-company
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { LinkedInExtractor } from '@/lib/enrichment/linkedin-extractor';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, dryRun = true, limit = 50 } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    const extractor = new LinkedInExtractor();
    const result = await extractor.enrichCompanyContacts(accountId, {
      dryRun,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('LinkedIn company enrichment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enrich company LinkedIn profiles' },
      { status: 500 }
    );
  }
}
