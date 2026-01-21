import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/analytics/cohort - Cohort analysis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupBy = searchParams.get('groupBy') || 'month'; // month, week, persona, icpTier
    const metric = searchParams.get('metric') || 'response_rate'; // response_rate, meeting_rate, completion_rate

    let cohorts = [];

    if (groupBy === 'month' || groupBy === 'week') {
      // Time-based cohorts
      const outreach = await prisma.outreach.findMany({
        include: {
          person: {
            select: {
              persona: true,
              account: {
                select: { icpTier: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const cohortMap = new Map();

      for (const item of outreach) {
        const date = new Date(item.createdAt);
        const cohortKey =
          groupBy === 'month'
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            : `${date.getFullYear()}-W${Math.ceil((date.getDate() + new Date(date.getFullYear(), 0, 1).getDay()) / 7)}`;

        if (!cohortMap.has(cohortKey)) {
          cohortMap.set(cohortKey, {
            cohort: cohortKey,
            total: 0,
            sent: 0,
            opened: 0,
            responded: 0,
            meetings: 0,
          });
        }

        const cohort = cohortMap.get(cohortKey);
        cohort.total++;
        if (['SENT', 'OPENED', 'RESPONDED'].includes(item.status)) cohort.sent++;
        if (['OPENED', 'RESPONDED'].includes(item.status)) cohort.opened++;
        if (item.status === 'RESPONDED') cohort.responded++;
      }

      // Add meeting data
      const meetings = await prisma.meeting.findMany({
        include: {
          person: true,
        },
      });

      for (const meeting of meetings) {
        const date = new Date(meeting.createdAt);
        const cohortKey =
          groupBy === 'month'
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            : `${date.getFullYear()}-W${Math.ceil((date.getDate() + new Date(date.getFullYear(), 0, 1).getDay()) / 7)}`;

        const cohort = cohortMap.get(cohortKey);
        if (cohort) {
          cohort.meetings++;
        }
      }

      cohorts = Array.from(cohortMap.values()).map((c) => ({
        ...c,
        responseRate: c.sent > 0 ? (c.responded / c.sent) * 100 : 0,
        meetingRate: c.responded > 0 ? (c.meetings / c.responded) * 100 : 0,
      }));
    } else if (groupBy === 'persona') {
      // Persona-based cohorts
      const people = await prisma.person.findMany({
        include: {
          outreach: true,
          meetings: true,
        },
      });

      const cohortMap = new Map();

      for (const person of people) {
        const cohortKey = person.persona || 'Unknown';

        if (!cohortMap.has(cohortKey)) {
          cohortMap.set(cohortKey, {
            cohort: cohortKey,
            total: 0,
            sent: 0,
            responded: 0,
            meetings: 0,
          });
        }

        const cohort = cohortMap.get(cohortKey);
        cohort.total++;
        cohort.sent += person.outreach.filter((o) => ['SENT', 'OPENED', 'RESPONDED'].includes(o.status)).length;
        cohort.responded += person.outreach.filter((o) => o.status === 'RESPONDED').length;
        cohort.meetings += person.meetings.length;
      }

      cohorts = Array.from(cohortMap.values()).map((c) => ({
        ...c,
        responseRate: c.sent > 0 ? (c.responded / c.sent) * 100 : 0,
        meetingRate: c.responded > 0 ? (c.meetings / c.responded) * 100 : 0,
      }));
    } else if (groupBy === 'icpTier') {
      // ICP Tier-based cohorts
      const accounts = await prisma.targetAccount.findMany({
        include: {
          people: {
            include: {
              outreach: true,
              meetings: true,
            },
          },
        },
      });

      const cohortMap = new Map();

      for (const account of accounts) {
        const cohortKey = account.icpTier || 'Unknown';

        if (!cohortMap.has(cohortKey)) {
          cohortMap.set(cohortKey, {
            cohort: cohortKey,
            total: 0,
            sent: 0,
            responded: 0,
            meetings: 0,
          });
        }

        const cohort = cohortMap.get(cohortKey);
        cohort.total += account.people.length;

        for (const person of account.people) {
          cohort.sent += person.outreach.filter((o) => ['SENT', 'OPENED', 'RESPONDED'].includes(o.status)).length;
          cohort.responded += person.outreach.filter((o) => o.status === 'RESPONDED').length;
          cohort.meetings += person.meetings.length;
        }
      }

      cohorts = Array.from(cohortMap.values()).map((c) => ({
        ...c,
        responseRate: c.sent > 0 ? (c.responded / c.sent) * 100 : 0,
        meetingRate: c.responded > 0 ? (c.meetings / c.responded) * 100 : 0,
      }));
    }

    return NextResponse.json({ cohorts, groupBy, metric });
  } catch (error) {
    console.error('Error fetching cohort data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cohort data' },
      { status: 500 }
    );
  }
}
