import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-service';
import { parseBody } from '@/lib/validation';
import { captureRouteError } from '@/lib/sentry-utils';

const UpdateProspectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email('Invalid email format').optional(),
  title: z.string().max(255).optional(),
  company: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  linkedinUrl: z.string().url().optional(),
  status: z.string().max(50).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
  score: z.number().min(0).max(100).optional(),
}).passthrough(); // Allow additional fields for flexibility

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
    captureRouteError(err, { route: '/api/prospects/[id]', method: 'GET' });
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  try {
    const parsed = await parseBody(request, UpdateProspectSchema);
    if (!parsed.success) return parsed.response;

    // Validate existence
    const existing = await prisma.people.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Explicitly exclude protected fields from the update payload
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, accountId: _aid, createdAt: _ca, updatedAt: _ua, ...updateData } = parsed.data as Record<string, unknown>;

    // Don't allow updating id or accountId blindly if not intended, but usually CRUD allows it.
    // Safety: removing id/createdAt from update. allowed: accountId.

    const updated = await prisma.people.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err) {
    captureRouteError(err, { route: '/api/prospects/[id]', method: 'PUT' });
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
