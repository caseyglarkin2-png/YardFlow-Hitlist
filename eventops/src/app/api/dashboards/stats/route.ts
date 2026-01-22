import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

// GET /api/dashboards/stats - Dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get date range for change calculations
    const today = new Date();
    const last30Days = subDays(today, 30);
    const previous30Days = subDays(today, 60);

    // Get total counts
    const [accounts, people, campaigns, currentMeetings, previousMeetings, totalOutreach, openedCount, repliedCount] = await Promise.all([
      prisma.targetAccount.count(),
      prisma.person.count(),
      prisma.campaign.count(),
      prisma.meeting.count({
        where: { 
          createdAt: { gte: last30Days }
        }
      }),
      prisma.meeting.count({
        where: { 
          createdAt: { 
            gte: previous30Days,
            lt: last30Days 
          }
        }
      }),
      prisma.outreach.count(),
      prisma.outreach.count({
        where: { openedAt: { not: null } },
      }),
      prisma.outreach.count({
        where: { respondedAt: { not: null } },
      }),
    ]);

    // Calculate response rate
    const totalSent = totalOutreach;
    const totalReplied = repliedCount;
    const responseRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0;

    // Calculate meetings change
    const meetingsChange = previousMeetings > 0 
      ? Math.round(((currentMeetings - previousMeetings) / previousMeetings) * 100) 
      : currentMeetings > 0 ? 100 : 0;

    // Get meetings by day (last 7 days)
    const last7Days = subDays(today, 7);
    const meetingsByDay = await Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const day = subDays(today, 6 - i);
        const count = await prisma.meeting.count({
          where: {
            createdAt: {
              gte: startOfDay(day),
              lte: endOfDay(day),
            },
          },
        });
        return {
          name: format(day, 'EEE'),
          value: count,
        };
      })
    );

    // Get top campaigns
    const recentCampaigns = await prisma.campaign.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        outreach: {
          select: {
            id: true,
            openedAt: true,
            respondedAt: true,
          },
        },
      },
    });

    const campaignStats = recentCampaigns.map(campaign => ({
      name: campaign.name,
      sent: campaign.outreach.length,
      opened: campaign.outreach.filter(o => o.openedAt).length,
      replied: campaign.outreach.filter(o => o.respondedAt).length,
    }));

    // Get recent activity (last 10 actions)
    const recentActivity = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const activityFeed = recentActivity.map(log => ({
      id: log.id,
      type: log.action,
      description: `${log.action} ${log.entityType}`,
      timestamp: log.createdAt.toISOString(),
      user: log.user.name || log.user.email,
    }));

    return NextResponse.json({
      accounts,
      people,
      campaigns,
      meetings: currentMeetings,
      outreachSent: totalSent,
      responseRate,
      accountsChange: 0, // Would need historical data to calculate
      meetingsChange,
      recentCampaigns: campaignStats,
      meetingsByDay,
      recentActivity: activityFeed,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
