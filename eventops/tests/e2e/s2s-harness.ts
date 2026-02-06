/**
 * Sprint 56 — S2S Integration Test Harness
 *
 * Reusable utilities for calling route handlers in tests.
 * Provides mock setup, request factories, and response validators.
 *
 * Usage in tests:
 *   import { createAuthenticatedRequest, createS2SRequest, mockAuthAs } from './s2s-harness';
 */

import { NextRequest } from 'next/server';
import { vi } from 'vitest';

// ─── Types ─────────────────────────────────────────────────────────────

export interface AuthSession {
  type: 'session';
  userId: string;
  email?: string;
}

export interface AuthService {
  type: 'service';
  userId: string;
  email?: string;
}

export type AuthResult = AuthSession | AuthService | null;

// ─── Default Test Fixtures ─────────────────────────────────────────────

export const TEST_USER = {
  id: 'test-user-id',
  email: 'test@freightroll.com',
  name: 'Test User',
  activeEventId: 'event-manifest-2026',
} as const;

export const TEST_EVENT = {
  id: 'event-manifest-2026',
  name: 'Manifest 2026',
} as const;

export const TEST_ACCOUNT = {
  id: 'acc-test-1',
  name: 'Test Logistics Co',
  website: 'https://testlogistics.com',
  industry: 'logistics',
  headquarters: 'Chicago, IL',
  icpScore: 85,
  notes: 'High-value target',
  eventId: TEST_EVENT.id,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  _count: { people: 3 },
};

export const TEST_PERSON = {
  id: 'person-test-1',
  accountId: TEST_ACCOUNT.id,
  name: 'Jane Ops',
  title: 'VP Operations',
  email: 'jane@testlogistics.com',
  phone: '555-0100',
  linkedin: 'https://linkedin.com/in/janeops',
  isExecOps: true,
  isOps: true,
  isProc: false,
  isSales: false,
  isTech: false,
  isNonOps: false,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── Request Factories ─────────────────────────────────────────────────

const BASE_URL = 'http://localhost:3000';

/**
 * Create a NextRequest for a session-authenticated user.
 */
export function createAuthenticatedRequest(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const url = new URL(path, BASE_URL);
  if (options.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  const init: RequestInit & { headers: Record<string, string> } = {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
  };

  if (options.body) {
    init.body = JSON.stringify(options.body);
  }

  return new NextRequest(url.toString(), init);
}

/**
 * Create a NextRequest simulating S2S (service-to-service) auth.
 */
export function createS2SRequest(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    userId?: string;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const url = new URL(path, BASE_URL);
  if (options.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  const init: RequestInit & { headers: Record<string, string> } = {
    method: options.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-cron-secret',
      'x-user-id': options.userId || TEST_USER.id,
    },
  };

  if (options.body) {
    init.body = JSON.stringify(options.body);
  }

  return new NextRequest(url.toString(), init);
}

// ─── Auth Mocking ──────────────────────────────────────────────────────

/**
 * Configure the auth mock to return a session-authenticated user.
 */
export function mockAuthAsSession(
  authMock: ReturnType<typeof vi.fn>,
  userId: string = TEST_USER.id,
  email: string = TEST_USER.email
): void {
  authMock.mockResolvedValue({
    type: 'session',
    userId,
    email,
  });
}

/**
 * Configure the auth mock to return an S2S service identity.
 */
export function mockAuthAsService(
  authMock: ReturnType<typeof vi.fn>,
  userId: string = 'service:gtm-frontend'
): void {
  authMock.mockResolvedValue({
    type: 'service',
    userId,
  });
}

/**
 * Configure the auth mock to reject (unauthorized).
 */
export function mockAuthAsUnauthorized(
  authMock: ReturnType<typeof vi.fn>
): void {
  authMock.mockResolvedValue(null);
}

// ─── Response Validators ───────────────────────────────────────────────

/**
 * Assert a response matches standard API error shape.
 */
export async function expectApiError(
  res: Response,
  expectedStatus: number
): Promise<{ error: string; details?: unknown }> {
  const body = await res.json();
  if (res.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${res.status}. Body: ${JSON.stringify(body)}`
    );
  }
  if (!body.error || typeof body.error !== 'string') {
    throw new Error(
      `Expected { error: string } shape, got: ${JSON.stringify(body)}`
    );
  }
  return body;
}

/**
 * Assert a response is successful JSON with the given status.
 */
export async function expectSuccess<T = Record<string, unknown>>(
  res: Response,
  expectedStatus: number = 200
): Promise<T> {
  const body = await res.json();
  if (res.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${res.status}. Body: ${JSON.stringify(body)}`
    );
  }
  return body as T;
}

/**
 * Measure response timing.
 */
export async function timedCall<T>(
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = Math.round(performance.now() - start);
  return { result, durationMs };
}
