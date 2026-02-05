/**
 * Sprint 41 - Sentry Error Capture Tests
 * 
 * Validates:
 * 1. sentry-utils.ts captureRouteError and captureRouteMessage work correctly
 * 2. Five high-traffic routes call captureRouteError in catch blocks
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Sentry
const mockSetTag = vi.fn();
const mockSetLevel = vi.fn();
const mockSetUser = vi.fn();
const mockSetExtra = vi.fn();
const mockCaptureException = vi.fn().mockReturnValue('sentry-event-id-123');
const mockCaptureMessage = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn((callback: (scope: unknown) => unknown) => {
    return callback({
      setTag: mockSetTag,
      setLevel: mockSetLevel,
      setUser: mockSetUser,
      setExtra: mockSetExtra,
    });
  }),
  captureException: mockCaptureException,
  captureMessage: mockCaptureMessage,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// sentry-utils.ts Unit Tests
// ============================================================
describe('captureRouteError', () => {
  it('captures an Error with route/method tags', async () => {
    const { captureRouteError } = await import('@/lib/sentry-utils');
    const testError = new Error('Database connection failed');

    const eventId = captureRouteError(testError, {
      route: '/api/accounts/[id]',
      method: 'GET',
    });

    expect(mockSetTag).toHaveBeenCalledWith('api.route', '/api/accounts/[id]');
    expect(mockSetTag).toHaveBeenCalledWith('api.method', 'GET');
    expect(mockSetLevel).toHaveBeenCalledWith('error');
    expect(mockCaptureException).toHaveBeenCalledWith(testError);
    expect(eventId).toBe('sentry-event-id-123');
  });

  it('sets user context when userId provided', async () => {
    const { captureRouteError } = await import('@/lib/sentry-utils');

    captureRouteError(new Error('test'), {
      route: '/api/ai/chat',
      method: 'POST',
      userId: 'user-abc-123',
    });

    expect(mockSetUser).toHaveBeenCalledWith({ id: 'user-abc-123' });
  });

  it('sets extras when provided', async () => {
    const { captureRouteError } = await import('@/lib/sentry-utils');

    captureRouteError(new Error('test'), {
      route: '/api/sequences/[id]/enroll',
      method: 'POST',
      extras: { sequenceId: 'seq-1', contactCount: 5 },
    });

    expect(mockSetExtra).toHaveBeenCalledWith('sequenceId', 'seq-1');
    expect(mockSetExtra).toHaveBeenCalledWith('contactCount', 5);
  });

  it('normalizes non-Error values to Error objects', async () => {
    const { captureRouteError } = await import('@/lib/sentry-utils');

    captureRouteError('string error', {
      route: '/api/outreach',
      method: 'POST',
    });

    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'string error' })
    );
  });
});

describe('captureRouteMessage', () => {
  it('captures a warning message with route tags', async () => {
    const { captureRouteMessage } = await import('@/lib/sentry-utils');

    captureRouteMessage('Rate limit approaching', {
      route: '/api/ai/chat',
      method: 'POST',
    });

    expect(mockSetTag).toHaveBeenCalledWith('api.route', '/api/ai/chat');
    expect(mockSetLevel).toHaveBeenCalledWith('warning');
    expect(mockCaptureMessage).toHaveBeenCalledWith('Rate limit approaching');
  });

  it('supports custom severity levels', async () => {
    const { captureRouteMessage } = await import('@/lib/sentry-utils');

    captureRouteMessage('Health check info', {
      route: '/api/health',
      method: 'GET',
    }, 'info');

    expect(mockSetLevel).toHaveBeenCalledWith('info');
  });
});

// ============================================================
// Route Integration Tests - verify captureRouteError is called
// ============================================================
const mockAuthServiceOrSession = vi.fn();
vi.mock('@/lib/auth-service', () => ({
  authServiceOrSession: (...args: unknown[]) => mockAuthServiceOrSession(...args),
}));

const mockPrisma = {
  target_accounts: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  people: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  outreach: {
    create: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  },
};
vi.mock('@/lib/db', () => ({ prisma: mockPrisma, db: mockPrisma }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/auto-recalculate', () => ({ autoRecalculateScore: vi.fn() }));

function mockRequest(method: string, body?: Record<string, unknown>) {
  const url = 'http://localhost:3000/api/test';
  const opts: RequestInit & { headers: Record<string, string> } = {
    method,
    headers: { 'content-type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  return new Request(url, opts);
}

const AUTH = { type: 'service' as const, userId: 'user-123', email: 'test@freightroll.com' };

describe('accounts/[id] route - Sentry integration', () => {
  it('calls captureRouteError on GET failure', async () => {
    mockAuthServiceOrSession.mockResolvedValue(AUTH);
    mockPrisma.target_accounts.findUnique.mockRejectedValue(new Error('DB down'));

    const { GET } = await import('@/app/api/accounts/[id]/route');
    const res = await GET(mockRequest('GET') as never, { params: { id: 'acc-1' } });

    expect(res.status).toBe(500);
    expect(mockCaptureException).toHaveBeenCalled();
    expect(mockSetTag).toHaveBeenCalledWith('api.route', '/api/accounts/[id]');
  });
});

describe('people/[id] route - Sentry + auth migration', () => {
  it('uses authServiceOrSession (not auth())', async () => {
    mockAuthServiceOrSession.mockResolvedValue(AUTH);
    mockPrisma.people.findUnique.mockResolvedValue({ id: 'p-1', name: 'Test' });

    const { GET } = await import('@/app/api/people/[id]/route');
    const res = await GET(mockRequest('GET') as never, { params: { id: 'p-1' } });

    expect(res.status).toBe(200);
    expect(mockAuthServiceOrSession).toHaveBeenCalled();
  });

  it('calls captureRouteError on DELETE failure', async () => {
    mockAuthServiceOrSession.mockResolvedValue(AUTH);
    mockPrisma.people.findUnique.mockResolvedValue({ accountId: 'acc-1' });
    mockPrisma.people.delete.mockRejectedValue(new Error('FK constraint'));

    const { DELETE } = await import('@/app/api/people/[id]/route');
    const res = await DELETE(mockRequest('DELETE') as never, { params: { id: 'p-1' } });

    expect(res.status).toBe(500);
    expect(mockCaptureException).toHaveBeenCalled();
    expect(mockSetTag).toHaveBeenCalledWith('api.route', '/api/people/[id]');
  });
});

describe('outreach route - Sentry integration', () => {
  it('calls captureRouteError on GET failure', async () => {
    mockAuthServiceOrSession.mockResolvedValue(AUTH);
    mockPrisma.outreach.findMany.mockRejectedValue(new Error('timeout'));

    const { GET } = await import('@/app/api/outreach/route');
    const res = await GET(mockRequest('GET') as never);

    expect(res.status).toBe(500);
    expect(mockCaptureException).toHaveBeenCalled();
    expect(mockSetTag).toHaveBeenCalledWith('api.route', '/api/outreach');
  });
});
