import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { agentStateManager, AgentType } from '@/lib/agents/state-manager';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
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
      userId: session.user.id,
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
      userId: session.user?.id,
    });

    return NextResponse.json({ error: 'Failed to retrieve agent status' }, { status: 500 });
  }
}
