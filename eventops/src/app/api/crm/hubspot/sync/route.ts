import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';
import {
  personToHubSpotContact,
  syncContactToHubSpot,
  findHubSpotContactByEmail,
} from '@/lib/hubspot-integration';

export const dynamic = 'force-dynamic';

/**
 * Sync contacts to HubSpot CRM
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { personIds } = await req.json();

  if (!personIds || !Array.isArray(personIds)) {
    return NextResponse.json(
      { error: 'personIds array required' },
      { status: 400 }
    );
  }

  const hubspotApiKey = process.env.HUBSPOT_API_KEY;
  if (!hubspotApiKey) {
    return NextResponse.json(
      { error: 'HubSpot API key not configured' },
      { status: 503 }
    );
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const personId of personIds) {
    try {
      const person = await prisma.people.findUnique({
        where: { id: personId },
        include: {
          target_accounts: true,
        },
      });

      if (!person) {
        results.failed++;
        results.errors.push(`Person ${personId} not found`);
        continue;
      }

      if (!person.email) {
        results.failed++;
        results.errors.push(`${person.name} has no email address`);
        continue;
      }

      // Check if contact already exists
      const existing = await findHubSpotContactByEmail(person.email, hubspotApiKey);

      const hubspotContact = personToHubSpotContact(person);

      if (existing.found && existing.id) {
        // Update existing contact
        const updateResponse = await fetch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${existing.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${hubspotApiKey}`,
            },
            body: JSON.stringify({ properties: hubspotContact }),
          }
        );

        if (updateResponse.ok) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`Failed to update ${person.name}`);
        }
      } else {
        // Create new contact
        const syncResult = await syncContactToHubSpot(hubspotContact, hubspotApiKey);

        if (syncResult.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`${person.name}: ${syncResult.error}`);
        }
      }
    } catch (error: any) {
      results.failed++;
      results.errors.push(`Error syncing ${personId}: ${error.message}`);
    }
  }

  return NextResponse.json(results);
}

/**
 * Get HubSpot sync status
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hubspotApiKey = process.env.HUBSPOT_API_KEY;

  return NextResponse.json({
    configured: !!hubspotApiKey,
    message: hubspotApiKey
      ? 'HubSpot integration ready'
      : 'Set HUBSPOT_API_KEY in environment variables',
  });
}
