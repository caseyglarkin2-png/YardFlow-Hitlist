import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { OutreachStatus } from '@prisma/client';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { ids, status, campaignId, sequenceId } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs array required' }, { status: 400 });
    }

    const updateData: { status?: OutreachStatus; campaignId?: string; sequenceId?: string } = {};
    if (status) updateData.status = status as OutreachStatus;
    if (campaignId !== undefined) updateData.campaignId = campaignId;
    if (sequenceId !== undefined) updateData.sequenceId = sequenceId;

    const result = await prisma.outreach.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    return NextResponse.json({
      updated: result.count,
      message: `Updated ${result.count} outreach messages`,
    });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/outreach/bulk',
      method: 'PATCH',
      userId: authResult?.userId,
    });
    console.error('Error bulk updating outreach:', error);
    return NextResponse.json({ error: 'Failed to update outreach' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs array required' }, { status: 400 });
    }

    const result = await prisma.outreach.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      deleted: result.count,
      message: `Deleted ${result.count} outreach messages`,
    });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/outreach/bulk',
      method: 'DELETE',
      userId: authResult?.userId,
    });
    console.error('Error bulk deleting outreach:', error);
    return NextResponse.json({ error: 'Failed to delete outreach' }, { status: 500 });
  }
}
