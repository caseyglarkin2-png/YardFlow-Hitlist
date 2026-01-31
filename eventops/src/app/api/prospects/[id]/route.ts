import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-service';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  try {
    const person = await prisma.people.findUnique({
      where: { id: params.id },
    });

    if (!person) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(person);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  try {
    const body = await request.json();

    // Validate existence
    const existing = await prisma.people.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Explicitly exclude protected fields from the update payload
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, accountId: _aid, createdAt: _ca, updatedAt: _ua, ...updateData } = body;

    // Don't allow updating id or accountId blindly if not intended, but usually CRUD allows it.
    // Safety: removing id/createdAt from update. allowed: accountId.

    const updated = await prisma.people.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  try {
    // Check if hard delete requested?
    const hardDelete = request.nextUrl.searchParams.get('hard') === 'true';

    if (hardDelete) {
      await prisma.people.delete({
        where: { id: params.id },
      });
      return NextResponse.json({ success: true, deleted: true });
    } else {
      const softDeleted = await prisma.people.update({
        where: { id: params.id },
        data: { status: 'archived' },
      });
      return NextResponse.json(softDeleted);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
