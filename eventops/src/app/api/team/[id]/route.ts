import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authServiceOrSession } from '@/lib/auth-service';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

// PATCH /api/team/[id] - Update team member role
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.users.findUnique({
      where: { id: authResult.userId },
    });

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { role } = await request.json();

    if (!role || !['ADMIN', 'MEMBER'].includes(role)) {
      return NextResponse.json({ error: 'Valid role required (ADMIN or MEMBER)' }, { status: 400 });
    }

    // Don't allow user to change their own role
    if (currentUser.id === params.id) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }

    const user = await prisma.users.update({
      where: { id: params.id },
      data: { role },
    });

    return NextResponse.json(user);
  } catch (error) {
    captureRouteError(error, {
      route: '/api/team/[id]',
      method: 'PATCH',
      userId: authResult?.userId,
    });
    console.error('Error updating team member:', error);
    return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 });
  }
}

// DELETE /api/team/[id] - Remove team member
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.users.findUnique({
      where: { id: authResult.userId },
    });

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Don't allow user to delete themselves
    if (currentUser.id === params.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    await prisma.users.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/team/[id]',
      method: 'DELETE',
      userId: authResult?.userId,
    });
    console.error('Error removing team member:', error);
    return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
  }
}
