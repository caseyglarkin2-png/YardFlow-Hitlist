import { Queue } from 'bullmq';
import { getRedisConnection } from './client';
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

export interface AgentJobData {
  action:
    | 'start-campaign'
    | 'run-prospecting'
    | 'run-research'
    | 'run-content'
    | 'run-graphics'
    | 'run-socials'
    | 'run-contracting';
  params: any;
  userId?: string;
  parentTaskId?: string;
}

// Default queue options
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000, // Start with 2 seconds
  },
  timeout: 3600000, // 1 hour for agents
  removeOnComplete: {
    count: 100,
    age: 86400, // 24 hours
  },
  removeOnFail: {
    count: 500,
  },
};

// Lazy queue initialization to avoid connecting during build
let _enrichmentQueue: Queue | null = null;
let _outreachQueue: Queue | null = null;
let _emailQueue: Queue | null = null;
let _sequenceQueue: Queue | null = null;
let _agentQueue: Queue | null = null;

export const enrichmentQueue = {
  get queue(): Queue {
    if (!_enrichmentQueue) {
      _enrichmentQueue = new Queue('enrichment', {
        connection: getRedisConnection(),
        defaultJobOptions,
      });
    }
    return _enrichmentQueue;
  },
  add(...args: Parameters<Queue['add']>) {
    return this.queue.add(...args);
  },
  getJob(...args: Parameters<Queue['getJob']>) {
    return this.queue.getJob(...args);
  },
  getJobCounts(...args: Parameters<Queue['getJobCounts']>) {
    return this.queue.getJobCounts(...args);
  },
  getFailed(...args: Parameters<Queue['getFailed']>) {
    return this.queue.getFailed(...args);
  },
};

export const agentQueue = {
  get queue(): Queue {
    if (!_agentQueue) {
      _agentQueue = new Queue('agents', {
        connection: getRedisConnection(),
        defaultJobOptions: {
          ...defaultJobOptions,
        },
      });
    }
    return _agentQueue;
  },
  add(...args: Parameters<Queue['add']>) {
    return this.queue.add(...args);
  },
  getJob(...args: Parameters<Queue['getJob']>) {
    return this.queue.getJob(...args);
  },
  getJobCounts(...args: Parameters<Queue['getJobCounts']>) {
    return this.queue.getJobCounts(...args);
  },
  getFailed(...args: Parameters<Queue['getFailed']>) {
    return this.queue.getFailed(...args);
  },
};

export const outreachQueue = {
  get queue(): Queue {
    if (!_outreachQueue) {
      _outreachQueue = new Queue('outreach', {
        connection: getRedisConnection(),
        defaultJobOptions,
      });
    }
    return _outreachQueue;
  },
  add(...args: Parameters<Queue['add']>) {
    return this.queue.add(...args);
  },
  getJob(...args: Parameters<Queue['getJob']>) {
    return this.queue.getJob(...args);
  },
  getJobCounts(...args: Parameters<Queue['getJobCounts']>) {
    return this.queue.getJobCounts(...args);
  },
  getFailed(...args: Parameters<Queue['getFailed']>) {
    return this.queue.getFailed(...args);
  },
};

export const emailQueue = {
  get queue(): Queue {
    if (!_emailQueue) {
      _emailQueue = new Queue('emails', {
        connection: getRedisConnection(),
        defaultJobOptions: {
          ...defaultJobOptions,
          attempts: 5, // More retries for email sending
        },
      });
    }
    return _emailQueue;
  },
  add(...args: Parameters<Queue['add']>) {
    return this.queue.add(...args);
  },
  getJob(...args: Parameters<Queue['getJob']>) {
    return this.queue.getJob(...args);
  },
  getJobCounts(...args: Parameters<Queue['getJobCounts']>) {
    return this.queue.getJobCounts(...args);
  },
  getFailed(...args: Parameters<Queue['getFailed']>) {
    return this.queue.getFailed(...args);
  },
};

export const sequenceQueue = {
  get queue(): Queue {
    if (!_sequenceQueue) {
      _sequenceQueue = new Queue('sequence-steps', {
        connection: getRedisConnection(),
        defaultJobOptions,
      });
    }
    return _sequenceQueue;
  },
  add(...args: Parameters<Queue['add']>) {
    return this.queue.add(...args);
  },
  getJob(...args: Parameters<Queue['getJob']>) {
    return this.queue.getJob(...args);
  },
  getJobCounts(...args: Parameters<Queue['getJobCounts']>) {
    return this.queue.getJobCounts(...args);
  },
  getFailed(...args: Parameters<Queue['getFailed']>) {
    return this.queue.getFailed(...args);
  },
};

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

export async function addOutreachJob(name: string, data: OutreachSequenceJobData, options?: any) {
  try {
    const job = await outreachQueue.add(name, data, options);
    logger.info('Outreach job added', { jobId: job.id, name, data });
    return job;
  } catch (error) {
    logger.error('Error adding outreach job', { name, data, error });
    throw error;
  }
}

export async function addSequenceJob(data: SequenceStepJobData, delayMs: number = 0) {
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
