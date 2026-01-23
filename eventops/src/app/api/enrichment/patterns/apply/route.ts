/**
 * API Route: Apply Email Patterns
 * POST /api/enrichment/patterns/apply
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PatternApplicator } from '@/lib/enrichment/pattern-applicator';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, dryRun = true, minConfidence = 70, force = false } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    const applicator = new PatternApplicator();
    const result = await applicator.enrichCompanyContacts(accountId, {
      dryRun,
      minConfidence,
      force,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Pattern application error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to apply patterns' },
      { status: 500 }
    );
  }
}
