/**
 * Workflow Launch API - Sprint 33.2
 * POST /api/workflows/launch
 */

import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { getAgentOrchestrator } from '@/lib/agents/orchestrator';
import { logger } from '@/lib/logger';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, accountId, contactIds, config } = body;

    if (!type || !accountId) {
      return NextResponse.json({ error: 'type and accountId required' }, { status: 400 });
    }

    logger.info('Launching workflow via API', {
      userId: authResult.userId,
      type,
      accountId,
    });

    const orchestrator = getAgentOrchestrator();
    const result = await orchestrator.executeWorkflow({
      type,
      accountId,
      contactIds: contactIds || [],
      config: config || {},
    });

    return NextResponse.json(result);
  } catch (error) {
    captureRouteError(error, {
      route: '/api/workflows/launch',
      method: 'POST',
      userId: authResult?.userId,
    });
    logger.error('Workflow launch failed', { error });
    return NextResponse.json({ error: 'Workflow launch failed' }, { status: 500 });
  }
}
