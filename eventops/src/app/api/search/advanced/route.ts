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

  const user = await prisma.user.findUnique({
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
    const accounts = await prisma.targetAccount.findMany({
      where: {
        eventId: user.activeEventId,
        AND: [
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { domain: { contains: query, mode: 'insensitive' } },
              { website: { contains: query, mode: 'insensitive' } },
              { industry: { contains: query, mode: 'insensitive' } },
            ],
          },
          { icpScore: { gte: minIcpScore, lte: maxIcpScore } },
          ...(industry ? [{ industry: { contains: industry, mode: 'insensitive' } }] : []),
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
    const people = await prisma.person.findMany({
      where: {
        account: { eventId: user.activeEventId },
        AND: [
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { title: { contains: query, mode: 'insensitive' } },
              { linkedin: { contains: query, mode: 'insensitive' } },
            ],
          },
          ...(persona ? [{ persona: { has: persona } }] : []),
          ...(hasEmail === 'true' ? [{ email: { not: null } }] : []),
          ...(hasEmail === 'false' ? [{ email: null }] : []),
        ],
      },
      include: {
        account: {
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
      accountName: p.account.name,
      icpScore: p.account.icpScore,
      type: 'person',
    }));
  }

  // Search outreach
  if (type === 'all' || type === 'outreach') {
    const outreach = await prisma.outreach.findMany({
      where: {
        person: {
          account: { eventId: user.activeEventId },
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
        person: {
          select: {
            name: true,
            account: {
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
      personName: o.person.name,
      accountName: o.person.account.name,
      sentAt: o.sentAt,
      type: 'outreach',
    }));
  }

  results.totalResults =
    results.accounts.length + results.people.length + results.outreach.length;

  return NextResponse.json(results);
}
