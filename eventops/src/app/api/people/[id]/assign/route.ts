import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

// POST /api/people/[id]/assign - Assign person to user
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
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

    // Update person assignment
    const person = await prisma.people.update({
      where: { id: params.id },
      data: { assignedTo: userId },
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
        target_accounts: {
          select: { name: true },
        },
      },
    });

    // Create activity log
    await prisma.activities.create({
      data: {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: currentUser.id,
        entityType: 'person',
        entityId: params.id,
        action: 'ASSIGNED',
        description: `Assigned contact "${person.name}" to ${targetUser.name || targetUser.email}`,
        metadata: {
          personName: person.name,
          companyName: person.target_accounts.name,
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
          title: 'Contact assigned to you',
          message: `${currentUser.name || currentUser.email} assigned "${person.name}" from ${person.target_accounts.name} to you`,
          metadata: {
            personId: params.id,
            personName: person.name,
            companyName: person.target_accounts.name,
            assignedBy: currentUser.id,
          },
        },
      });
    }

    return NextResponse.json(person);
  } catch (error) {
    console.error('Error assigning person:', error);
    return NextResponse.json(
      { error: 'Failed to assign person' },
      { status: 500 }
    );
  }
}

// DELETE /api/people/[id]/assign - Unassign person
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.users.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const person = await prisma.people.update({
      where: { id: params.id },
      data: { assignedTo: null },
    });

    // Create activity log
    await prisma.activities.create({
      data: {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: currentUser.id,
        entityType: 'person',
        entityId: params.id,
        action: 'UNASSIGNED',
        description: `Unassigned contact "${person.name}"`,
        metadata: {
          personName: person.name,
        },
      },
    });

    return NextResponse.json(person);
  } catch (error) {
    console.error('Error unassigning person:', error);
    return NextResponse.json(
      { error: 'Failed to unassign person' },
      { status: 500 }
    );
  }
}
