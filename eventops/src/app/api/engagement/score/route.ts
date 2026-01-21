import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Calculate engagement scores for all accounts
 */
export async function POST(req: NextRequest) {
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

  // Get all accounts for active event
  const accounts = await prisma.targetAccount.findMany({
    where: { eventId: user.activeEventId },
    include: {
      people: {
        include: {
          outreach: true,
          meetings: true,
        },
      },
    },
  });

  const scores = accounts.map((account) => {
    let score = 0;
    let lastEngagedAt = null as Date | null;

    // Calculate engagement score
    account.people.forEach((person) => {
      // Outreach activity
      person.outreach.forEach((o) => {
        if (o.status === 'OPENED') score += 5;
        if (o.status === 'RESPONDED') score += 20;
        
        // Track most recent engagement
        const dates = [o.openedAt, o.respondedAt].filter(Boolean) as Date[];
        dates.forEach((d) => {
          if (!lastEngagedAt || d > lastEngagedAt) {
            lastEngagedAt = d;
          }
        });
      });

      // Meeting activity
      person.meetings.forEach((m) => {
        if (m.status === 'SCHEDULED') score += 30;
        if (m.status === 'COMPLETED') score += 50;
        
        if (!lastEngagedAt || new Date(m.scheduledAt) > lastEngagedAt) {
          lastEngagedAt = new Date(m.scheduledAt);
        }
      });
    });

    return {
      accountId: account.id,
      accountName: account.name,
      engagementScore: score,
      lastEngagedAt,
      icpScore: account.icpScore,
    };
  });

  // Sort by engagement score
  scores.sort((a, b) => b.engagementScore - a.engagementScore);

  return NextResponse.json({
    totalAccounts: scores.length,
    topEngaged: scores.slice(0, 50),
    averageScore: scores.reduce((sum, s) => sum + s.engagementScore, 0) / scores.length,
    scoresCalculated: scores.length,
  });
}

/**
 * Get engagement scores
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

  const { searchParams } = new URL(req.url);
  const minScore = parseInt(searchParams.get('minScore') || '0');
  const limit = parseInt(searchParams.get('limit') || '100');

  // Get accounts with outreach and meeting data
  const accounts = await prisma.targetAccount.findMany({
    where: { eventId: user.activeEventId },
    include: {
      people: {
        include: {
          outreach: true,
          meetings: true,
        },
      },
    },
    take: limit,
  });

  const scores = accounts
    .map((account) => {
      let score = 0;
      let lastEngagedAt = null as Date | null;
      let totalOutreach = 0;
      let totalMeetings = 0;

      account.people.forEach((person) => {
        totalOutreach += person.outreach.length;
        totalMeetings += person.meetings.length;

        person.outreach.forEach((o) => {
          if (o.status === 'OPENED') score += 5;
          if (o.status === 'RESPONDED') score += 20;

          const dates = [o.openedAt, o.respondedAt].filter(Boolean) as Date[];
          dates.forEach((d) => {
            if (!lastEngagedAt || d > lastEngagedAt) {
              lastEngagedAt = d;
            }
          });
        });

        person.meetings.forEach((m) => {
          if (m.status === 'SCHEDULED') score += 30;
          if (m.status === 'COMPLETED') score += 50;

          if (!lastEngagedAt || new Date(m.scheduledAt) > lastEngagedAt) {
            lastEngagedAt = new Date(m.scheduledAt);
          }
        });
      });

      return {
        accountId: account.id,
        accountName: account.name,
        engagementScore: score,
        lastEngagedAt,
        icpScore: account.icpScore,
        totalOutreach,
        totalMeetings,
        daysSinceEngagement: lastEngagedAt
          ? Math.floor((Date.now() - lastEngagedAt.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      };
    })
    .filter((s) => s.engagementScore >= minScore)
    .sort((a, b) => b.engagementScore - a.engagementScore);

  return NextResponse.json({
    accounts: scores,
    totalAccounts: scores.length,
  });
}
