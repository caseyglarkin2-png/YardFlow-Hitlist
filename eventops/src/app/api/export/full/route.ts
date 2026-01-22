import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/export/full - Export all data as ZIP with CSVs
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
  const format = searchParams.get('format') || 'csv'; // csv or json

  try {
    // Fetch all data
    const accounts = await prisma.target_accounts.findMany({
      where: { eventId: user.activeEventId },
      include: { people: true },
    });

    const people = await prisma.people.findMany({
      where: { target_accounts: { eventId: user.activeEventId } },
      include: { account: true, outreach: true, Meeting: true },
    });

    const outreach = await prisma.outreach.findMany({
      where: {
        person: {
          target_accounts: { eventId: user.activeEventId },
        },
      },
      include: {
        people: { include: { account: true } },
      },
    });

    const meetings = await prisma.Meeting.findMany({
      where: {
        person: {
          target_accounts: { eventId: user.activeEventId },
        },
      },
      include: {
        people: { include: { account: true } },
      },
    });

    const activities = await prisma.activities.findMany({
      where: { userId: user.id },
      include: { users: true },
    });

    if (format === 'json') {
      // Return as JSON
      return NextResponse.json({
        accounts,
        people,
        outreach,
        meetings,
        activities,
        exportedAt: new Date().toISOString(),
      });
    } else {
      // Convert to CSV
      const accountsCsv = jsonToCSV(accounts.map(a => ({
        id: a.id,
        name: a.name,
        industry: a.industry,
        icpScore: a.icpScore,
        tier: a.tier,
        website: a.website,
        location: a.location,
        revenue: a.revenue,
        employeeCount: a.employeeCount,
        peopleCount: a.people.length,
      })));

      const peopleCsv = jsonToCSV(people.map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        title: p.title,
        phone: p.phone,
        accountName: p.account.name,
        icpScore: p.icpScore,
        linkedin: p.linkedin,
        isExecOps: p.isExecOps,
        isSupplyChain: p.isSupplyChain,
        isITTech: p.isITTech,
        isProcurement: p.isProcurement,
        isFacilities: p.isFacilities,
      })));

      const outreachCsv = jsonToCSV(outreach.map(o => ({
        id: o.id,
        personName: o.people.name,
        accountName: o.people.account.name,
        channel: o.channel,
        status: o.status,
        subject: o.subject,
        sentAt: o.sentAt,
        openedAt: o.openedAt,
        respondedAt: o.respondedAt,
      })));

      const meetingsCsv = jsonToCSV(meetings.map(m => ({
        id: m.id,
        personName: m.people.name,
        accountName: m.people.account.name,
        scheduledAt: m.scheduledAt,
        status: m.status,
        outcome: m.outcome,
        dealStage: m.dealStage,
        location: m.location,
      })));

      const activitiesCsv = jsonToCSV(activities.map(a => ({
        id: a.id,
        userName: a.users.name,
        entityType: a.entityType,
        entityId: a.entityId,
        action: a.action,
        description: a.description,
        createdAt: a.createdAt,
      })));

      // In production, use JSZip to create actual ZIP file
      // For now, return concatenated CSVs
      
      const fullExport = `
=== ACCOUNTS ===
${accountsCsv}

=== PEOPLE ===
${peopleCsv}

=== OUTREACH ===
${outreachCsv}

=== MEETINGS ===
${meetingsCsv}

=== ACTIVITIES ===
${activitiesCsv}
      `.trim();

      return new NextResponse(fullExport, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="EventOps_Full_Export_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error.message || 'Export failed' },
      { status: 500 }
    );
  }
}

function jsonToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(item =>
    Object.values(item)
      .map(v => {
        if (v === null || v === undefined) return '';
        const str = String(v);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      })
      .join(',')
  );

  return [headers, ...rows].join('\n');
}
