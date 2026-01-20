import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { autoRecalculateScore } from '@/lib/auto-recalculate';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const personUpdateSchema = z.object({
  accountId: z.string().optional(),
  name: z.string().min(1).optional(),
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const person = await prisma.person.findUnique({
      where: { id: params.id },
      include: {
        account: {
          include: {
            dossier: true,
          },
        },
        insights: true,
      },
    });

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    return NextResponse.json({ person });
  } catch (error) {
    console.error('Error fetching person:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = personUpdateSchema.parse(body);

    const person = await prisma.person.update({
      where: { id: params.id },
      data: {
        ...(data.accountId && { accountId: data.accountId }),
        ...(data.name && { name: data.name }),
        ...(data.title !== undefined && { title: data.title || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.linkedin !== undefined && { linkedin: data.linkedin || null }),
        ...(data.isExecOps !== undefined && { isExecOps: data.isExecOps }),
        ...(data.isOps !== undefined && { isOps: data.isOps }),
        ...(data.isProc !== undefined && { isProc: data.isProc }),
        ...(data.isSales !== undefined && { isSales: data.isSales }),
        ...(data.isTech !== undefined && { isTech: data.isTech }),
        ...(data.isNonOps !== undefined && { isNonOps: data.isNonOps }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
    });

    // Auto-recalculate account score
    await autoRecalculateScore(person.accountId, session.user.email || undefined);

    return NextResponse.json(person);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating person:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get person to know which account to recalculate
    const person = await prisma.person.findUnique({
      where: { id: params.id },
      select: { accountId: true },
    });

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    await prisma.person.delete({
      where: { id: params.id },
    });

    // Auto-recalculate account score
    await autoRecalculateScore(person.accountId, session.user.email || undefined);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting person:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
