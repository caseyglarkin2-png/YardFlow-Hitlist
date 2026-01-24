/**
 * Workflow Launch API - Sprint 33.2
 * POST /api/workflows/launch
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAgentOrchestrator } from '@/lib/agents/orchestrator';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, accountId, contactIds, config } = body;

    if (!type || !accountId) {
      return NextResponse.json({ error: 'type and accountId required' }, { status: 400 });
    }

    logger.info('Launching workflow via API', {
      userId: session.user.id,
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
    logger.error('Workflow launch failed', { error });
    return NextResponse.json({ error: 'Workflow launch failed' }, { status: 500 });
  }
}
