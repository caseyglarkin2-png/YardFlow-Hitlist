import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { activeEventId: true },
    });

    if (!user?.activeEventId) {
      return NextResponse.json(
        { error: 'No active event selected' },
        { status: 400 }
      );
    }

    const { type, rows } = await request.json();

    let created = 0;

    if (type === 'accounts') {
      // Bulk create accounts
      for (const row of rows) {
        const { data } = row;
        await prisma.targetAccount.create({
          data: {
            name: data.name,
            website: data.website || null,
            industry: data.industry || null,
            headquarters: data.headquarters || null,
            icpScore: data.icpScore ? Number(data.icpScore) : null,
            notes: data.notes || null,
            eventId: user.activeEventId,
          },
        });
        created++;
      }
    } else {
      // For people, need to find or create accounts first
      for (const row of rows) {
        const { data } = row;

        // Find or create account
        let account = await prisma.targetAccount.findFirst({
          where: {
            eventId: user.activeEventId,
            name: {
              equals: data.accountName,
              mode: 'insensitive',
            },
          },
        });

        if (!account) {
          account = await prisma.targetAccount.create({
            data: {
              name: data.accountName,
              eventId: user.activeEventId,
            },
          });
        }

        // Create person
        await prisma.person.create({
          data: {
            accountId: account.id,
            name: data.name,
            title: data.title || null,
            email: data.email || null,
            phone: data.phone || null,
            linkedin: data.linkedin || null,
            notes: data.notes || null,
            isExecOps: false,
            isOps: false,
            isProc: false,
            isSales: false,
            isTech: false,
            isNonOps: false,
          },
        });
        created++;
      }
    }

    return NextResponse.json({ created });
  } catch (error) {
    console.error('Error executing import:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
