import { Queue } from 'bullmq';
import { redisConnection } from './client';
import { logger } from '@/lib/logger';

// Job Data Interfaces
export interface EmailPatternJobData {
  accountId: string;
  userId?: string;
}

export interface LinkedInEnrichmentJobData {
  accountId: string;
  limit?: number;
  userId?: string;
}

export interface GenerateEmailsJobData {
  accountId: string;
  force?: boolean;
  userId?: string;
}

export interface OutreachSequenceJobData {
  sequenceId: string;
  accountIds: string[];
  userId?: string;
}

export interface SequenceStepJobData {
  enrollmentId: string;
  stepNumber: number;
}

// Default queue options
const defaultQueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000, // Start with 2 seconds
    },
    timeout: 300000, // 5 minutes
    removeOnComplete: {
      count: 100,
      age: 86400, // 24 hours
    },
    removeOnFail: {
      count: 500,
    },
  },
};

// Create queues
export const enrichmentQueue = new Queue('enrichment', defaultQueueOptions);

export const outreachQueue = new Queue('outreach', defaultQueueOptions);

export const emailQueue = new Queue('emails', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 5, // More retries for email sending
  },
});

export const sequenceQueue = new Queue('sequence-steps', defaultQueueOptions);

// Helper functions
export async function addEnrichmentJob(
  name: string,
  data: EmailPatternJobData | LinkedInEnrichmentJobData | GenerateEmailsJobData,
  options?: any
) {
  try {
    const job = await enrichmentQueue.add(name, data, options);
    logger.info('Enrichment job added', { jobId: job.id, name, data });
    return job;
  } catch (error) {
    logger.error('Error adding enrichment job', { name, data, error });
    throw error;
  }
}

export async function addOutreachJob(
  name: string,
  data: OutreachSequenceJobData,
  options?: any
) {
  try {
    const job = await outreachQueue.add(name, data, options);
    logger.info('Outreach job added', { jobId: job.id, name, data });
    return job;
  } catch (error) {
    logger.error('Error adding outreach job', { name, data, error });
    throw error;
  }
}

export async function addSequenceJob(
  data: SequenceStepJobData,
  delayMs: number = 0
) {
  try {
    const job = await sequenceQueue.add('process-step', data, {
      delay: delayMs,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // 5 seconds
      },
      removeOnComplete: {
        age: 86400, // Keep for 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 604800, // Keep failed jobs for 7 days
      },
    });
    
    logger.info('Sequence job added to queue', {
      jobId: job.id,
      enrollmentId: data.enrollmentId,
      stepNumber: data.stepNumber,
      delayMs,
    });
    
    return job;
  } catch (error) {
    logger.error('Error adding sequence job', { data, error });
    throw error;
  }
}
