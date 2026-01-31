import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { agentStateManager, AgentType, AgentTaskStatus } from '@/lib/agents/state-manager';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const agentType = searchParams.get('agentType') as AgentType | null;
    const accountId = searchParams.get('accountId');
    const sinceDays = parseInt(searchParams.get('sinceDays') || '7', 10);

    // Get active workflows
    const activeWorkflows = await agentStateManager.getActiveWorkflows();

    // Get agent metrics for all types
    const agentTypes = [
      'prospecting',
      'research',
      'sequence',
      'content',
      'graphics',
      'socials',
      'contracting',
    ] as const;

    const metrics = await Promise.all(
      agentTypes.map((type) => agentStateManager.getAgentMetrics(type, sinceDays))
    );

    // Get account-specific task history if requested
    let taskHistory = undefined;
    if (accountId) {
      taskHistory = await agentStateManager.getTaskHistory(accountId, 20);
    }

    // Get pending tasks for specific agent type if requested
    let pendingTasks = undefined;
    if (agentType) {
      pendingTasks = await agentStateManager.getPendingTasks(agentType, 10);
    }

    logger.info('Agent status retrieved', {
      userId: authResult.userId,
      activeWorkflows: activeWorkflows.length,
      requestedAgent: agentType,
      requestedAccount: accountId,
    });

    return NextResponse.json({
      activeWorkflows,
      metrics,
      taskHistory,
      pendingTasks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to retrieve agent status', {
      error,
      userId: authResult.userId,
    });

    return NextResponse.json({ error: 'Failed to retrieve agent status' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authServiceOrSession(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, status, output, error, progress } = body;

    if (!taskId || !status) {
      return NextResponse.json(
        { error: 'taskId and status are required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses: AgentTaskStatus[] = ['pending', 'in_progress', 'completed', 'failed'];
    if (!validStatuses.includes(status as AgentTaskStatus)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await agentStateManager.updateTaskStatus(
        taskId,
        status as AgentTaskStatus,
        output || undefined,
        error || undefined,
        progress || undefined
    );

    return NextResponse.json({ success: true });

  } catch (err) {
    logger.error('Agent status update error', { error: err });
    return NextResponse.json(
        { error: 'Internal Server Error', details: err instanceof Error ? err.message : String(err) },
        { status: 500 }
    );
  }
}
