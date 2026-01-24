import hubspotClient, { HubSpotContact, HubSpotContactsResponse } from './client';
import { hubspotRateLimiter } from './rate-limiter';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface SyncContactsResult {
  imported: number;
  updated: number;
  errors: Array<{
    contactId?: string;
    email?: string;
    error: string;
  }>;
}

export interface SyncContactsOptions {
  limit?: number; // Max contacts to sync (for testing)
  accountId?: string; // Optional accountId to link contacts to
}

/**
 * Sync contacts from HubSpot to local database
 * Handles pagination, rate limiting, and upsert logic
 */
export async function syncHubSpotContacts(
  options: SyncContactsOptions = {}
): Promise<SyncContactsResult> {
  const result: SyncContactsResult = {
    imported: 0,
    updated: 0,
    errors: [],
  };

  try {
    logger.info('Starting HubSpot contact sync', { options });

    let after: string | undefined;
    let totalProcessed = 0;
    const pageLimit = 100; // HubSpot max per page

    do {
      // Fetch page of contacts with rate limiting
      const response = await hubspotRateLimiter.execute(async () => {
        return await fetchContactsPage(after, pageLimit);
      });

      if (!response || !response.results) {
        logger.warn('No results in HubSpot response', { after });
        break;
      }

      // Process each contact
      for (const contact of response.results) {
        try {
          const wasUpdated = await processContact(contact, options.accountId);
          
          if (wasUpdated) {
            result.updated++;
          } else {
            result.imported++;
          }

          totalProcessed++;

          // Check if we've hit the limit
          if (options.limit && totalProcessed >= options.limit) {
            logger.info('Reached sync limit', {
              limit: options.limit,
              processed: totalProcessed,
            });
            return result;
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          
          result.errors.push({
            contactId: contact.id,
            email: contact.properties.email,
            error: errorMessage,
          });

          logger.error('Error processing contact', {
            contactId: contact.id,
            email: contact.properties.email,
            error: errorMessage,
          });
        }
      }

      // Move to next page
      after = response.paging?.next?.after;

      logger.debug('Processed page', {
        processed: totalProcessed,
        hasMore: !!after,
      });
    } while (after);

    logger.info('HubSpot contact sync completed', {
      imported: result.imported,
      updated: result.updated,
      errors: result.errors.length,
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('HubSpot contact sync failed', {
      error: errorMessage,
      partialResult: result,
    });

    throw new Error(`Contact sync failed: ${errorMessage}`);
  }
}

/**
 * Fetch a single page of contacts from HubSpot
 */
async function fetchContactsPage(
  after: string | undefined,
  limit: number
): Promise<HubSpotContactsResponse> {
  try {
    const response = await hubspotClient.crm.contacts.basicApi.getPage(
      limit,
      after,
      [
        'firstname',
        'lastname',
        'email',
        'phone',
        'jobtitle',
        'linkedin',
        'company',
      ],
      undefined,
      undefined,
      false
    );

    return {
      results: response.results.map((r: any) => ({
        ...r,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
      })) as HubSpotContact[],
      paging: response.paging
        ? {
            next: response.paging.next
              ? {
                  after: response.paging.next.after,
                  link: response.paging.next.link,
                }
              : undefined,
          }
        : undefined,
    };
  } catch (error) {
    logger.error('Failed to fetch contacts page from HubSpot', {
      error: error instanceof Error ? error.message : 'Unknown error',
      after,
    });
    throw error;
  }
}

/**
 * Process a single contact: map to schema and upsert
 * @returns true if contact was updated, false if newly created
 */
async function processContact(
  contact: HubSpotContact,
  defaultAccountId?: string
): Promise<boolean> {
  const props = contact.properties;

  // Build full name from firstname and lastname
  const name = [props.firstname, props.lastname]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Unknown';

  // Determine accountId - use company name as fallback or provided default
  const accountId =
    defaultAccountId ||
    generateAccountIdFromCompany(props.company) ||
    `hubspot-${contact.id}`;

  // Check if person already exists by email or HubSpot ID
  let existingPerson = null;
  
  if (props.email) {
    existingPerson = await prisma.people.findFirst({
      where: { email: props.email },
    });
  }

  // If not found by email, try to find by notes containing HubSpot ID
  if (!existingPerson) {
    existingPerson = await prisma.people.findFirst({
      where: {
        notes: {
          contains: `hubspot_id:${contact.id}`,
        },
      },
    });
  }

  const personData = {
    accountId,
    name,
    title: props.jobtitle || null,
    email: props.email || null,
    phone: props.phone || null,
    linkedin: props.linkedin || null,
    notes: buildNotes(contact, existingPerson?.notes),
    // Preserve existing role flags if updating
    isExecOps: existingPerson?.isExecOps ?? false,
    isOps: existingPerson?.isOps ?? false,
    isProc: existingPerson?.isProc ?? false,
    isSales: existingPerson?.isSales ?? false,
    isTech: existingPerson?.isTech ?? false,
    isNonOps: existingPerson?.isNonOps ?? false,
    assignedTo: existingPerson?.assignedTo ?? null,
    updatedAt: new Date(),
  };

  if (existingPerson) {
    // Update existing person
    await prisma.people.update({
      where: { id: existingPerson.id },
      data: personData,
    });

    logger.debug('Updated existing person from HubSpot', {
      personId: existingPerson.id,
      email: props.email,
      hubspotId: contact.id,
    });

    return true;
  } else {
    // Ensure target_accounts exists for the accountId
    await prisma.target_accounts.upsert({
      where: { id: accountId },
      update: {},
      create: {
        id: accountId,
        name: props.company || 'Unknown Company',
        industry: null,
        headquarters: null,
        icpScore: 0,
        eventId: await getDefaultEventId(),
        updatedAt: new Date(),
      },
    });

    // Create new person
    const newPerson = await prisma.people.create({
      data: {
        id: `person-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...personData,
        createdAt: new Date(),
      },
    });

    logger.debug('Created new person from HubSpot', {
      personId: newPerson.id,
      email: props.email,
      hubspotId: contact.id,
    });

    return false;
  }
}

/**
 * Build notes field with HubSpot metadata
 */
function buildNotes(contact: HubSpotContact, existingNotes?: string | null): string {
  const hubspotMetadata = `hubspot_id:${contact.id}|synced:${new Date().toISOString()}`;
  
  if (existingNotes) {
    // Update existing notes, preserving non-HubSpot content
    const noteLines = existingNotes.split('\n');
    const filteredLines = noteLines.filter(
      (line) => !line.includes('hubspot_id:') && !line.includes('synced:')
    );
    
    return [...filteredLines, hubspotMetadata].filter(Boolean).join('\n');
  }

  return hubspotMetadata;
}

/**
 * Generate consistent accountId from company name
 */
function generateAccountIdFromCompany(company?: string): string | null {
  if (!company) return null;
  
  // Convert to lowercase, remove special chars, replace spaces with hyphens
  return `account-${company
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)}`;
}

/**
 * Get default event ID for accounts
 * In production, you might want to make this configurable
 */
async function getDefaultEventId(): Promise<string> {
  const defaultEvent = await prisma.events.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (defaultEvent) {
    return defaultEvent.id;
  }

  // Create a default event if none exists
  const newEvent = await prisma.events.create({
    data: {
      id: `event-${Date.now()}`,
      name: 'HubSpot Import',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      status: 'PLANNING',
      location: 'Various',
      updatedAt: new Date(),
    },
  });

  return newEvent.id;
}
