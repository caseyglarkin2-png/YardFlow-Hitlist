import { NextRequest, NextResponse } from 'next/server';
import { AgentOrchestrator } from '@/lib/agents/orchestrator';
import { authServiceOrSession } from '@/lib/auth-service';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const auth = await authServiceOrSession(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, agentType, parameters } = body;

    if (!action || !agentType) {
      return NextResponse.json({ error: 'action and agentType are required' }, { status: 400 });
    }

    if (action === 'start') {
      const orchestrator = new AgentOrchestrator();
      const result = await orchestrator.runAgent(agentType, parameters || {});
      return NextResponse.json(result);
    } else if (action === 'stop') {
      return NextResponse.json({ error: 'Stop action not implemented' }, { status: 501 });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Agent control error', { error });
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
