import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';
import { authServiceOrSession } from '@/lib/auth-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/export - Export data via query params (browser-friendly)
 */
export async function GET(req: NextRequest) {
  const authResult = await authServiceOrSession(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'accounts';
  const format = searchParams.get('format') || 'csv';

  // Call the POST handler logic with extracted params
  return handleExport(type, format, authResult.userId);
}

/**
 * POST /api/export - Export data with body params
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { type, format, filters } = await req.json();

  const user = await prisma.users.findUnique({
    where: { email: session.user.email! },
  });

  if (!user?.activeEventId) {
    return NextResponse.json({ error: 'No active event' }, { status: 400 });
  }

  return handleExport(type, format, user.id, user.activeEventId, filters);
}

async function handleExport(
  type: string,
  format: string,
  userId: string,
  eventId?: string,
  filters?: Record<string, unknown>
) {
  // If no eventId provided, get it from user
  let activeEventId = eventId;
  if (!activeEventId) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { activeEventId: true },
    });
    activeEventId = user?.activeEventId || undefined;
  }

  let data: Record<string, unknown>[] = [];
  let filename = '';

  const minIcpScore = filters?.minIcpScore as number | undefined;
  const statusFilter = filters?.status as string | undefined;

  // Export accounts
  if (type === 'accounts') {
    const accounts = await prisma.target_accounts.findMany({
      where: {
        ...(activeEventId && { eventId: activeEventId }),
        ...(minIcpScore && { icpScore: { gte: minIcpScore } }),
      },
      include: {
        people: true,
      },
    });

    data = accounts.map((a) => ({
      'Account Name': a.name,
      Website: a.website,
      Industry: a.industry,
      Headquarters: a.headquarters,
      'ICP Score': a.icpScore,
      'People Count': a.people.length,
      'Created At': a.createdAt.toISOString(),
    }));

    filename = `accounts-export-${Date.now()}.csv`;
  }

  // Export people
  if (type === 'people') {
    const people = await prisma.people.findMany({
      where: {
        ...(activeEventId && { target_accounts: { eventId: activeEventId } }),
      },
      include: {
        target_accounts: {
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
      Account: p.target_accounts?.name || '',
      Industry: p.target_accounts?.industry || '',
      'Exec Ops': p.isExecOps,
      'Ops': p.isOps,
      'Procurement': p.isProc,
      'Sales': p.isSales,
      'Tech': p.isTech,
      'Created At': p.createdAt.toISOString(),
    }));

    filename = `people-export-${Date.now()}.csv`;
  }

  // Export outreach
  if (type === 'outreach') {
    const outreach = await prisma.outreach.findMany({
      where: {
        ...(activeEventId && { people: { target_accounts: { eventId: activeEventId } } }),
        ...(statusFilter && { status: statusFilter }),
      },
      include: {
        people: {
          select: {
            name: true,
            email: true,
            target_accounts: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    data = outreach.map((o) => ({
      Person: o.people.name,
      Email: o.people.email,
      Account: o.people.target_accounts?.name || '',
      Subject: o.subject,
      Status: o.status,
      Channel: o.channel,
      'Sent At': o.sentAt?.toISOString() || '',
      'Opened At': o.openedAt?.toISOString() || '',
      'Responded At': o.respondedAt?.toISOString() || '',
    }));

    filename = `outreach-export-${Date.now()}.csv`;
  }

  // Export meetings
  if (type === 'meetings') {
    const meetings = await prisma.Meeting.findMany({
      where: {
        ...(activeEventId && { eventId: activeEventId }),
      },
      include: {
        people: {
          select: {
            name: true,
            email: true,
          },
        },
        target_accounts: {
          select: {
            name: true,
          },
        },
      },
    });

    data = meetings.map((m) => ({
      Title: m.title,
      Account: m.target_accounts?.name || '',
      Contact: m.people?.name || '',
      'Contact Email': m.people?.email || '',
      Status: m.status,
      'Deal Stage': m.dealStage || '',
      'Scheduled Time': m.scheduledTime?.toISOString() || '',
      'Created At': m.createdAt.toISOString(),
    }));

    filename = `meetings-export-${Date.now()}.csv`;
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
