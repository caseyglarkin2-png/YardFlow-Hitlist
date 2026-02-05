import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth-service', () => ({
  authServiceOrSession: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const generateContentMock = vi.fn();
vi.mock('@/lib/ai/gemini-client', () => ({
  getGeminiClient: () => ({
    generateContent: generateContentMock,
  }),
}));

import { POST } from '@/app/api/ai/content/generate/route';
import { authServiceOrSession } from '@/lib/auth-service';

const mockAuth = authServiceOrSession as ReturnType<typeof vi.fn>;

describe('POST /api/ai/content/generate', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, CALENDLY_LINK: 'https://calendly.com/demo' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function createRequest(body: unknown, headers?: Record<string, string>): NextRequest {
    return new NextRequest('http://localhost/api/ai/content/generate', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
  }

  it('returns 401 when missing auth', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(
      createRequest({
        type: 'email',
        tone: 'freightroll',
        context: { prospectName: 'Casey', companyName: 'FreightRoll' },
      })
    );

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('unauthorized');
  });

  it('returns 400 for invalid tone', async () => {
    mockAuth.mockResolvedValue({ type: 'service', userId: 'service:test' });

    const res = await POST(
      createRequest({
        type: 'email',
        tone: 'unknown',
        context: { prospectName: 'Casey', companyName: 'FreightRoll' },
      })
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('returns subject + content for valid request', async () => {
    mockAuth.mockResolvedValue({ type: 'service', userId: 'service:test' });
    generateContentMock.mockResolvedValueOnce(
      JSON.stringify({
        subject: 'Test Subject',
        content: 'Quick note? https://calendly.com/demo $1M',
      })
    );

    const res = await POST(
      createRequest({
        type: 'email',
        tone: 'freightroll',
        context: { prospectName: 'Casey', companyName: 'FreightRoll' },
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.subject).toBe('Test Subject');
    expect(typeof json.content).toBe('string');
  });

  it('repairs freightroll content to satisfy constraints', async () => {
    mockAuth.mockResolvedValue({ type: 'service', userId: 'service:test' });
    generateContentMock
      .mockResolvedValueOnce(
        JSON.stringify({ subject: 'Hi', content: 'Too long and missing parts' })
      )
      .mockResolvedValueOnce(JSON.stringify({ subject: 'Hi', content: 'Need a quick chat? $1M' }));

    const res = await POST(
      createRequest({
        type: 'email',
        tone: 'freightroll',
        context: { prospectName: 'Casey', companyName: 'FreightRoll' },
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    const content = json.content as string;
    expect(content.includes('https://calendly.com/demo')).toBe(true);
    expect((content.match(/\?/g) || []).length).toBe(1);
    expect(content.length).toBeLessThanOrEqual(250);
  });
});
