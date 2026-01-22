import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/campaigns/[id]
 * Get campaign details with metrics
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaign = await prisma.campaigns.findUnique({
      where: { id: params.id },
      include: {
        events: true,
        _count: {
          select: {
            outreach: true,
            sequences: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get outreach metrics
    const outreachStats = await prisma.outreach.groupBy({
      by: ['status'],
      where: { campaignId: params.id },
      _count: true,
    });

    const metrics = {
      total: outreachStats.reduce((sum, stat) => sum + stat._count, 0),
      draft: outreachStats.find(s => s.status === 'DRAFT')?._count || 0,
      sent: outreachStats.find(s => s.status === 'SENT')?._count || 0,
      opened: outreachStats.find(s => s.status === 'OPENED')?._count || 0,
      responded: outreachStats.find(s => s.status === 'RESPONDED')?._count || 0,
      responseRate: 0,
    };

    if (metrics.sent > 0) {
      metrics.responseRate = Math.round((metrics.responded / metrics.sent) * 100);
    }

    return NextResponse.json({
      campaign,
      metrics,
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 });
  }
}

/**
 * PATCH /api/campaigns/[id]
 * Update campaign
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, status, goals, startDate, endDate } = body;

    const campaign = await prisma.campaigns.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(goals && { goals: JSON.stringify(goals) }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
      },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

/**
 * DELETE /api/campaigns/[id]
 * Delete campaign
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.campaigns.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
