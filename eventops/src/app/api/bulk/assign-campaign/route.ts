import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Bulk assign accounts or people to campaigns
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { entityType, entityIds, campaignId } = await req.json();

  if (!entityType || !entityIds || !campaignId) {
    return NextResponse.json(
      { error: 'entityType, entityIds, and campaignId required' },
      { status: 400 }
    );
  }

  const results = { success: 0, failed: 0, errors: [] as string[] };

  if (entityType === 'people') {
    // Assign people to campaign by creating outreach records
    for (const personId of entityIds) {
      try {
        const person = await prisma.person.findUnique({
          where: { id: personId },
          include: { account: true },
        });

        if (!person) {
          results.failed++;
          results.errors.push(`Person ${personId} not found`);
          continue;
        }

        // Create outreach record for campaign
        await prisma.outreach.create({
          data: {
            personId,
            campaignId,
            status: 'DRAFT',
            channel: 'EMAIL',
            subject: '',
            message: '',
          },
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to assign ${personId}: ${error}`);
      }
    }
  }

  if (entityType === 'accounts') {
    // Assign all people from accounts to campaign
    for (const accountId of entityIds) {
      try {
        const people = await prisma.person.findMany({
          where: { accountId },
        });

        for (const person of people) {
          await prisma.outreach.create({
            data: {
              personId: person.id,
              campaignId,
              status: 'DRAFT',
              channel: 'EMAIL',
              subject: '',
              message: '',
            },
          });
        }

        results.success += people.length;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to assign account ${accountId}: ${error}`);
      }
    }
  }

  return NextResponse.json({
    message: `Assigned ${results.success} contacts to campaign`,
    ...results,
  });
}
