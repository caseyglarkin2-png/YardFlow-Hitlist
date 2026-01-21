import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { ids, status, campaignId, sequenceId } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs array required' }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (campaignId !== undefined) updateData.campaignId = campaignId;
    if (sequenceId !== undefined) updateData.sequenceId = sequenceId;

    const result = await prisma.outreach.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    return NextResponse.json({ 
      updated: result.count,
      message: `Updated ${result.count} outreach messages`
    });
  } catch (error) {
    console.error('Error bulk updating outreach:', error);
    return NextResponse.json({ error: 'Failed to update outreach' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
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
      message: `Deleted ${result.count} outreach messages`
    });
  } catch (error) {
    console.error('Error bulk deleting outreach:', error);
    return NextResponse.json({ error: 'Failed to delete outreach' }, { status: 500 });
  }
}
