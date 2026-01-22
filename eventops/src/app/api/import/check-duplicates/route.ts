import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { activeEventId: true },
    });

    if (!user?.activeEventId) {
      return NextResponse.json(
        { error: 'No active event selected' },
        { status: 400 }
      );
    }

    const { type, data } = await request.json();

    const results = await Promise.all(
      data.map(async (item: any) => {
        if (type === 'accounts') {
          // Check for duplicate company name (case-insensitive)
          const existing = await prisma.target_accounts.findFirst({
            where: {
              eventId: user.activeEventId!,
              name: {
                equals: item.name,
                mode: 'insensitive',
              },
            },
          });

          if (existing) {
            return {
              data: item,
              isDuplicate: true,
              message: `Account "${item.name}" already exists`,
              matchedId: existing.id,
            };
          }

          return { data: item, isDuplicate: false };
        } else {
          // For people, check name + account combination
          // First find the account
          const account = await prisma.target_accounts.findFirst({
            where: {
              eventId: user.activeEventId!,
              name: {
                equals: item.accountName,
                mode: 'insensitive',
              },
            },
          });

          if (!account) {
            return {
              data: item,
              isDuplicate: false,
              message: `Account "${item.accountName}" will be created`,
            };
          }

          // Check if person exists
          const existing = await prisma.people.findFirst({
            where: {
              accountId: account.id,
              name: {
                equals: item.name,
                mode: 'insensitive',
              },
            },
          });

          if (existing) {
            return {
              data: item,
              isDuplicate: true,
              message: `Person "${item.name}" already exists at ${item.accountName}`,
              matchedId: existing.id,
            };
          }

          return { data: item, isDuplicate: false };
        }
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
