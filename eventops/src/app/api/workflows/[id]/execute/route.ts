import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Execute workflow manually (test run)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workflow = await prisma.workflow.findUnique({
    where: { id: params.id },
  });

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  const trigger = JSON.parse(workflow.trigger);
  const conditions = JSON.parse(workflow.conditions);
  const actions = JSON.parse(workflow.actions);

  let executedActions = [];

  // Process actions
  for (const action of actions) {
    if (action.type === 'send_notification') {
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          type: 'INFO',
          title: action.title || 'Workflow Notification',
          message: action.message || 'Workflow action executed',
          priority: 'NORMAL',
        },
      });
      executedActions.push({ type: 'notification', success: true });
    }

    if (action.type === 'update_status') {
      // Example: Update outreach status
      await prisma.outreach.updateMany({
        where: { status: action.fromStatus },
        data: { status: action.toStatus },
      });
      executedActions.push({ type: 'status_update', success: true });
    }

    if (action.type === 'assign_campaign') {
      // Example: Auto-assign to campaign
      executedActions.push({ type: 'campaign_assignment', success: true });
    }
  }

  // Log execution
  await prisma.workflowExecution.create({
    data: {
      workflowId: workflow.id,
      triggeredBy: 'MANUAL',
      status: 'COMPLETED',
      actionsExecuted: executedActions.length,
      executedBy: session.user.id,
    },
  });

  return NextResponse.json({
    success: true,
    workflow: workflow.name,
    executedActions: executedActions.length,
    details: executedActions,
  });
}
