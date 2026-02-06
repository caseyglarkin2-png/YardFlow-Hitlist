/**
 * Security Hardening Tests — Sprint 50
 *
 * Validates:
 * 1. All API routes have auth guards (no unprotected endpoints)
 * 2. Middleware sets security headers (HSTS, X-Frame-Options, etc.)
 * 3. Admin seed route is locked down in production
 * 4. Rate limiter uses Redis (not in-memory Map)
 * 5. Stub routes return 501 with proper error structure (not bare arrays)
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve(__dirname, '../../src');

// ─── Auth Guard Coverage ───────────────────────────────────────────────

describe('Auth Guard Coverage', () => {
  const STUB_ROUTES = [
    'app/api/dashboards/route.ts',
    'app/api/dashboards/[id]/route.ts',
    'app/api/workflows/route.ts',
    'app/api/workflows/[id]/route.ts',
    'app/api/workflows/launch/route.ts',
  ];

  STUB_ROUTES.forEach((routePath) => {
    it(`${routePath} imports authServiceOrSession`, () => {
      const filePath = path.join(SRC_DIR, routePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain("import { authServiceOrSession } from '@/lib/auth-service'");
    });

    it(`${routePath} calls authServiceOrSession in every handler`, () => {
      const filePath = path.join(SRC_DIR, routePath);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Count exported async functions (handlers)
      const handlerMatches = content.match(
        /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)/g
      );
      const handlerCount = handlerMatches ? handlerMatches.length : 0;

      // Count authServiceOrSession calls (excluding the import)
      const authCalls = content.match(/await\s+authServiceOrSession\(/g);
      const authCallCount = authCalls ? authCalls.length : 0;

      expect(authCallCount).toBeGreaterThanOrEqual(handlerCount);
    });
  });

  it('no API route handler returns { success: true } without any auth mechanism', () => {
    // Scan all route files for the dangerous pattern: returning success without any auth check
    const result = execSync(
      `grep -rn "success: true" ${SRC_DIR}/app/api/ --include="route.ts" -l || true`,
      { encoding: 'utf-8' }
    ).trim();

    if (result) {
      const files = result.split('\n').filter(Boolean);
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        // Accept any auth mechanism — authServiceOrSession, requireAuth, CRON_SECRET, getToken, auth(), webhook signature
        const hasAuth =
          content.includes('authServiceOrSession') ||
          content.includes('requireAuth') ||
          content.includes('CRON_SECRET') ||
          content.includes('getToken') ||
          content.includes('x-sendgrid-signature') ||
          content.includes('webhook') ||
          content.includes("from '@/auth'");
        expect(hasAuth, `${file} returns { success: true } but has no auth mechanism`).toBe(true);
      }
    }
  });
});

// ─── Admin Seed Lockdown ───────────────────────────────────────────────

describe('Admin Seed Route Lockdown', () => {
  const seedRoute = path.join(SRC_DIR, 'app/api/admin/seed/route.ts');

  it('uses authServiceOrSession instead of query-param secret', () => {
    const content = fs.readFileSync(seedRoute, 'utf-8');
    expect(content).toContain('authServiceOrSession');
    expect(content).not.toContain("searchParams.get('secret')");
    expect(content).not.toContain('AUTH_SECRET?.slice');
  });

  it('blocks requests in production unless ALLOW_SEED is set', () => {
    const content = fs.readFileSync(seedRoute, 'utf-8');
    expect(content).toContain("process.env.NODE_ENV === 'production'");
    expect(content).toContain('ALLOW_SEED');
  });

  it('GET endpoint requires authentication', () => {
    const content = fs.readFileSync(seedRoute, 'utf-8');
    // The GET handler should also call authServiceOrSession
    const getHandlerIdx = content.indexOf('export async function GET');
    const postHandlerIdx = content.indexOf('export async function POST');
    expect(getHandlerIdx).toBeGreaterThan(-1);

    // Auth call should appear in GET handler (after the function declaration)
    const getHandlerBody = content.slice(getHandlerIdx);
    expect(getHandlerBody).toContain('authServiceOrSession');
  });
});

// ─── Security Headers ──────────────────────────────────────────────────

describe('Middleware Security Headers', () => {
  const middlewarePath = path.join(SRC_DIR, 'middleware.ts');

  const REQUIRED_HEADERS = [
    'Strict-Transport-Security',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Referrer-Policy',
    'Permissions-Policy',
  ];

  REQUIRED_HEADERS.forEach((header) => {
    it(`sets ${header} header`, () => {
      const content = fs.readFileSync(middlewarePath, 'utf-8');
      expect(content).toContain(header);
    });
  });

  it('sets HSTS with includeSubDomains and max-age >= 1 year', () => {
    const content = fs.readFileSync(middlewarePath, 'utf-8');
    expect(content).toMatch(/max-age=31536000.*includeSubDomains/);
  });

  it('denies framing via X-Frame-Options', () => {
    const content = fs.readFileSync(middlewarePath, 'utf-8');
    expect(content).toContain("'DENY'");
  });

  it('applies security headers to both API and non-API routes', () => {
    const content = fs.readFileSync(middlewarePath, 'utf-8');
    // Security headers should be in a shared function, not only in the /api block
    expect(content).toContain('setSecurityHeaders');
    // Should be called for non-API routes too
    const callCount = (content.match(/setSecurityHeaders\(/g) || []).length;
    expect(callCount).toBeGreaterThanOrEqual(2);
  });
});

// ─── Rate Limiter Architecture ─────────────────────────────────────────

describe('AI Content Rate Limiter', () => {
  const rateLimiterPath = path.join(SRC_DIR, 'app/api/ai/content/generate/route.ts');
  const sharedRateLimiterPath = path.join(SRC_DIR, 'lib/rate-limiter.ts');

  it('uses shared Redis rate limiter (not inline implementation)', () => {
    const content = fs.readFileSync(rateLimiterPath, 'utf-8');
    // Should NOT have in-memory Map
    expect(content).not.toContain('new Map()');
    expect(content).not.toContain('new Map<');
    // Should import from shared rate-limiter module
    expect(content).toContain("from '@/lib/rate-limiter'");
  });

  it('shared rate limiter uses atomic MULTI/EXEC for INCR + EXPIRE', () => {
    const content = fs.readFileSync(sharedRateLimiterPath, 'utf-8');
    expect(content).toContain('redis.multi()');
    expect(content).toContain('multi.incr(');
    expect(content).toContain('multi.expire(');
    expect(content).toContain('multi.exec()');
  });

  it('shared rate limiter gracefully falls back when Redis is unavailable', () => {
    const content = fs.readFileSync(sharedRateLimiterPath, 'utf-8');
    // Should have a catch block that allows requests through
    expect(content).toContain('allowed: true');
    expect(content).toContain('failing open');
  });

  it('rate limit key includes ai:content namespace', () => {
    const content = fs.readFileSync(rateLimiterPath, 'utf-8');
    expect(content).toContain("'ai'");
    expect(content).toContain("'content'");
  });
});

// ─── API Contract Hygiene ──────────────────────────────────────────────

describe('API Contract Hygiene', () => {
  it('workflows GET returns { workflows: [] } not bare []', () => {
    const filePath = path.join(SRC_DIR, 'app/api/workflows/route.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    // Should wrap in object, not return bare array
    expect(content).not.toMatch(/NextResponse\.json\(\[\]\)/);
    expect(content).toContain('workflows: []');
  });

  it('all stub routes set dynamic = force-dynamic', () => {
    const stubs = [
      'app/api/dashboards/route.ts',
      'app/api/dashboards/[id]/route.ts',
      'app/api/workflows/route.ts',
      'app/api/workflows/[id]/route.ts',
    ];

    for (const stub of stubs) {
      const content = fs.readFileSync(path.join(SRC_DIR, stub), 'utf-8');
      expect(content).toContain("export const dynamic = 'force-dynamic'");
    }
  });

  it('workflows DELETE returns 501 not 200', () => {
    const filePath = path.join(SRC_DIR, 'app/api/workflows/[id]/route.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    // The DELETE handler should return 501, not bare { success: true }
    const deleteIdx = content.indexOf('export async function DELETE');
    expect(deleteIdx).toBeGreaterThan(-1);
    const deleteBody = content.slice(deleteIdx);
    expect(deleteBody).toContain('501');
  });
});
