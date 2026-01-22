import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Advanced search across accounts and people
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
