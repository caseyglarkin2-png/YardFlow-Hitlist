/**
 * Sprint 44 — Tests for src/lib/queue/queues.ts
 *
 * Validates queue definitions, lazy initialization, and helper functions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockAdd = vi.fn().mockResolvedValue({ id: 'mock-job-id' });
const mockGetJob = vi.fn();
const mockGetJobCounts = vi.fn();
const mockGetFailed = vi.fn();

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation((_name: string) => ({
    add: mockAdd,
    getJob: mockGetJob,
    getJobCounts: mockGetJobCounts,
    getFailed: mockGetFailed,
  })),
}));

vi.mock('@/lib/queue/client', () => ({
  getRedisConnection: vi.fn().mockReturnValue({}),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('queue/queues.ts — Queue definitions and helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enrichmentQueue.add delegates to BullMQ Queue', async () => {
    const { enrichmentQueue } = await import('@/lib/queue/queues');

    const result = await enrichmentQueue.add('email-pattern', { accountId: 'acc-1' });
    expect(mockAdd).toHaveBeenCalledWith('email-pattern', { accountId: 'acc-1' });
    expect(result).toEqual({ id: 'mock-job-id' });
  });

  it('agentQueue.add delegates correctly', async () => {
    const { agentQueue } = await import('@/lib/queue/queues');

    await agentQueue.add('run-research', {
      action: 'run-research',
      params: { accountId: 'acc-1' },
    });
    expect(mockAdd).toHaveBeenCalledWith('run-research', {
      action: 'run-research',
      params: { accountId: 'acc-1' },
    });
  });

  it('heartbeatQueue has add method', async () => {
    const { heartbeatQueue } = await import('@/lib/queue/queues');

    await heartbeatQueue.add('heartbeat', { timestamp: Date.now() });
    expect(mockAdd).toHaveBeenCalled();
  });

  it('outreachQueue.add delegates correctly', async () => {
    const { outreachQueue } = await import('@/lib/queue/queues');

    await outreachQueue.add('send-outreach', {
      sequenceId: 'seq-1',
      accountIds: ['acc-1'],
    });
    expect(mockAdd).toHaveBeenCalled();
  });

  it('emailQueue.add delegates correctly', async () => {
    const { emailQueue } = await import('@/lib/queue/queues');

    await emailQueue.add('send-email', { to: 'test@example.com' });
    expect(mockAdd).toHaveBeenCalled();
  });

  it('sequenceQueue.add delegates correctly', async () => {
    const { sequenceQueue } = await import('@/lib/queue/queues');

    await sequenceQueue.add('process-step', {
      enrollmentId: 'enr-1',
      stepNumber: 1,
    });
    expect(mockAdd).toHaveBeenCalled();
  });

  // --- Helper function tests ---

  it('addEnrichmentJob calls enrichmentQueue.add and logs', async () => {
    const { addEnrichmentJob } = await import('@/lib/queue/queues');
    const { logger } = await import('@/lib/logger');

    const result = await addEnrichmentJob('email-pattern', {
      accountId: 'acc-1',
      userId: 'user-1',
    });

    expect(mockAdd).toHaveBeenCalledWith(
      'email-pattern',
      { accountId: 'acc-1', userId: 'user-1' },
      undefined
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Enrichment job added',
      expect.objectContaining({ jobId: 'mock-job-id', name: 'email-pattern' })
    );
    expect(result).toEqual({ id: 'mock-job-id' });
  });

  it('addEnrichmentJob re-throws and logs on failure', async () => {
    mockAdd.mockRejectedValueOnce(new Error('Redis down'));

    const { addEnrichmentJob } = await import('@/lib/queue/queues');
    const { logger } = await import('@/lib/logger');

    await expect(
      addEnrichmentJob('email-pattern', { accountId: 'acc-1' })
    ).rejects.toThrow('Redis down');

    expect(logger.error).toHaveBeenCalledWith(
      'Error adding enrichment job',
      expect.objectContaining({ name: 'email-pattern' })
    );
  });

  it('addOutreachJob calls outreachQueue.add and logs', async () => {
    const { addOutreachJob } = await import('@/lib/queue/queues');
    const { logger } = await import('@/lib/logger');

    await addOutreachJob('launch-sequence', {
      sequenceId: 'seq-1',
      accountIds: ['acc-1', 'acc-2'],
    });

    expect(mockAdd).toHaveBeenCalledWith(
      'launch-sequence',
      { sequenceId: 'seq-1', accountIds: ['acc-1', 'acc-2'] },
      undefined
    );
    expect(logger.info).toHaveBeenCalled();
  });

  it('addOutreachJob re-throws on failure', async () => {
    mockAdd.mockRejectedValueOnce(new Error('Queue full'));

    const { addOutreachJob } = await import('@/lib/queue/queues');

    await expect(
      addOutreachJob('launch', { sequenceId: 's', accountIds: [] })
    ).rejects.toThrow('Queue full');
  });

  it('addSequenceJob passes delay and custom options', async () => {
    const { addSequenceJob } = await import('@/lib/queue/queues');

    await addSequenceJob({ enrollmentId: 'enr-1', stepNumber: 2 }, 5000);

    expect(mockAdd).toHaveBeenCalledWith(
      'process-step',
      { enrollmentId: 'enr-1', stepNumber: 2 },
      expect.objectContaining({
        delay: 5000,
        attempts: 3,
        backoff: expect.objectContaining({ type: 'exponential', delay: 5000 }),
      })
    );
  });

  it('addSequenceJob defaults delay to 0', async () => {
    const { addSequenceJob } = await import('@/lib/queue/queues');

    await addSequenceJob({ enrollmentId: 'enr-1', stepNumber: 1 });

    expect(mockAdd).toHaveBeenCalledWith(
      'process-step',
      { enrollmentId: 'enr-1', stepNumber: 1 },
      expect.objectContaining({ delay: 0 })
    );
  });

  it('addSequenceJob re-throws on failure', async () => {
    mockAdd.mockRejectedValueOnce(new Error('Connection lost'));

    const { addSequenceJob } = await import('@/lib/queue/queues');

    await expect(
      addSequenceJob({ enrollmentId: 'e', stepNumber: 1 })
    ).rejects.toThrow('Connection lost');
  });
});
