import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { outreachId, type, metadata } = body;

    if (!outreachId || !type) {
      return NextResponse.json(
        { error: 'Missing outreachId or type' },
        { status: 400 }
      );
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
    const updateData: any = { updatedAt: new Date() };

    if (type === 'RESPONDED' && outreach.status !== 'RESPONDED') {
      newStatus = 'RESPONDED';
      updateData.status = 'RESPONDED';
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
        userId: session.user.id,
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
