import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/next-actions - Get AI-recommended next actions for user
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.users.findUnique({
    where: { email: session.user.email! },
  });

  if (!user?.activeEventId) {
    return NextResponse.json({ error: 'No active event' }, { status: 400 });
  }

  try {
    const actions: Array<{
      id: string;
      type: string;
      priority: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      entityType?: string;
      entityId?: string;
      dueDate?: Date;
    }> = [];

    // 1. Check for high-value accounts without outreach
    const untouchedAccounts = await prisma.target_accounts.findMany({
      where: {
        eventId: user.activeEventId,
        icpScore: { gte: 70 },
        people: {
          none: {
            outreach: {
              some: {},
            },
          },
        },
      },
      take: 3,
      orderBy: { icpScore: 'desc' },
    });

    untouchedAccounts.forEach(account => {
      actions.push({
        id: `outreach-${account.id}`,
        type: 'create_outreach',
        priority: 'high',
        title: `Reach out to ${account.name}`,
        description: `High-value account (ICP: ${account.icpScore}) with no contact yet`,
        entityType: 'account',
        entityId: account.id,
      });
    });

    // 2. Check for pending responses (opened but no reply)
    const openedNotReplied = await prisma.outreach.findMany({
      where: {
        person: {
          target_accounts: { eventId: user.activeEventId },
        },
        status: 'OPENED',
        openedAt: {
          lt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
        },
      },
      include: {
        people: { include: { account: true } },
      },
      take: 3,
    });

    openedNotReplied.forEach(outreach => {
      actions.push({
        id: `followup-${outreach.id}`,
        type: 'send_followup',
        priority: 'medium',
        title: `Follow up with ${outreach.people.name}`,
        description: `Opened your email ${Math.floor((Date.now() - (outreach.openedAt?.getTime() || 0)) / (1000 * 60 * 60))}h ago - send follow-up`,
        entityType: 'outreach',
        entityId: outreach.id,
      });
    });

    // 3. Check for meetings without notes
    const meetingsWithoutNotes = await prisma.Meeting.findMany({
      where: {
        person: {
          target_accounts: { eventId: user.activeEventId },
        },
        status: 'COMPLETED',
        OR: [
          { notes: null },
          { notes: '' },
        ],
        scheduledAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      include: {
        people: { include: { account: true } },
      },
      take: 3,
    });

    meetingsWithoutNotes.forEach(meeting => {
      actions.push({
        id: `notes-${meeting.id}`,
        type: 'add_meeting_notes',
        priority: 'high',
        title: `Add notes for meeting with ${meeting.people.name}`,
        description: `Meeting completed ${Math.floor((Date.now() - meeting.scheduledAt.getTime()) / (1000 * 60 * 60 * 24))} days ago - capture insights`,
        entityType: 'meeting',
        entityId: meeting.id,
      });
    });

    // 4. Check for upcoming meetings today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayMeetings = await prisma.Meeting.findMany({
      where: {
        person: {
          target_accounts: { eventId: user.activeEventId },
        },
        status: 'SCHEDULED',
        scheduledAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        people: { include: { account: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    todayMeetings.forEach(meeting => {
      const hoursUntil = (meeting.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
      
      actions.push({
        id: `prep-${meeting.id}`,
        type: 'prepare_meeting',
        priority: hoursUntil < 2 ? 'high' : 'medium',
        title: `Prepare for meeting with ${meeting.people.name}`,
        description: `Meeting in ${hoursUntil.toFixed(1)} hours at ${meeting.people.account.name}`,
        entityType: 'meeting',
        entityId: meeting.id,
        dueDate: meeting.scheduledAt,
      });
    });

    // 5. Check for low ICP scores to improve
    const lowScoreAccounts = await prisma.target_accounts.findMany({
      where: {
        eventId: user.activeEventId,
        OR: [
          { icpScore: { lt: 40 } },
          { icpScore: null },
        ],
      },
      take: 2,
      orderBy: { createdAt: 'desc' },
    });

    lowScoreAccounts.forEach(account => {
      actions.push({
        id: `enrich-${account.id}`,
        type: 'enrich_account',
        priority: 'low',
        title: `Enrich data for ${account.name}`,
        description: `Low ICP score (${account.icpScore || 0}) - add company info to improve targeting`,
        entityType: 'account',
        entityId: account.id,
      });
    });

    // Sort by priority and limit to top 10
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sortedActions = actions
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, 10);

    return NextResponse.json({
      actions: sortedActions,
      summary: {
        total: sortedActions.length,
        high: sortedActions.filter(a => a.priority === 'high').length,
        medium: sortedActions.filter(a => a.priority === 'medium').length,
        low: sortedActions.filter(a => a.priority === 'low').length,
      },
    });
  } catch (error: any) {
    console.error('Next actions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate actions' },
      { status: 500 }
    );
  }
}
