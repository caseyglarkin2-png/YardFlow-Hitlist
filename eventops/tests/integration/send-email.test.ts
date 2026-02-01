import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing route
vi.mock('@/lib/db', () => ({
  prisma: {
    outreach: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth-service', () => ({
  authServiceOrSession: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn(),
  },
}));

import { POST } from '@/app/api/outreach/send-email/route';
import { prisma } from '@/lib/db';
import { authServiceOrSession } from '@/lib/auth-service';

const mockPrisma = prisma as {
  outreach: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const mockAuth = authServiceOrSession as ReturnType<typeof vi.fn>;

describe('POST /api/outreach/send-email', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, SENDGRID_API_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function createRequest(body: unknown): NextRequest {
    return new NextRequest('http://localhost/api/outreach/send-email', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(createRequest({ outreachId: '123' }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.code).toBe('AUTH_REQUIRED');
  });

  it('returns 400 when outreachId is missing', async () => {
    mockAuth.mockResolvedValue({ type: 'service', userId: 'test' });

    const res = await POST(createRequest({}));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe('VALIDATION_ERROR');
    expect(json.details).toBeDefined(); // Zod returns "Required" for missing fields
  });

  it('returns 404 when outreach not found', async () => {
    mockAuth.mockResolvedValue({ type: 'service', userId: 'test' });
    mockPrisma.outreach.findUnique.mockResolvedValue(null);

    const res = await POST(createRequest({ outreachId: 'not-found' }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.code).toBe('NOT_FOUND');
  });

  it('returns 422 when recipient has no email', async () => {
    mockAuth.mockResolvedValue({ type: 'service', userId: 'test' });
    mockPrisma.outreach.findUnique.mockResolvedValue({
      id: '123',
      channel: 'EMAIL',
      subject: 'Test',
      message: '<p>Hello</p>',
      people: { email: null, name: 'John' },
    });

    const res = await POST(createRequest({ outreachId: '123' }));
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.code).toBe('MISSING_EMAIL');
  });

  it('returns 422 when email format is invalid', async () => {
    mockAuth.mockResolvedValue({ type: 'service', userId: 'test' });
    mockPrisma.outreach.findUnique.mockResolvedValue({
      id: '123',
      channel: 'EMAIL',
      subject: 'Test',
      message: '<p>Hello</p>',
      people: { email: 'not-an-email', name: 'John' },
    });

    const res = await POST(createRequest({ outreachId: '123' }));
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.code).toBe('INVALID_EMAIL');
  });

  it('returns 400 when channel is not EMAIL', async () => {
    mockAuth.mockResolvedValue({ type: 'service', userId: 'test' });
    mockPrisma.outreach.findUnique.mockResolvedValue({
      id: '123',
      channel: 'LINKEDIN',
      subject: 'Test',
      message: '<p>Hello</p>',
      people: { email: 'test@example.com', name: 'John' },
    });

    const res = await POST(createRequest({ outreachId: '123' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe('WRONG_CHANNEL');
  });

  it('returns 422 when subject is missing', async () => {
    mockAuth.mockResolvedValue({ type: 'service', userId: 'test' });
    mockPrisma.outreach.findUnique.mockResolvedValue({
      id: '123',
      channel: 'EMAIL',
      subject: '',
      message: '<p>Hello</p>',
      people: { email: 'test@example.com', name: 'John' },
    });

    const res = await POST(createRequest({ outreachId: '123' }));
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.code).toBe('MISSING_SUBJECT');
  });

  it('returns 422 when message body is missing', async () => {
    mockAuth.mockResolvedValue({ type: 'service', userId: 'test' });
    mockPrisma.outreach.findUnique.mockResolvedValue({
      id: '123',
      channel: 'EMAIL',
      subject: 'Test Subject',
      message: '',
      people: { email: 'test@example.com', name: 'John' },
    });

    const res = await POST(createRequest({ outreachId: '123' }));
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.code).toBe('MISSING_BODY');
  });

  it('returns 409 when email was recently sent (dedupe)', async () => {
    mockAuth.mockResolvedValue({ type: 'service', userId: 'test' });
    mockPrisma.outreach.findUnique.mockResolvedValue({
      id: '123',
      channel: 'EMAIL',
      subject: 'Test Subject',
      message: '<p>Hello</p>',
      sentAt: new Date(), // Just sent
      people: { email: 'test@example.com', name: 'John' },
    });

    const res = await POST(createRequest({ outreachId: '123' }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.code).toBe('ALREADY_SENT');
  });

  it('allows resend with force=true', async () => {
    mockAuth.mockResolvedValue({ type: 'service', userId: 'test' });
    mockPrisma.outreach.findUnique.mockResolvedValue({
      id: '123',
      channel: 'EMAIL',
      subject: 'Test Subject',
      message: '<p>Hello</p>',
      sentAt: new Date(),
      people: { email: 'test@example.com', name: 'John' },
    });
    mockPrisma.outreach.update.mockResolvedValue({ id: '123' });

    // Mock SendGrid
    const sgMail = await import('@sendgrid/mail');
    (sgMail.default.send as ReturnType<typeof vi.fn>).mockResolvedValue([
      { headers: { 'x-message-id': 'test-msg-id' } },
    ]);

    const res = await POST(createRequest({ outreachId: '123', force: true }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.messageId).toBe('test-msg-id');
  });

  it('returns 503 when SendGrid is not configured', async () => {
    delete process.env.SENDGRID_API_KEY;

    mockAuth.mockResolvedValue({ type: 'service', userId: 'test' });
    mockPrisma.outreach.findUnique.mockResolvedValue({
      id: '123',
      channel: 'EMAIL',
      subject: 'Test Subject',
      message: '<p>Hello</p>',
      people: { email: 'test@example.com', name: 'John' },
    });

    const res = await POST(createRequest({ outreachId: '123' }));
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.code).toBe('SERVICE_UNAVAILABLE');
  });
});
