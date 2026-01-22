import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/briefing/daily
 * 
 * Returns the daily intelligence brief for event day:
 * - Top 10 people to meet today (by ICP score + engagement)
 * - Upcoming meetings
 * - Hot leads (recent positive engagement)
 * - Follow-ups needed
 */
export async function GET(req: NextRequest) {
  try {
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

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's meetings
    const todaysMeetings = await prisma.meeting.findMany({
      where: {
        scheduledAt: {
          gte: today,
          lt: tomorrow,
        },
        people: {
          target_accounts: {
            eventId: user.activeEventId,
          },
        },
      },
      include: {
        people: {
          include: {
            target_accounts: {
              select: {
                name: true,
                icpScore: true,
                industry: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    // Get all people for this event with engagement data
    const allPeople = await prisma.people.findMany({
      where: {
        target_accounts: {
          eventId: user.activeEventId,
        },
      },
      include: {
        target_accounts: {
          select: {
            name: true,
            icpScore: true,
            industry: true,
            headquarters: true,
          },
        },
        outreach: {
          select: {
            status: true,
            sentAt: true,
            respondedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
        meetings: {
          select: {
            scheduledAt: true,
            status: true,
          },
          orderBy: {
            scheduledAt: 'desc',
          },
          take: 3,
        },
      },
    });

    // Calculate priority score for each person
    const scoredPeople = allPeople.map((person) => {
      let score = 0;
      
      // ICP score weight (40%)
      const icpScore = person.target_accounts.icpScore || 0;
      score += icpScore * 0.4;

      // Recent engagement weight (30%)
      const recentOutreach = person.outreach.filter(
        (o) => o.sentAt && o.sentAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );
      const recentReplies = recentOutreach.filter((o) => o.respondedAt);
      if (recentOutreach.length > 0) {
        score += (recentReplies.length / recentOutreach.length) * 30;
      }

      // Meeting history weight (20%)
      const completedMeetings = person.meetings.filter((m) => m.status === 'COMPLETED');
      if (person.meetings.length > 0) {
        score += (completedMeetings.length / person.meetings.length) * 20;
      }

      // Role seniority boost (10%)
      if (person.isExecOps) score += 10;
      else if (person.isOps) score += 7;
      else if (person.isSales) score += 5;

      return {
        ...person,
        priorityScore: Math.round(score),
      };
    });

    // Top 10 people to meet
    const topPeople = scoredPeople
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        name: p.name,
        title: p.title,
        email: p.email,
        phone: p.phone,
        linkedin: p.linkedin,
        company: p.target_accounts.name,
        icpScore: p.target_accounts.icpScore,
        priorityScore: p.priorityScore,
        industry: p.target_accounts.industry,
        headquarters: p.target_accounts.headquarters,
        recentEngagement: p.outreach.length > 0,
        lastMeeting: p.meetings[0]?.scheduledAt || null,
        persona: p.isExecOps
          ? 'Executive Operations'
          : p.isOps
          ? 'Operations'
          : p.isProc
          ? 'Procurement'
          : p.isSales
          ? 'Sales'
          : p.isTech
          ? 'Technology'
          : 'Other',
      }));

    // Hot leads (responded in last 48 hours)
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const hotLeads = allPeople
      .filter((p) => p.outreach.some((o) => o.respondedAt && o.respondedAt > twoDaysAgo))
      .map((p) => ({
        id: p.id,
        name: p.name,
        title: p.title,
        company: p.target_accounts.name,
        lastResponse: p.outreach.find((o) => o.respondedAt)?.respondedAt,
      }))
      .slice(0, 5);

    // Follow-ups needed (sent > 3 days ago, no response)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const needsFollowUp = allPeople
      .filter((p) =>
        p.outreach.some(
          (o) =>
            o.sentAt &&
            o.sentAt < threeDaysAgo &&
            !o.respondedAt &&
            o.status === 'SENT'
        )
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        title: p.title,
        company: p.target_accounts.name,
        daysSinceSent: Math.floor(
          (Date.now() - (p.outreach.find((o) => o.sentAt)?.sentAt?.getTime() || 0)) /
            (24 * 60 * 60 * 1000)
        ),
      }))
      .slice(0, 5);

    return NextResponse.json({
      date: today.toISOString(),
      summary: {
        meetingsToday: todaysMeetings.length,
        topPeopleCount: topPeople.length,
        hotLeadsCount: hotLeads.length,
        followUpsNeeded: needsFollowUp.length,
      },
      todaysMeetings: todaysMeetings.map((m) => ({
        id: m.id,
        time: m.scheduledAt,
        duration: m.duration,
        person: {
          name: m.people.name,
          title: m.people.title,
          company: m.people.target_accounts.name,
        },
        location: m.location,
        status: m.status,
      })),
      topPeople,
      hotLeads,
      needsFollowUp,
    });
  } catch (error) {
    console.error('Daily briefing error:', error);
    return NextResponse.json(
      { error: 'Failed to generate daily briefing' },
      { status: 500 }
    );
  }
}
