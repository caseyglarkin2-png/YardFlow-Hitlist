/**
 * Sprint 44 — Tests for webhook handlers
 *
 * Tests SendGrid webhook event processing and base webhook stubs.
 * Uses isolated mocks to validate event routing, signature verification,
 * and compliance actions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn().mockResolvedValue({});

vi.mock('@/lib/db', () => ({
  prisma: {
    emailActivity: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}));

const mockHandleBounce = vi.fn().mockResolvedValue(undefined);
const mockHandleSpamComplaint = vi.fn().mockResolvedValue(undefined);
const mockHandleUnsubscribe = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/outreach/compliance', () => ({
  handleBounce: mockHandleBounce,
  handleSpamComplaint: mockHandleSpamComplaint,
  handleUnsubscribe: mockHandleUnsubscribe,
}));

const mockPauseEnrollment = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/outreach/sequence-engine', () => ({
  pauseEnrollment: mockPauseEnrollment,
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Helper to create a webhook request
function createWebhookRequest(events: Record<string, unknown>[]): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/sendgrid', {
    method: 'POST',
    body: JSON.stringify(events),
    headers: { 'Content-Type': 'application/json' },
  });
}

// Standard email activity mock data
const mockEmailActivity = {
  id: 'ea-1',
  enrollmentId: 'enr-1',
  messageId: 'msg-123',
  enrollment: {
    personId: 'person-1',
    person: { id: 'person-1', email: 'test@example.com' },
  },
};

describe('SendGrid webhook handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear verification key so signature check is skipped
    delete process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;
    process.env.NODE_ENV = 'test';
  });

  it('processes open event — updates emailActivity with openedAt', async () => {
    mockFindUnique.mockResolvedValueOnce(mockEmailActivity);

    const { POST } = await import('@/app/api/webhooks/sendgrid/route');
    const req = createWebhookRequest([
      { event: 'open', sg_message_id: 'msg-123', email: 'test@example.com', timestamp: 1234567890 },
    ]);

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ea-1' },
        data: expect.objectContaining({ status: 'opened' }),
      })
    );
  });

  it('processes click event — updates emailActivity with clickedAt', async () => {
    mockFindUnique.mockResolvedValueOnce(mockEmailActivity);

    const { POST } = await import('@/app/api/webhooks/sendgrid/route');
    const req = createWebhookRequest([
      {
        event: 'click',
        sg_message_id: 'msg-123',
        email: 'test@example.com',
        timestamp: 1234567890,
      },
    ]);

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'clicked' }),
      })
    );
  });

  it('processes bounce event — updates activity, calls handleBounce + pauseEnrollment', async () => {
    mockFindUnique.mockResolvedValueOnce(mockEmailActivity);

    const { POST } = await import('@/app/api/webhooks/sendgrid/route');
    const req = createWebhookRequest([
      {
        event: 'bounce',
        sg_message_id: 'msg-123',
        email: 'test@example.com',
        timestamp: 1234567890,
        reason: 'Mailbox full',
        status: '4.2.2',
      },
    ]);

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'bounced', errorMessage: 'Mailbox full' }),
      })
    );
    expect(mockHandleBounce).toHaveBeenCalledWith('person-1', 'soft');
    expect(mockPauseEnrollment).toHaveBeenCalledWith('enr-1', 'bounced');
  });

  it('classifies hard bounce for 5.x.x status codes', async () => {
    mockFindUnique.mockResolvedValueOnce(mockEmailActivity);

    const { POST } = await import('@/app/api/webhooks/sendgrid/route');
    const req = createWebhookRequest([
      {
        event: 'bounce',
        sg_message_id: 'msg-123',
        email: 'test@example.com',
        timestamp: 1234567890,
        reason: 'User unknown',
        status: '5.1.1',
      },
    ]);

    await POST(req);
    expect(mockHandleBounce).toHaveBeenCalledWith('person-1', 'hard');
  });

  it('processes dropped event — marks as failed + pauses enrollment', async () => {
    mockFindUnique.mockResolvedValueOnce(mockEmailActivity);

    const { POST } = await import('@/app/api/webhooks/sendgrid/route');
    const req = createWebhookRequest([
      {
        event: 'dropped',
        sg_message_id: 'msg-123',
        email: 'test@example.com',
        timestamp: 1234567890,
        reason: 'Bounced address',
      },
    ]);

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'failed',
          errorMessage: 'Dropped: Bounced address',
        }),
      })
    );
    expect(mockPauseEnrollment).toHaveBeenCalledWith('enr-1', 'dropped');
  });

  it('processes spamreport event — calls handleSpamComplaint + pauses', async () => {
    mockFindUnique.mockResolvedValueOnce(mockEmailActivity);

    const { POST } = await import('@/app/api/webhooks/sendgrid/route');
    const req = createWebhookRequest([
      {
        event: 'spamreport',
        sg_message_id: 'msg-123',
        email: 'test@example.com',
        timestamp: 1234567890,
      },
    ]);

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockHandleSpamComplaint).toHaveBeenCalledWith('person-1');
    expect(mockPauseEnrollment).toHaveBeenCalledWith('enr-1', 'spam_complaint');
  });

  it('processes unsubscribe event — calls handleUnsubscribe + pauses', async () => {
    mockFindUnique.mockResolvedValueOnce(mockEmailActivity);

    const { POST } = await import('@/app/api/webhooks/sendgrid/route');
    const req = createWebhookRequest([
      {
        event: 'unsubscribe',
        sg_message_id: 'msg-123',
        email: 'test@example.com',
        timestamp: 1234567890,
      },
    ]);

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockHandleUnsubscribe).toHaveBeenCalledWith('person-1', 'sendgrid_webhook');
    expect(mockPauseEnrollment).toHaveBeenCalledWith('enr-1', 'unsubscribed');
  });

  it('handles unknown event type gracefully', async () => {
    mockFindUnique.mockResolvedValueOnce(mockEmailActivity);

    const { POST } = await import('@/app/api/webhooks/sendgrid/route');
    const req = createWebhookRequest([
      {
        event: 'delivered',
        sg_message_id: 'msg-123',
        email: 'test@example.com',
        timestamp: 1234567890,
      },
    ]);

    const res = await POST(req);
    expect(res.status).toBe(200);
    // No update or compliance action for unhandled events
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockHandleBounce).not.toHaveBeenCalled();
  });

  it('handles missing emailActivity gracefully', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const { logger } = await import('@/lib/logger');

    const { POST } = await import('@/app/api/webhooks/sendgrid/route');
    const req = createWebhookRequest([
      {
        event: 'open',
        sg_message_id: 'unknown-msg',
        email: 'test@example.com',
        timestamp: 1234567890,
      },
    ]);

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(logger.warn).toHaveBeenCalledWith(
      'Email activity not found for message ID',
      expect.objectContaining({ messageId: 'unknown-msg' })
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('processes multiple events in a single webhook', async () => {
    mockFindUnique.mockResolvedValue(mockEmailActivity);

    const { POST } = await import('@/app/api/webhooks/sendgrid/route');
    const req = createWebhookRequest([
      { event: 'open', sg_message_id: 'msg-123', email: 'test@example.com', timestamp: 1 },
      { event: 'click', sg_message_id: 'msg-123', email: 'test@example.com', timestamp: 2 },
    ]);

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it('returns 403 when signature headers are missing and key is configured', async () => {
    process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY = 'test-key';

    const { POST } = await import('@/app/api/webhooks/sendgrid/route');
    const req = createWebhookRequest([
      { event: 'open', sg_message_id: 'msg-123', email: 'test@example.com', timestamp: 1 },
    ]);
    // No signature headers

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 500 on malformed JSON body', async () => {
    const { POST } = await import('@/app/api/webhooks/sendgrid/route');
    const req = new NextRequest('http://localhost/api/webhooks/sendgrid', {
      method: 'POST',
      body: 'not json',
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('handles empty events array', async () => {
    const { POST } = await import('@/app/api/webhooks/sendgrid/route');
    const req = createWebhookRequest([]);

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});

describe('Base webhook routes (/api/webhooks)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST returns 501 (not implemented)', async () => {
    vi.doMock('@/lib/auth-service', () => ({
      authServiceOrSession: vi.fn().mockResolvedValue({ type: 'service', userId: 'user-1' }),
    }));

    vi.resetModules();
    const { POST } = await import('@/app/api/webhooks/route');
    const req = new NextRequest('http://localhost/api/webhooks', { method: 'POST' });

    const res = await POST(req);
    expect(res.status).toBe(501);
  });

  it('GET returns empty array', async () => {
    vi.doMock('@/lib/auth-service', () => ({
      authServiceOrSession: vi.fn().mockResolvedValue({ type: 'service', userId: 'user-1' }),
    }));

    vi.resetModules();
    const { GET } = await import('@/app/api/webhooks/route');
    const req = new NextRequest('http://localhost/api/webhooks', { method: 'GET' });

    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ webhooks: [] });
  });

  it('POST returns 401 without auth', async () => {
    vi.doMock('@/lib/auth-service', () => ({
      authServiceOrSession: vi.fn().mockResolvedValue(null),
    }));

    vi.resetModules();
    const { POST } = await import('@/app/api/webhooks/route');
    const req = new NextRequest('http://localhost/api/webhooks', { method: 'POST' });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('GET returns 401 without auth', async () => {
    vi.doMock('@/lib/auth-service', () => ({
      authServiceOrSession: vi.fn().mockResolvedValue(null),
    }));

    vi.resetModules();
    const { GET } = await import('@/app/api/webhooks/route');
    const req = new NextRequest('http://localhost/api/webhooks', { method: 'GET' });

    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
