import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-service';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip = (page - 1) * limit;

  const tier = searchParams.get('tier');
  const status = searchParams.get('status');
  const accountId = searchParams.get('accountId');

  const where: Prisma.peopleWhereInput = {};
  if (tier) where.tier = tier;
  if (status) where.status = status;
  if (accountId) where.accountId = accountId;

  try {
    const [data, total] = await Promise.all([
      prisma.people.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.people.count({ where }),
    ]);

    return NextResponse.json({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  try {
    const body = await request.json();
    const { name, email, accountId, tier, score, status, tags, custom_fields, title, phone, linkedin, notes } = body;

    if (!name || !accountId) {
       return NextResponse.json({ error: 'Name and accountId are required' }, { status: 400 });
    }

    // Verify account exists
    const account = await prisma.target_accounts.findUnique({ where: { id: accountId } });
    if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const person = await prisma.people.create({
      data: {
        id: crypto.randomUUID(), // Assuming UUIDs or let database handle it if @default(uuid()) but schema said @id
        name,
        email,
        accountId,
        title,
        phone,
        linkedin,
        notes,
        tier: tier || 'Tier 2',
        score: score || 50,
        status: status || 'active',
        tags: tags || [],
        custom_fields: custom_fields || {},
      },
    });

    return NextResponse.json(person, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
