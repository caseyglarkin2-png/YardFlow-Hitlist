import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { OutreachStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get userId from auth result
    const userId = authResult.type === 'session' 
      ? authResult.userId 
      : request.headers.get('x-user-id') || authResult.userId;

    const body = await request.json();
    const { outreachId, type, metadata } = body;

    if (!outreachId || !type) {
      return NextResponse.json({ error: 'Missing outreachId or type' }, { status: 400 });
    }

    // Find the outreach record
    const outreach = await prisma.outreach.findUnique({
      where: { id: outreachId },
    });

    if (!outreach) {
      return NextResponse.json({ error: 'Outreach not found' }, { status: 404 });
    }

    // Update status based on activity type
    let newStatus = outreach.status;
    const updateData: {
      updatedAt: Date;
      status?: OutreachStatus;
      repliedAt?: Date;
      clickedAt?: Date;
    } = {
      updatedAt: new Date(),
    };

    if (type === 'RESPONDED' && outreach.status !== OutreachStatus.RESPONDED) {
      newStatus = OutreachStatus.RESPONDED;
      updateData.status = OutreachStatus.RESPONDED;
      updateData.repliedAt = new Date();
    } else if (type === 'CLICKED' && outreach.status === 'OPENED') {
      // Track clicks but don't change status if already replied
      updateData.clickedAt = new Date();
    }

    // Update outreach record
    await prisma.outreach.update({
      where: { id: outreachId },
      data: updateData,
    });

    // Log the activity
    await prisma.activities.create({
      data: {
        userId: userId,
        entityType: 'outreach',
        entityId: outreachId,
        action: type as string,
        description: `Outreach activity: ${type}`,
        metadata: {
          outreachId,
          personId: outreach.personId,
          subject: outreach.subject,
          ...metadata,
        },
      },
    });

    return NextResponse.json({
      success: true,
      status: newStatus,
    });
  } catch (error) {
    console.error('Error tracking email activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
