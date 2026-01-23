import { logger } from '@/lib/logger';
import { processStep } from '@/lib/outreach/sequence-engine';
import type { SequenceStepJobData } from '../queues';

/**
 * Process a sequence step job
 * This is called by the queue worker
 */
export async function processSequenceStepJob(data: SequenceStepJobData): Promise<void> {
  const { enrollmentId, stepNumber } = data;

  logger.info('Processing sequence step job', { enrollmentId, stepNumber });

  try {
    const result = await processStep(enrollmentId);

    if (result.success) {
      logger.info('Sequence step completed successfully', { enrollmentId, stepNumber });
    } else {
      logger.error('Sequence step failed', {
        enrollmentId,
        stepNumber,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Error in sequence step job', { enrollmentId, stepNumber, error });
    throw error; // Let BullMQ handle retry logic
  }
}
