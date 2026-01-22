import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// POST /api/accounts/[id]/assign - Assign account to user
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.users.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Verify the target user exists
    const targetUser = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Update account assignment
    const account = await prisma.target_accounts.update({
      where: { id: params.id },
      data: { assignedTo: userId },
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create activity log
    await prisma.activities.create({
      data: {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: currentUser.id,
        entityType: 'account',
        entityId: params.id,
        action: 'ASSIGNED',
        description: `Assigned account "${account.name}" to ${targetUser.name || targetUser.email}`,
        metadata: {
          accountName: account.name,
          assignedToId: userId,
          assignedToName: targetUser.name,
        },
      },
    });

    // Create notification for assignee
    if (userId !== currentUser.id) {
      await prisma.notifications.create({
        data: {
          userId: userId,
          type: 'ASSIGNMENT',
          title: 'Account assigned to you',
          message: `${currentUser.name || currentUser.email} assigned "${account.name}" to you`,
          metadata: {
            accountId: params.id,
            accountName: account.name,
            assignedBy: currentUser.id,
          },
        },
      });
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error assigning account:', error);
    return NextResponse.json(
      { error: 'Failed to assign account' },
      { status: 500 }
    );
  }
}

// DELETE /api/accounts/[id]/assign - Unassign account
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.users.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const account = await prisma.target_accounts.update({
      where: { id: params.id },
      data: { assignedTo: null },
    });

    // Create activity log
    await prisma.activities.create({
      data: {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: currentUser.id,
        entityType: 'account',
        entityId: params.id,
        action: 'UNASSIGNED',
        description: `Unassigned account "${account.name}"`,
        metadata: {
          accountName: account.name,
        },
      },
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error unassigning account:', error);
    return NextResponse.json(
      { error: 'Failed to unassign account' },
      { status: 500 }
    );
  }
}
