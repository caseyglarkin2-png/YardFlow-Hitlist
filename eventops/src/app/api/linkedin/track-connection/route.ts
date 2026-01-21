import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Track LinkedIn connection status changes
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { personId, status } = await req.json();

  if (!personId || !status) {
    return NextResponse.json(
      { error: 'personId and status required' },
      { status: 400 }
    );
  }

  // Create or update outreach record for LinkedIn connection
  const existingOutreach = await prisma.outreach.findFirst({
    where: {
      personId,
      channel: 'LINKEDIN',
      message: { contains: 'LinkedIn connection request' },
    },
  });

  if (existingOutreach) {
    // Update existing
    await prisma.outreach.update({
      where: { id: existingOutreach.id },
      data: {
        status: status === 'CONNECTED' ? 'RESPONDED' : status === 'DECLINED' ? 'BOUNCED' : 'SENT',
        notes: `LinkedIn connection ${status.toLowerCase()} on ${new Date().toISOString()}`,
      },
    });
  } else {
    // Create new
    await prisma.outreach.create({
      data: {
        personId,
        channel: 'LINKEDIN',
        status: status === 'CONNECTED' ? 'RESPONDED' : status === 'DECLINED' ? 'BOUNCED' : 'SENT',
        message: 'LinkedIn connection request sent',
        sentAt: new Date(),
        sentBy: session.user.id,
        notes: `LinkedIn connection ${status.toLowerCase()} on ${new Date().toISOString()}`,
      },
    });
  }

  return NextResponse.json({ success: true });
}

/**
 * Get LinkedIn activity stats
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });

  if (!user?.activeEventId) {
    return NextResponse.json({ error: 'No active event' }, { status: 400 });
  }

  // Get LinkedIn outreach stats
  const linkedInOutreach = await prisma.outreach.findMany({
    where: {
      person: {
        account: {
          eventId: user.activeEventId,
        },
      },
      channel: 'LINKEDIN',
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisWeek = new Date();
  thisWeek.setDate(thisWeek.getDate() - 7);

  const sentToday = linkedInOutreach.filter(
    (o) => o.sentAt && o.sentAt >= today
  ).length;

  const sentThisWeek = linkedInOutreach.filter(
    (o) => o.sentAt && o.sentAt >= thisWeek
  ).length;

  const connected = linkedInOutreach.filter((o) => o.status === 'RESPONDED').length;
  const pending = linkedInOutreach.filter((o) => o.status === 'SENT').length;
  const declined = linkedInOutreach.filter((o) => o.status === 'BOUNCED').length;

  return NextResponse.json({
    total: linkedInOutreach.length,
    sentToday,
    sentThisWeek,
    connected,
    pending,
    declined,
    connectionRate: linkedInOutreach.length > 0 ? (connected / linkedInOutreach.length) * 100 : 0,
    canSendToday: sentToday < 20,
    remainingToday: Math.max(0, 20 - sentToday),
  });
}
