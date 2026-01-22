import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/analytics/predictions - Predictive analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get('personId');

    if (personId) {
      // Individual prediction
      const person = await prisma.people.findUnique({
        where: { id: personId },
        include: {
          outreach: true,
          meetings: true,
          target_accounts: {
            select: {
              icpScore: true,
              industry: true,
              headquarters: true,
              name: true,
            },
          },
        },
      });

      if (!person) {
        return NextResponse.json({ error: 'Person not found' }, { status: 404 });
      }

      // Calculate prediction score (0-100)
      let score = 0;

      // ICP score weight (40%)
      if (person.target_accounts.icpScore) {
        score += (person.target_accounts.icpScore / 100) * 40;
      }

      // Engagement history weight (30%)
      const totalOutreach = person.outreach.length;
      const responded = person.outreach.filter((o) => o.status === 'RESPONDED').length;
      if (totalOutreach > 0) {
        score += (responded / totalOutreach) * 30;
      }

      // Meeting history weight (20%)
      const completedMeetings = person.meetings.filter((m) => m.status === 'COMPLETED').length;
      if (person.meetings.length > 0) {
        score += (completedMeetings / person.meetings.length) * 20;
      } else if (responded > 0) {
        score += 10; // Bonus for responsiveness
      }

      // Seniority weight (10%)
      const seniorTitles = ['VP', 'Director', 'Head', 'Chief', 'Manager', 'Lead'];
      if (person.title && seniorTitles.some((t) => person.title?.includes(t))) {
        score += 10;
      }

      return NextResponse.json({
        personId: person.id,
        score: Math.round(score),
        factors: {
          icpScore: person.target_accounts.icpScore,
          engagementRate: totalOutreach > 0 ? (responded / totalOutreach) * 100 : 0,
          meetingCompletionRate:
            person.meetings.length > 0 ? (completedMeetings / person.meetings.length) * 100 : 0,
          title: person.title,
        },
        recommendation:
          score >= 70
            ? 'HIGH - Prioritize for immediate outreach'
            : score >= 40
            ? 'MEDIUM - Include in standard campaigns'
            : 'LOW - Consider lower priority or nurture campaigns',
      });
    } else {
      // Aggregate predictions
      const people = await prisma.people.findMany({
        include: {
          outreach: true,
          meetings: true,
          target_accounts: {
            select: {
              icpScore: true,
              name: true,
            },
          },
        },
        take: 100,
      });

      const predictions = people.map((person) => {
        let score = 0;

        if (person.target_accounts.icpScore) {
          score += (person.target_accounts.icpScore / 100) * 40;
        }

        const totalOutreach = person.outreach.length;
        const responded = person.outreach.filter((o) => o.status === 'RESPONDED').length;
        if (totalOutreach > 0) {
          score += (responded / totalOutreach) * 30;
        }

        const completedMeetings = person.meetings.filter((m) => m.status === 'COMPLETED').length;
        if (person.meetings.length > 0) {
          score += (completedMeetings / person.meetings.length) * 20;
        } else if (responded > 0) {
          score += 10;
        }

        const seniorTitles = ['VP', 'Director', 'Head', 'Chief', 'Manager', 'Lead'];
        if (person.title && seniorTitles.some((t) => person.title?.includes(t))) {
          score += 10;
        }

        return {
          personId: person.id,
          name: person.name,
          title: person.title,
          score: Math.round(score),
        };
      });

      // Sort by score
      predictions.sort((a, b) => b.score - a.score);

      return NextResponse.json({
        topPredictions: predictions.slice(0, 20),
        summary: {
          total: predictions.length,
          high: predictions.filter((p) => p.score >= 70).length,
          medium: predictions.filter((p) => p.score >= 40 && p.score < 70).length,
          low: predictions.filter((p) => p.score < 40).length,
        },
      });
    }
  } catch (error) {
    console.error('Error generating predictions:', error);
    return NextResponse.json(
      { error: 'Failed to generate predictions' },
      { status: 500 }
    );
  }
}
