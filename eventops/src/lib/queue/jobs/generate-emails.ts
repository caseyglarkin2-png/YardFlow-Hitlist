import { PatternApplicator } from '@/lib/enrichment/pattern-applicator';
import { logger } from '@/lib/logger';
import type { GenerateEmailsJobData } from '../queues';

export interface GenerateEmailsJobResult {
  success: boolean;
  accountId: string;
  emailsGenerated: number;
  skipped: number;
  pattern: string | null;
  error?: string;
}

export async function processGenerateEmails(
  data: GenerateEmailsJobData
): Promise<GenerateEmailsJobResult> {
  const { accountId, force = false } = data;

  try {
    logger.info('Processing generate emails job', { accountId, force });

    const applicator = new PatternApplicator();
    const result = await applicator.enrichCompanyContacts(accountId, {
      dryRun: !force,
      minConfidence: 70,
      force,
    });

    logger.info('Email generation completed', {
      accountId,
      emailsGenerated: result.applied,
      skipped: result.skipped,
    });

    return {
      success: true,
      accountId,
      emailsGenerated: result.applied,
      skipped: result.skipped,
      pattern: result.pattern ?? null,
    };
  } catch (error: any) {
    logger.error('Generate emails job failed', { accountId, error });
    
    return {
      success: false,
      accountId,
      emailsGenerated: 0,
      skipped: 0,
      pattern: null,
      error: error.message,
    };
  }
}
