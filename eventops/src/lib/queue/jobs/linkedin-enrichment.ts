import { LinkedInExtractor } from '@/lib/enrichment/linkedin-extractor';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { LinkedInEnrichmentJobData } from '../queues';

export interface LinkedInEnrichmentJobResult {
  success: boolean;
  accountId: string;
  totalPeople: number;
  enriched: number;
  notFound: number;
  errors: number;
  errorMessages: string[];
}

export async function processLinkedInEnrichment(
  data: LinkedInEnrichmentJobData
): Promise<LinkedInEnrichmentJobResult> {
  const { accountId, limit = 50 } = data;

  try {
    logger.info('Processing LinkedIn enrichment job', { accountId, limit });

    // Get people without LinkedIn URLs
    const people = await prisma.people.findMany({
      where: {
        accountId,
        linkedin: null,
        name: { not: '' },
      },
      take: limit,
      select: {
        id: true,
        name: true,
      },
    });

    const extractor = new LinkedInExtractor();
    let enriched = 0;
    let notFound = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    for (const person of people) {
      try {
        const result = await extractor.discoverProfile(person.id);
        
        if (result.profileUrl) {
          enriched++;
        } else {
          notFound++;
        }

        // Rate limit: 1 request per second
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        errors++;
        if (errorMessages.length < 10) {
          errorMessages.push(`${person.name}: ${error.message}`);
        }
      }
    }

    logger.info('LinkedIn enrichment completed', {
      accountId,
      totalPeople: people.length,
      enriched,
      notFound,
      errors,
    });

    return {
      success: true,
      accountId,
      totalPeople: people.length,
      enriched,
      notFound,
      errors,
      errorMessages,
    };
  } catch (error: any) {
    logger.error('LinkedIn enrichment job failed', { accountId, error });
    
    return {
      success: false,
      accountId,
      totalPeople: 0,
      enriched: 0,
      notFound: 0,
      errors: 1,
      errorMessages: [error.message],
    };
  }
}
