import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Export data in various formats
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { type, format, filters } = await req.json();

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });

  if (!user?.activeEventId) {
    return NextResponse.json({ error: 'No active event' }, { status: 400 });
  }

  let data: any[] = [];
  let filename = '';

  // Export accounts
  if (type === 'accounts') {
    const accounts = await prisma.targetAccount.findMany({
      where: {
        eventId: user.activeEventId,
        ...(filters?.minIcpScore && { icpScore: { gte: filters.minIcpScore } }),
      },
      include: {
        people: true,
      },
    });

    data = accounts.map((a) => ({
      'Account Name': a.name,
      Industry: a.industry,
      Domain: a.domain,
      'ICP Score': a.icpScore,
      'People Count': a.people.length,
      'Created At': a.createdAt.toISOString(),
    }));

    filename = `accounts-export-${Date.now()}.csv`;
  }

  // Export people
  if (type === 'people') {
    const people = await prisma.person.findMany({
      where: {
        account: { eventId: user.activeEventId },
      },
      include: {
        account: {
          select: {
            name: true,
            industry: true,
          },
        },
      },
    });

    data = people.map((p) => ({
      Name: p.name,
      Title: p.title,
      Email: p.email,
      LinkedIn: p.linkedin,
      Account: p.account.name,
      Industry: p.account.industry,
      Persona: p.persona?.join(', ') || '',
      'Created At': p.createdAt.toISOString(),
    }));

    filename = `people-export-${Date.now()}.csv`;
  }

  // Export outreach
  if (type === 'outreach') {
    const outreach = await prisma.outreach.findMany({
      where: {
        person: {
          account: { eventId: user.activeEventId },
        },
        ...(filters?.status && { status: filters.status }),
      },
      include: {
        person: {
          select: {
            name: true,
            email: true,
            account: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    data = outreach.map((o) => ({
      Person: o.person.name,
      Email: o.person.email,
      Account: o.person.account.name,
      Subject: o.subject,
      Status: o.status,
      Channel: o.channel,
      'Sent At': o.sentAt?.toISOString() || '',
      'Opened At': o.openedAt?.toISOString() || '',
      'Responded At': o.respondedAt?.toISOString() || '',
    }));

    filename = `outreach-export-${Date.now()}.csv`;
  }

  // Convert to CSV
  if (format === 'csv') {
    if (data.length === 0) {
      return NextResponse.json({ error: 'No data to export' }, { status: 400 });
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((header) => JSON.stringify(row[header] || '')).join(',')
      ),
    ];

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  // Return JSON
  return NextResponse.json({
    data,
    count: data.length,
    format,
    filename,
  });
}
