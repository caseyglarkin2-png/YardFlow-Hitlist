import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/locks - Acquire edit lock
export async function POST(request: NextRequest) {
  try {
    const { userId, entityType, entityId } = await request.json();

    if (!userId || !entityType || !entityId) {
      return NextResponse.json(
        { error: 'User ID, entity type, and entity ID required' },
        { status: 400 }
      );
    }

    // Check for existing lock
    const existingLock = await prisma.editLock.findFirst({
      where: {
        entityType,
        entityId,
        expiresAt: { gte: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (existingLock && existingLock.userId !== userId) {
      return NextResponse.json(
        {
          error: 'Entity is locked by another user',
          lock: existingLock,
        },
        { status: 409 }
      );
    }

    // Create or extend lock (5 minutes)
    const lock = await prisma.editLock.upsert({
      where: {
        userId_entityType_entityId: {
          userId,
          entityType,
          entityId,
        },
      },
      update: {
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
      create: {
        userId,
        entityType,
        entityId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(lock);
  } catch (error) {
    console.error('Error acquiring lock:', error);
    return NextResponse.json(
      { error: 'Failed to acquire lock' },
      { status: 500 }
    );
  }
}

// DELETE /api/locks - Release edit lock
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!userId || !entityType || !entityId) {
      return NextResponse.json(
        { error: 'User ID, entity type, and entity ID required' },
        { status: 400 }
      );
    }

    await prisma.editLock.deleteMany({
      where: {
        userId,
        entityType,
        entityId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error releasing lock:', error);
    return NextResponse.json(
      { error: 'Failed to release lock' },
      { status: 500 }
    );
  }
}

// GET /api/locks - Check lock status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'Entity type and entity ID required' },
        { status: 400 }
      );
    }

    const lock = await prisma.editLock.findFirst({
      where: {
        entityType,
        entityId,
        expiresAt: { gte: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(lock || null);
  } catch (error) {
    console.error('Error checking lock:', error);
    return NextResponse.json(
      { error: 'Failed to check lock' },
      { status: 500 }
    );
  }
}
