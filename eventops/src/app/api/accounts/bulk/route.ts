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
    const { action, accountIds } = body;

    if (!action || !accountIds || !Array.isArray(accountIds)) {
      return NextResponse.json(
        { error: 'Missing action or accountIds' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'delete':
        // Delete all people associated with these accounts first
        await prisma.people.deleteMany({
          where: {
            accountId: { in: accountIds },
          },
        });

        // Delete the accounts
        result = await prisma.target_accounts.deleteMany({
          where: {
            id: { in: accountIds },
            eventId: user.activeEventId,
          },
        });
        break;

      case 'update-tier':
        const { tier } = body;
        if (!tier) {
          return NextResponse.json({ error: 'Missing tier' }, { status: 400 });
        }

        result = await prisma.target_accounts.updateMany({
          where: {
            id: { in: accountIds },
            eventId: user.activeEventId,
          },
          data: {
            tier,
            updatedAt: new Date(),
          },
        });
        break;

      case 'update-status':
        const { status } = body;
        if (!status) {
          return NextResponse.json({ error: 'Missing status' }, { status: 400 });
        }

        result = await prisma.target_accounts.updateMany({
          where: {
            id: { in: accountIds },
            eventId: user.activeEventId,
          },
          data: {
            status,
            updatedAt: new Date(),
          },
        });
        break;

      case 'export':
        // Get full account data for export
        const accounts = await prisma.target_accounts.findMany({
          where: {
            id: { in: accountIds },
            eventId: user.activeEventId,
          },
          include: {
            people: true,
          },
        });

        return NextResponse.json({
          success: true,
          data: accounts,
          count: accounts.length,
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
