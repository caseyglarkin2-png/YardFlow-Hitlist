/**
 * A/B Testing API - Sprint 34.2
 * GET /api/testing/ab/{testId} - Get test results
 * POST /api/testing/ab - Create new test
 */

import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { abTestingEngine } from '@/lib/testing/ab-testing-engine';
import { logger } from '@/lib/logger';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { testId: string } }) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { testId } = params;
    const analysis = await abTestingEngine.analyzeTest(testId);

    return NextResponse.json(analysis);
  } catch (error) {
    captureRouteError(error, {
      route: '/api/testing/ab/[testId]',
      method: 'GET',
      userId: authResult?.userId,
    });
    logger.error('A/B test analysis failed', { error });
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
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
    captureRouteError(error, {
      route: '/api/testing/ab/[testId]',
      method: 'POST',
      userId: authResult?.userId,
    });
    logger.error('A/B test creation failed', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Creation failed' },
      { status: 500 }
    );
  }
}
