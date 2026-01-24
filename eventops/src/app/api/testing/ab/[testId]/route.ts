/**
 * A/B Testing API - Sprint 34.2
 * GET /api/testing/ab/{testId} - Get test results
 * POST /api/testing/ab - Create new test
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { abTestingEngine } from '@/lib/testing/ab-testing-engine';
import { logger } from '@/lib/logger';

export async function GET(request: Request, { params }: { params: { testId: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { testId } = params;
    const analysis = await abTestingEngine.analyzeTest(testId);

    return NextResponse.json(analysis);
  } catch (error) {
    logger.error('A/B test analysis failed', { error });
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, testType, variants, sequenceId } = body;

    if (!name || !testType || !variants || variants.length < 2) {
      return NextResponse.json(
        { error: 'name, testType, and at least 2 variants required' },
        { status: 400 }
      );
    }

    const testId = await abTestingEngine.createTest({
      name,
      testType,
      variants,
      sequenceId,
    });

    return NextResponse.json({ testId });
  } catch (error) {
    logger.error('A/B test creation failed', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Creation failed' },
      { status: 500 }
    );
  }
}
