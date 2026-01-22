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
        // TODO: Implement sequences - requires personId and eventId fields in sequences table
        return NextResponse.json({
          success: false,
          error: 'Sequence feature not yet implemented',
          action: 'add-to-sequence',
        }, { status: 501 });

      case 'update-status':
        // TODO: Add status field to people schema
        return NextResponse.json({
          success: false,
          error: 'Status field not yet implemented in people model',
          action: 'update-status',
        }, { status: 501 });

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
