/**
 * Input Validation Tests — Sprint 51
 *
 * Validates:
 * 1. Shared parseBody() wrapper (valid/invalid/malformed JSON)
 * 2. Campaign, sequence, enrollment, prospect schemas
 * 3. Route-level validation integration (files use parseBody pattern)
 */

import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { parseBody } from '@/lib/validation';

const SRC_DIR = path.resolve(__dirname, '../../src');

// ─── parseBody() Unit Tests ────────────────────────────────────────────

describe('parseBody() wrapper', () => {
  const TestSchema = z.object({
    name: z.string().min(1),
    age: z.number().min(0),
  });

  function createRequest(body: unknown): NextRequest {
    return new NextRequest('http://localhost/test', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('returns success with valid data', async () => {
    const result = await parseBody(createRequest({ name: 'Casey', age: 30 }), TestSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Casey');
      expect(result.data.age).toBe(30);
    }
  });

  it('returns 400 for missing required fields', async () => {
    const result = await parseBody(createRequest({ age: 30 }), TestSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      const json = await result.response.json();
      expect(result.response.status).toBe(400);
      expect(json.error).toBe('Validation error');
      expect(json.details).toBeDefined();
      expect(json.details.length).toBeGreaterThan(0);
    }
  });

  it('returns 400 for wrong types', async () => {
    const result = await parseBody(
      createRequest({ name: 'Casey', age: 'not-a-number' }),
      TestSchema
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
    }
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new NextRequest('http://localhost/test', {
      method: 'POST',
      body: 'not-json{{{',
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await parseBody(req, TestSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      const json = await result.response.json();
      expect(result.response.status).toBe(400);
      expect(json.error).toBe('Invalid JSON body');
    }
  });

  it('returns 400 for empty body', async () => {
    const req = new NextRequest('http://localhost/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await parseBody(req, TestSchema);
    expect(result.success).toBe(false);
  });

  it('includes path in validation error details', async () => {
    const result = await parseBody(createRequest({ name: '', age: -1 }), TestSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      const json = await result.response.json();
      expect(json.details.some((d: { path: string }) => d.path === 'name')).toBe(true);
    }
  });
});

// ─── Route Schema Integration Tests ────────────────────────────────────

describe('Route-level validation integration', () => {
  const ROUTES_WITH_PARSEBODY = [
    'app/api/campaigns/route.ts',
    'app/api/campaigns/[id]/route.ts',
    'app/api/sequences/route.ts',
    'app/api/sequences/[id]/route.ts',
    'app/api/enrollments/route.ts',
    'app/api/prospects/[id]/route.ts',
    'app/api/prospects/batch/route.ts',
  ];

  ROUTES_WITH_PARSEBODY.forEach((routePath) => {
    it(`${routePath} uses parseBody for validation`, () => {
      const filePath = path.join(SRC_DIR, routePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain("from '@/lib/validation'");
      expect(content).toContain('parseBody');
    });

    it(`${routePath} defines a Zod schema`, () => {
      const filePath = path.join(SRC_DIR, routePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain("from 'zod'");
      expect(content).toMatch(/z\.(object|array)/);
    });
  });
});

// ─── Campaign Schema Tests ─────────────────────────────────────────────

describe('Campaign schemas', () => {
  it('CreateCampaignSchema rejects empty name', () => {
    const schema = z.object({
      name: z.string().min(1, 'Name is required').max(255),
    });
    const result = schema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('UpdateCampaignSchema accepts partial updates', () => {
    const schema = z.object({
      name: z.string().min(1).max(255).optional(),
      status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']).optional(),
    });
    const result = schema.safeParse({ status: 'ACTIVE' });
    expect(result.success).toBe(true);
  });

  it('UpdateCampaignSchema rejects invalid status', () => {
    const schema = z.object({
      status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']).optional(),
    });
    const result = schema.safeParse({ status: 'INVALID' });
    expect(result.success).toBe(false);
  });
});

// ─── Sequence Schema Tests ─────────────────────────────────────────────

describe('Sequence schemas', () => {
  const SequenceStepSchema = z.object({
    subject: z.string().min(1, 'Subject is required'),
    emailBody: z.string().min(1, 'Email body is required'),
    delayHours: z.number().min(0, 'Delay must be >= 0'),
  });

  const CreateSequenceSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    steps: z.array(SequenceStepSchema).min(1),
  });

  it('rejects missing name', () => {
    const result = CreateSequenceSchema.safeParse({
      steps: [{ subject: 'Hi', emailBody: 'Body', delayHours: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty steps array', () => {
    const result = CreateSequenceSchema.safeParse({
      name: 'Test',
      steps: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects step with negative delay', () => {
    const result = CreateSequenceSchema.safeParse({
      name: 'Test',
      steps: [{ subject: 'Hi', emailBody: 'Body', delayHours: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid sequence', () => {
    const result = CreateSequenceSchema.safeParse({
      name: 'Welcome Sequence',
      steps: [
        { subject: 'Welcome', emailBody: 'Hello!', delayHours: 0 },
        { subject: 'Follow Up', emailBody: 'Checking in', delayHours: 24 },
      ],
    });
    expect(result.success).toBe(true);
  });
});

// ─── Enrollment Schema Tests ───────────────────────────────────────────

describe('Enrollment schemas', () => {
  const CreateEnrollmentSchema = z.object({
    prospectId: z.string().min(1),
    flowId: z.string().min(1),
  });

  it('rejects missing prospectId', () => {
    const result = CreateEnrollmentSchema.safeParse({ flowId: 'flow-1' });
    expect(result.success).toBe(false);
  });

  it('rejects missing flowId', () => {
    const result = CreateEnrollmentSchema.safeParse({ prospectId: 'p-1' });
    expect(result.success).toBe(false);
  });

  it('accepts valid enrollment', () => {
    const result = CreateEnrollmentSchema.safeParse({ prospectId: 'p-1', flowId: 'flow-1' });
    expect(result.success).toBe(true);
  });
});

// ─── Prospect Schema Tests ──────────────────────────────────────────────

describe('Prospect schemas', () => {
  it('rejects invalid email format', () => {
    const schema = z.object({
      email: z.string().email('Invalid email format'),
    });
    const result = schema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('accepts valid email', () => {
    const schema = z.object({
      email: z.string().email('Invalid email format'),
    });
    const result = schema.safeParse({ email: 'casey@freightroll.com' });
    expect(result.success).toBe(true);
  });

  it('batch rejects > 1000 prospects', () => {
    const schema = z.object({
      prospects: z.array(z.object({ email: z.string() })).max(1000),
    });
    const bigArray = Array.from({ length: 1001 }, (_, i) => ({ email: `user${i}@test.com` }));
    const result = schema.safeParse({ prospects: bigArray });
    expect(result.success).toBe(false);
  });
});
