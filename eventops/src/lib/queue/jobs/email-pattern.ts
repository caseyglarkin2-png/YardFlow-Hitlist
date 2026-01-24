import { EmailPatternDetector } from '@/lib/enrichment/email-pattern-detector';
import { logger } from '@/lib/logger';
import type { EmailPatternJobData } from '../queues';

export interface EmailPatternJobResult {
  success: boolean;
  accountId: string;
  domain: string;
  totalEmails: number;
  patternsDetected: number;
  primaryPattern: {
    type: string;
    confidence: number;
  } | null;
  error?: string;
}

export async function processEmailPattern(
  data: EmailPatternJobData
): Promise<EmailPatternJobResult> {
  const { accountId } = data;

  try {
    logger.info('Processing email pattern job', { accountId });

    const detector = new EmailPatternDetector();
    const result = await detector.detectPatternsForCompany(accountId);

    return {
      success: true,
      accountId,
      domain: result.domain,
      totalEmails: result.totalEmails,
      patternsDetected: result.detectedPatterns.length,
      primaryPattern: result.detectedPatterns.length > 0
        ? {
            type: result.detectedPatterns[0].patternType,
            confidence: result.detectedPatterns[0].confidence,
          }
        : null,
    };
  } catch (error: any) {
    logger.error('Email pattern job failed', { accountId, error });
    
    return {
      success: false,
      accountId,
      domain: '',
      totalEmails: 0,
      patternsDetected: 0,
      primaryPattern: null,
      error: error.message,
    };
  }
}
