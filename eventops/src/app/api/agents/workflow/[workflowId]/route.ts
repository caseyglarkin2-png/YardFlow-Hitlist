/**
 * Workflow Status & Retry API
 *
 * GET /api/agents/workflow/[workflowId] - Get workflow status
 * POST /api/agents/workflow/[workflowId]/retry - Retry a failed task
 */
import { NextResponse, type NextRequest } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { getAgentOrchestrator } from '@/lib/agents/orchestrator';
import { logger } from '@/lib/logger';
import { captureRouteError } from '@/lib/sentry-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workflowId } = await params;

  try {
    const orchestrator = getAgentOrchestrator();
    const status = await orchestrator.getWorkflowStatus(workflowId);

    if (!status.found) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    logger.info('Workflow status retrieved', {
      userId: authResult.userId,
      workflowId,
      status: status.status,
      progress: status.progress,
    });

    return NextResponse.json(status);
  } catch (error) {
    captureRouteError(error, {
      route: '/api/agents/workflow/[workflowId]',
      method: 'GET',
    });
    logger.error('Failed to get workflow status', { error, workflowId });
    return NextResponse.json({ error: 'Failed to get workflow status' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workflowId } = await params;

  try {
    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const orchestrator = getAgentOrchestrator();
    const result = await orchestrator.retryFailedStep(workflowId, taskId);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to retry task. Task not found, not failed, or max retries exceeded.' },
        { status: 400 }
      );
    }

    logger.info('Task retried', {
      userId: authResult.userId,
      workflowId,
      taskId,
      status: result.status,
    });

    return NextResponse.json({
      success: true,
      task: result,
    });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/agents/workflow/[workflowId]',
      method: 'POST',
    });
    logger.error('Failed to retry task', { error, workflowId });
    return NextResponse.json({ error: 'Failed to retry task' }, { status: 500 });
  }
}
