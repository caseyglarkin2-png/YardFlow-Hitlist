import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-service';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';

/**
 * GET /api/prospects
 * List prospects with filtering, sorting, and cursor-based pagination
 * Supports: tier, status, company, search, orderBy, order, cursor, limit
 */
export async function GET(request: NextRequest) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  const searchParams = request.nextUrl.searchParams;

  // Pagination params
  const cursor = searchParams.get('cursor');
  const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);

  // Filter params
  const tier = searchParams.get('tier');
  const status = searchParams.get('status');
  const accountId = searchParams.get('accountId');
  const company = searchParams.get('company');
  const search = searchParams.get('search');

  // Sort params
  const orderBy = searchParams.get('orderBy') || 'createdAt';
  const order = searchParams.get('order') || 'desc';

  const where: Prisma.peopleWhereInput = {};
  if (tier) where.tier = tier;
  if (status) where.status = status;
  if (accountId) where.accountId = accountId;

  // Company filter via account relation
  if (company) {
    where.target_accounts = {
      name: { contains: company, mode: 'insensitive' },
    };
  }

  // Full-text search across name, email, title
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const [data, total] = await Promise.all([
      prisma.people.findMany({
        where,
        take: limit + 1, // Fetch one extra to check hasMore
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { [orderBy]: order },
        include: {
          target_accounts: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.people.count({ where }),
    ]);

    const hasMore = data.length > limit;
    const responseData = hasMore ? data.slice(0, limit) : data;
    const nextCursor = hasMore ? responseData[responseData.length - 1]?.id : null;

    // Transform to include computed name field and company
    const prospects = responseData.map((p) => ({
      ...p,
      firstName: p.name.split(' ')[0] || '',
      lastName: p.name.split(' ').slice(1).join(' ') || '',
      company: p.target_accounts?.name || '',
      linkedinUrl: p.linkedin,
    }));

    return NextResponse.json({
      data: prospects,
      pagination: {
        hasMore,
        nextCursor,
        total,
      },
    });
  } catch (err) {
    logger.error('Failed to fetch prospects', { error: String(err) });
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/prospects
 * Create a new prospect with duplicate email detection
 */
export async function POST(request: NextRequest) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      name: fullName,
      email,
      accountId,
      tier,
      score,
      status,
      tags,
      customFields,
      custom_fields,
      title,
      phone,
      linkedin,
      linkedinUrl,
      notes,
    } = body;

    // Support both firstName/lastName and name
    const name = fullName || `${firstName || ''} ${lastName || ''}`.trim();

    if (!name || !accountId) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Name and accountId are required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Check for duplicate email if provided
    if (email) {
      const existing = await prisma.people.findFirst({
        where: { email, accountId },
      });
      if (existing) {
        return NextResponse.json(
          {
            error: 'DUPLICATE_EMAIL',
            message: 'A prospect with this email already exists',
            existingId: existing.id,
            statusCode: 409,
          },
          { status: 409 }
        );
      }
    }

    // Verify account exists
    const account = await prisma.target_accounts.findUnique({
      where: { id: accountId },
      select: { id: true, name: true },
    });
    if (!account) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: 'Account not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const person = await prisma.people.create({
      data: {
        id: crypto.randomUUID(),
        name,
        email: email || null,
        accountId,
        title: title || null,
        phone: phone || null,
        linkedin: linkedin || linkedinUrl || null,
        notes: notes || null,
        tier: tier || 'Tier 2',
        score: score ?? 50,
        status: status || 'active',
        tags: tags || [],
        custom_fields: customFields || custom_fields || {},
        updatedAt: new Date(),
      },
      include: {
        target_accounts: { select: { id: true, name: true } },
      },
    });

    logger.info('Prospect created', { prospectId: person.id, accountId });

    // Transform response to match spec
    const result = {
      ...person,
      firstName: person.name.split(' ')[0] || '',
      lastName: person.name.split(' ').slice(1).join(' ') || '',
      company: person.target_accounts?.name || '',
      linkedinUrl: person.linkedin,
    };

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    logger.error('Failed to create prospect', { error: String(err) });
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message,
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
