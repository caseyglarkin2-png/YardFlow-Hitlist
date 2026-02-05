import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { captureRouteError } from '@/lib/sentry-utils';

// POST /api/accounts/[id]/assign - Assign account to user
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For session auth, lookup user by email. For S2S, use userId directly.
    let currentUserId = authResult.userId;
    let currentUserName: string | null = null;
    let currentUserEmail: string | null = authResult.email || null;

    if (authResult.type === 'session' && authResult.email) {
      const currentUser = await prisma.users.findUnique({
        where: { email: authResult.email },
      });
      if (currentUser) {
        currentUserId = currentUser.id;
        currentUserName = currentUser.name;
        currentUserEmail = currentUser.email;
      }
    } else if (authResult.type === 'service') {
      // For S2S, try to look up user by ID if provided
      const currentUser = await prisma.users.findUnique({
        where: { id: currentUserId },
      });
      if (currentUser) {
        currentUserName = currentUser.name;
        currentUserEmail = currentUser.email;
      }
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
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
        userId: currentUserId,
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
    if (userId !== currentUserId) {
      await prisma.notifications.create({
        data: {
          userId: userId,
          type: 'ASSIGNMENT',
          title: 'Account assigned to you',
          message: `${currentUserName || currentUserEmail || 'Someone'} assigned "${account.name}" to you`,
          metadata: {
            accountId: params.id,
            accountName: account.name,
            assignedBy: currentUserId,
          },
        },
      });
    }

    return NextResponse.json(account);
  } catch (error) {
    captureRouteError(error, {
      route: '/api/accounts/[id]/assign',
      method: 'POST',
      userId: authResult?.userId,
    });
    console.error('Error assigning account:', error);
    return NextResponse.json({ error: 'Failed to assign account' }, { status: 500 });
  }
}

// DELETE /api/accounts/[id]/assign - Unassign account
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For session auth, lookup user by email. For S2S, use userId directly.
    let currentUserId = authResult.userId;
    if (authResult.type === 'session' && authResult.email) {
      const currentUser = await prisma.users.findUnique({
        where: { email: authResult.email },
      });
      if (currentUser) {
        currentUserId = currentUser.id;
      }
    }

    const account = await prisma.target_accounts.update({
      where: { id: params.id },
      data: { assignedTo: null },
    });

    // Create activity log
    await prisma.activities.create({
      data: {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: currentUserId,
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
    captureRouteError(error, {
      route: '/api/accounts/[id]/assign',
      method: 'DELETE',
      userId: authResult?.userId,
    });
    console.error('Error unassigning account:', error);
    return NextResponse.json({ error: 'Failed to unassign account' }, { status: 500 });
  }
}
