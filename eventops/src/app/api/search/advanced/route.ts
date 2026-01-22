import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';
import { buildPrismaWhere, formatSearchResults } from '@/lib/search-builder';

export const dynamic = 'force-dynamic';

/**
 * Advanced search with filter builder support
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.users.findUnique({
    where: { email: session.user.email! },
  });

  if (!user?.activeEventId) {
    return NextResponse.json({ error: 'No active event' }, { status: 400 });
  }

  const { entityType, filters } = await req.json();
  
  const where = {
    ...buildPrismaWhere(filters),
    ...(entityType === 'accounts' ? { eventId: user.activeEventId } : {}),
    ...(entityType === 'people' ? { target_accounts: { eventId: user.activeEventId } } : {}),
    ...(entityType === 'outreach' ? { person: { target_accounts: { eventId: user.activeEventId } } } : {}),
    ...(entityType === 'meetings' ? { account: { eventId: user.activeEventId } } : {}),
  };

  let data: any[] = [];

  try {
    switch (entityType) {
      case 'accounts':
        data = await prisma.target_accounts.findMany({
          where,
          include: {
            people: { select: { id: true } },
          },
          take: 100,
        });
        break;

      case 'people':
        data = await prisma.people.findMany({
          where,
          include: {
            account: { select: { name: true } },
          },
          take: 100,
        });
        break;

      case 'outreach':
        data = await prisma.outreach.findMany({
          where,
          include: {
            person: {
              include: {
                account: { select: { name: true } },
              },
            },
          },
          take: 100,
        });
        break;

      case 'meetings':
        data = await prisma.meetings.findMany({
          where,
          include: {
            person: { select: { name: true } },
            account: { select: { name: true } },
          },
          take: 100,
        });
        break;
    }

    const results = formatSearchResults(data, entityType);

    return NextResponse.json({
      results,
      totalResults: results.length,
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({ error: error.message || 'Search failed', results: [], totalResults: 0 }, { status: 500 });
  }
}

/**
 * Legacy GET endpoint for backwards compatibility
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.users.findUnique({
    where: { email: session.user.email! },
  });

  if (!user?.activeEventId) {
    return NextResponse.json({ error: 'No active event' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'all'; // all, accounts, people, outreach
  const minIcpScore = parseInt(searchParams.get('minIcpScore') || '0');
  const maxIcpScore = parseInt(searchParams.get('maxIcpScore') || '100');
  const industry = searchParams.get('industry');
  const persona = searchParams.get('persona');
  const outreachStatus = searchParams.get('outreachStatus');
  const hasEmail = searchParams.get('hasEmail');
  const limit = parseInt(searchParams.get('limit') || '100');

  const results: any = {
    accounts: [],
    people: [],
    outreach: [],
    totalResults: 0,
  };

  // Search accounts
  if (type === 'all' || type === 'accounts') {
    const accounts = await prisma.target_accounts.findMany({
      where: {
        eventId: user.activeEventId,
        AND: [
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { website: { contains: query, mode: 'insensitive' as const } },
              { industry: { contains: query, mode: 'insensitive' as const } },
            ],
          },
          { icpScore: { gte: minIcpScore, lte: maxIcpScore } },
          ...(industry ? [{ industry: { contains: industry, mode: 'insensitive' as const } }] : []),
        ],
      },
      include: {
        people: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: limit,
    });

    results.accounts = accounts.map((a) => ({
      id: a.id,
      name: a.name,
      industry: a.industry,
      icpScore: a.icpScore,
      peopleCount: a.people.length,
      type: 'account',
    }));
  }

  // Search people
  if (type === 'all' || type === 'people') {
    // Build persona filter
    const personaFilter = persona ? { 
      [`is${persona.charAt(0).toUpperCase() + persona.slice(1)}`]: true 
    } : {};
    
    const people = await prisma.people.findMany({
      where: {
        target_accounts: { eventId: user.activeEventId },
        AND: [
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { email: { contains: query, mode: 'insensitive' as const } },
              { title: { contains: query, mode: 'insensitive' as const } },
              { linkedin: { contains: query, mode: 'insensitive' as const } },
            ],
          },
          ...(persona ? [personaFilter] : []),
          ...(hasEmail === 'true' ? [{ email: { not: null } }] : []),
          ...(hasEmail === 'false' ? [{ email: null }] : []),
        ],
      },
      include: {
        target_accounts: {
          select: {
            name: true,
            icpScore: true,
          },
        },
      },
      take: limit,
    });

    results.people = people.map((p) => ({
      id: p.id,
      name: p.name,
      title: p.title,
      email: p.email,
      accountName: p.target_accounts.name,
      icpScore: p.target_accounts.icpScore,
      type: 'person',
    }));
  }

  // Search outreach
  if (type === 'all' || type === 'outreach') {
    const outreach = await prisma.outreach.findMany({
      where: {
        people: {
          target_accounts: { eventId: user.activeEventId },
        },
        AND: [
          {
            OR: [
              { subject: { contains: query, mode: 'insensitive' } },
              { message: { contains: query, mode: 'insensitive' } },
            ],
          },
          ...(outreachStatus ? [{ status: outreachStatus as any }] : []),
        ],
      },
      include: {
        people: {
          select: {
            name: true,
            target_accounts: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      take: limit,
    });

    results.outreach = outreach.map((o) => ({
      id: o.id,
      subject: o.subject,
      status: o.status,
      personName: o.people.name,
      accountName: o.people.target_accounts.name,
      sentAt: o.sentAt,
      type: 'outreach',
    }));
  }

  results.totalResults =
    results.accounts.length + results.people.length + results.outreach.length;

  return NextResponse.json(results);
}
