import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/analytics/funnel - Conversion funnel analysis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter = startDate && endDate
      ? {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }
      : {};

    const campaignFilter = campaignId ? { campaigns: { some: { id: campaignId } } } : {};

    // Funnel stages
    const totalAccounts = await prisma.targetAccount.count({
      where: { ...dateFilter },
    });

    const totalPeople = await prisma.person.count({
      where: {
        ...dateFilter,
      },
    });

    const outreachFilter = campaignId ? { campaignId } : {};

    const outreachSent = await prisma.outreach.count({
      where: {
        ...outreachFilter,
        status: { in: ['SENT', 'OPENED', 'RESPONDED'] },
        ...dateFilter,
      },
    });

    const outreachOpened = await prisma.outreach.count({
      where: {
        ...outreachFilter,
        status: { in: ['OPENED', 'RESPONDED'] },
        ...dateFilter,
      },
    });

    const outreachResponded = await prisma.outreach.count({
      where: {
        ...outreachFilter,
        status: 'RESPONDED',
        ...dateFilter,
      },
    });

    const meetingsScheduled = await prisma.meeting.count({
      where: {
        ...dateFilter,
      },
    });

    const meetingsCompleted = await prisma.meeting.count({
      where: {
        status: 'COMPLETED',
        ...dateFilter,
      },
    });

    // Calculate conversion rates
    const funnel = [
      {
        stage: 'Accounts',
        count: totalAccounts,
        percentage: 100,
        dropoff: 0,
      },
      {
        stage: 'People Identified',
        count: totalPeople,
        percentage: totalAccounts > 0 ? (totalPeople / totalAccounts) * 100 : 0,
        dropoff: totalAccounts - totalPeople,
      },
      {
        stage: 'Outreach Sent',
        count: outreachSent,
        percentage: totalPeople > 0 ? (outreachSent / totalPeople) * 100 : 0,
        dropoff: totalPeople - outreachSent,
      },
      {
        stage: 'Opened',
        count: outreachOpened,
        percentage: outreachSent > 0 ? (outreachOpened / outreachSent) * 100 : 0,
        dropoff: outreachSent - outreachOpened,
      },
      {
        stage: 'Responded',
        count: outreachResponded,
        percentage: outreachOpened > 0 ? (outreachResponded / outreachOpened) * 100 : 0,
        dropoff: outreachOpened - outreachResponded,
      },
      {
        stage: 'Meeting Scheduled',
        count: meetingsScheduled,
        percentage: outreachResponded > 0 ? (meetingsScheduled / outreachResponded) * 100 : 0,
        dropoff: outreachResponded - meetingsScheduled,
      },
      {
        stage: 'Meeting Completed',
        count: meetingsCompleted,
        percentage: meetingsScheduled > 0 ? (meetingsCompleted / meetingsScheduled) * 100 : 0,
        dropoff: meetingsScheduled - meetingsCompleted,
      },
    ];

    return NextResponse.json({
      funnel,
      overallConversion: totalAccounts > 0 ? (meetingsCompleted / totalAccounts) * 100 : 0,
    });
  } catch (error) {
    console.error('Error fetching funnel:', error);
    return NextResponse.json(
      { error: 'Failed to fetch funnel data' },
      { status: 500 }
    );
  }
}
