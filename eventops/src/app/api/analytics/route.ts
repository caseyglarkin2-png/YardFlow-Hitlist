import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Get analytics for campaigns and outreach performance
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

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaignId');

  // Get all outreach for the event
  const outreachQuery: any = {
    people: {
      target_accounts: {
        eventId: user.activeEventId,
      },
    },
  };

  if (campaignId) {
    outreachQuery.campaignId = campaignId;
  }

  const allOutreach = await prisma.outreach.findMany({
    where: outreachQuery,
    include: {
      people: {
        include: {
          target_accounts: true,
        },
      },
      campaigns: true,
    },
  });

  // Calculate metrics
  const totalOutreach = allOutreach.length;
  const byStatus = allOutreach.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byChannel = allOutreach.reduce((acc, o) => {
    acc[o.channel] = (acc[o.channel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sent = byStatus.SENT || 0;
  const opened = byStatus.OPENED || 0;
  const responded = byStatus.RESPONDED || 0;

  const openRate = sent > 0 ? (opened / sent) * 100 : 0;
  const responseRate = sent > 0 ? (responded / sent) * 100 : 0;

  // By persona
  const byPersona: Record<string, any> = {
    'Executive Ops': { total: 0, sent: 0, responded: 0 },
    Operations: { total: 0, sent: 0, responded: 0 },
    Procurement: { total: 0, sent: 0, responded: 0 },
    Sales: { total: 0, sent: 0, responded: 0 },
    Technology: { total: 0, sent: 0, responded: 0 },
    'Non-Ops': { total: 0, sent: 0, responded: 0 },
  };

  allOutreach.forEach((o) => {
    const person = o.people;
    let personaKey = 'Non-Ops';
    if (person.isExecOps) personaKey = 'Executive Ops';
    else if (person.isOps) personaKey = 'Operations';
    else if (person.isProc) personaKey = 'Procurement';
    else if (person.isSales) personaKey = 'Sales';
    else if (person.isTech) personaKey = 'Technology';

    byPersona[personaKey].total += 1;
    if (o.status === 'SENT' || o.status === 'OPENED' || o.status === 'RESPONDED') {
      byPersona[personaKey].sent += 1;
    }
    if (o.status === 'RESPONDED') {
      byPersona[personaKey].responded += 1;
    }
  });

  // By ICP tier
  const byIcpTier: Record<string, any> = {
    'Top Tier (90+)': { total: 0, sent: 0, responded: 0 },
    'High (75-89)': { total: 0, sent: 0, responded: 0 },
    'Medium (50-74)': { total: 0, sent: 0, responded: 0 },
    'Low (<50)': { total: 0, sent: 0, responded: 0 },
  };

  allOutreach.forEach((o) => {
    const score = o.people.target_accounts.icpScore || 0;
    let tier = 'Low (<50)';
    if (score >= 90) tier = 'Top Tier (90+)';
    else if (score >= 75) tier = 'High (75-89)';
    else if (score >= 50) tier = 'Medium (50-74)';

    byIcpTier[tier].total += 1;
    if (o.status === 'SENT' || o.status === 'OPENED' || o.status === 'RESPONDED') {
      byIcpTier[tier].sent += 1;
    }
    if (o.status === 'RESPONDED') {
      byIcpTier[tier].responded += 1;
    }
  });

  // Calculate response rates for each segment
  Object.keys(byPersona).forEach((key) => {
    const segment = byPersona[key];
    segment.responseRate = segment.sent > 0 ? (segment.responded / segment.sent) * 100 : 0;
  });

  Object.keys(byIcpTier).forEach((key) => {
    const segment = byIcpTier[key];
    segment.responseRate = segment.sent > 0 ? (segment.responded / segment.sent) * 100 : 0;
  });

  // Get meetings data
  const meetings = await prisma.meeting.findMany({
    where: {
      people: {
        target_accounts: {
          eventId: user.activeEventId,
        },
      },
    },
  });

  const totalMeetings = meetings.length;
  const completedMeetings = meetings.filter((m) => m.status === 'COMPLETED').length;
  const upcomingMeetings = meetings.filter(
    (m) => m.status === 'SCHEDULED' && new Date(m.scheduledAt) > new Date()
  ).length;

  return NextResponse.json({
    overview: {
      totalOutreach,
      sent,
      opened,
      responded,
      openRate: Math.round(openRate * 10) / 10,
      responseRate: Math.round(responseRate * 10) / 10,
      totalMeetings,
      completedMeetings,
      upcomingMeetings,
    },
    byStatus,
    byChannel,
    byPersona,
    byIcpTier,
  });
}
