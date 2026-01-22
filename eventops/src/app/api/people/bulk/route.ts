import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.activeEventId) {
      return NextResponse.json({ error: 'No active event' }, { status: 400 });
    }

    const body = await request.json();
    const { action, personIds } = body;

    if (!action || !personIds || !Array.isArray(personIds)) {
      return NextResponse.json(
        { error: 'Missing action or personIds' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'delete':
        result = await prisma.people.deleteMany({
          where: {
            id: { in: personIds },
            target_accounts: { eventId: user.activeEventId },
          },
        });
        break;

      case 'add-to-sequence':
        const { sequenceTemplateId } = body;
        if (!sequenceTemplateId) {
          return NextResponse.json(
            { error: 'Missing sequenceTemplateId' },
            { status: 400 }
          );
        }

        // Get the sequence template
        const template = await prisma.sequenceTemplates.findUnique({
          where: { id: sequenceTemplateId },
        });

        if (!template) {
          return NextResponse.json(
            { error: 'Sequence template not found' },
            { status: 404 }
          );
        }

        // Create sequences for each person
        const sequences = [];
        for (const personId of personIds) {
          const sequence = await prisma.sequences.create({
            data: {
              id: `seq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              personId,
              eventId: user.activeEventId,
              name: template.name,
              steps: template.steps,
              isActive: true,
              status: 'ACTIVE',
              currentStep: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          sequences.push(sequence);
        }

        return NextResponse.json({
          success: true,
          count: sequences.length,
          action: 'add-to-sequence',
        });

      case 'update-status':
        const { status } = body;
        if (!status) {
          return NextResponse.json({ error: 'Missing status' }, { status: 400 });
        }

        result = await prisma.people.updateMany({
          where: {
            id: { in: personIds },
            target_accounts: { eventId: user.activeEventId },
          },
          data: {
            status,
            updatedAt: new Date(),
          },
        });
        break;

      case 'assign-owner':
        const { ownerId } = body;
        if (!ownerId) {
          return NextResponse.json({ error: 'Missing ownerId' }, { status: 400 });
        }

        result = await prisma.people.updateMany({
          where: {
            id: { in: personIds },
            target_accounts: { eventId: user.activeEventId },
          },
          data: {
            assignedTo: ownerId,
            updatedAt: new Date(),
          },
        });
        break;

      case 'export':
        // Get full people data for export
        const people = await prisma.people.findMany({
          where: {
            id: { in: personIds },
            target_accounts: { eventId: user.activeEventId },
          },
          include: {
            target_accounts: true,
          },
        });

        return NextResponse.json({
          success: true,
          data: people,
          count: people.length,
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      count: result?.count || 0,
      action,
    });
  } catch (error) {
    console.error('Bulk action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
