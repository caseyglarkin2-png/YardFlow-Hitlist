import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const savedSearch = await prisma.saved_searches.findFirst({
      where: {
        id: params.id,
        OR: [
          { userId: user.id },
          { isGlobal: true },
        ],
      },
      include: {
        users: {
          select: { name: true, email: true },
        },
      },
    });

    if (!savedSearch) {
      return NextResponse.json({ error: 'Saved search not found' }, { status: 404 });
    }

    return NextResponse.json(savedSearch);
  } catch (error) {
    console.error('Error fetching saved search:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved search' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, filters, isGlobal } = body;

    const savedSearch = await prisma.saved_searches.findFirst({
      where: {
        id: params.id,
        userId: user.id, // Only owner can update
      },
    });

    if (!savedSearch) {
      return NextResponse.json(
        { error: 'Saved search not found or unauthorized' },
        { status: 404 }
      );
    }

    const updated = await prisma.saved_searches.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(filters && { filters }),
        ...(isGlobal !== undefined && { isGlobal }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating saved search:', error);
    return NextResponse.json(
      { error: 'Failed to update saved search' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const savedSearch = await prisma.saved_searches.findFirst({
      where: {
        id: params.id,
        userId: user.id, // Only owner can delete
      },
    });

    if (!savedSearch) {
      return NextResponse.json(
        { error: 'Saved search not found or unauthorized' },
        { status: 404 }
      );
    }

    await prisma.saved_searches.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting saved search:', error);
    return NextResponse.json(
      { error: 'Failed to delete saved search' },
      { status: 500 }
    );
  }
}
