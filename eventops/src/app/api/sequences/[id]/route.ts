import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { activeEventId: true },
    });

    const sequence = await prisma.sequence.findFirst({
      where: {
        id: params.id,
        campaign: { eventId: user?.activeEventId },
      },
      include: {
        campaign: true,
        _count: { select: { outreach: true } },
      },
    });

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    return NextResponse.json({ sequence });
  } catch (error) {
    console.error('Error fetching sequence:', error);
    return NextResponse.json({ error: 'Failed to fetch sequence' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, steps, isActive } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (steps !== undefined) updateData.steps = steps;
    if (isActive !== undefined) updateData.isActive = isActive;

    const sequence = await prisma.sequence.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ sequence });
  } catch (error) {
    console.error('Error updating sequence:', error);
    return NextResponse.json({ error: 'Failed to update sequence' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.sequence.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Sequence deleted' });
  } catch (error) {
    console.error('Error deleting sequence:', error);
    return NextResponse.json({ error: 'Failed to delete sequence' }, { status: 500 });
  }
}
