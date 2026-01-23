/**
 * API Route: Detect Email Patterns
 * POST /api/enrichment/patterns/detect
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { EmailPatternDetector } from '@/lib/enrichment/email-pattern-detector';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    const detector = new EmailPatternDetector();
    const result = await detector.detectPatternsForCompany(accountId);

    // Save patterns to database
    if (result.detectedPatterns.length > 0) {
      await detector.savePatternsToDatabase(accountId, result.detectedPatterns);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Pattern detection error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to detect patterns' },
      { status: 500 }
    );
  }
}
