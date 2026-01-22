import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { autoRecalculateScore } from '@/lib/auto-recalculate';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const personSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  name: z.string().min(1, 'Name is required'),
  title: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  linkedin: z.string().url().optional().or(z.literal('')),
  isExecOps: z.boolean().optional(),
  isOps: z.boolean().optional(),
  isProc: z.boolean().optional(),
  isSales: z.boolean().optional(),
  isTech: z.boolean().optional(),
  isNonOps: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = personSchema.parse(body);

    // Verify account exists and belongs to user's active event
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { activeEventId: true },
    });

    if (!user?.activeEventId) {
      return NextResponse.json(
        { error: 'No active event selected' },
        { status: 400 }
      );
    }

    const account = await prisma.target_accounts.findFirst({
      where: {
        id: data.accountId,
        eventId: user.activeEventId,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found or does not belong to active event' },
        { status: 404 }
      );
    }

    const person = await prisma.people.create({
      data: {
        accountId: data.accountId,
        name: data.name,
        title: data.title || null,
        email: data.email || null,
        phone: data.phone || null,
        linkedin: data.linkedin || null,
        isExecOps: data.isExecOps ?? false,
        isOps: data.isOps ?? false,
        isProc: data.isProc ?? false,
        isSales: data.isSales ?? false,
        isTech: data.isTech ?? false,
        isNonOps: data.isNonOps ?? false,
        notes: data.notes || null,
      },
    });

    // Auto-recalculate account score
    await autoRecalculateScore(data.accountId, session.user.email || undefined);

    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating person:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { activeEventId: true },
    });

    if (!user?.activeEventId) {
      return NextResponse.json({ people: [] });
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url);
    const missingEmail = searchParams.get('missingEmail') === 'true';
    const minIcpScore = searchParams.get('minIcpScore') ? parseInt(searchParams.get('minIcpScore')!) : 0;
    const personas = searchParams.getAll('persona'); // Can have multiple

    // Build where clause
    const where: any = {
      target_accounts: {
        eventId: user.activeEventId,
      },
    };

    // Filter by missing email
    if (missingEmail) {
      where.email = null;
    }

    // Filter by persona (OR logic - any of the selected personas)
    if (personas.length > 0) {
      where.OR = personas.map(persona => ({ [persona]: true }));
    }

    // Filter by ICP score (need to join with account)
    if (minIcpScore > 0) {
      where.target_accounts.icpScore = { gte: minIcpScore };
    }

    const people = await prisma.people.findMany({
      where,
      include: {
        target_accounts: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ people });
  } catch (error) {
    console.error('Error fetching people:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
