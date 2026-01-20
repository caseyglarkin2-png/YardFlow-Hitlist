import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const accountSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  website: z.string().url().optional().or(z.literal('')),
  industry: z.string().optional(),
  headquarters: z.string().optional(),
  icpScore: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's active event
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { activeEventId: true },
    });

    if (!user?.activeEventId) {
      return NextResponse.json(
        { error: 'No active event selected. Please select an event first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = accountSchema.parse(body);

    const account = await prisma.targetAccount.create({
      data: {
        name: data.name,
        website: data.website || null,
        industry: data.industry || null,
        headquarters: data.headquarters || null,
        icpScore: data.icpScore ?? null,
        notes: data.notes || null,
        eventId: user.activeEventId,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { activeEventId: true },
    });

    if (!user?.activeEventId) {
      return NextResponse.json([]);
    }

    const accounts = await prisma.targetAccount.findMany({
      where: { eventId: user.activeEventId },
      include: {
        _count: {
          select: { people: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
