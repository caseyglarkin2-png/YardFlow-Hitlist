/**
 * Sprint 47 — Verify ESLint rule banning direct auth() imports in API routes
 *
 * This structural test ensures the .eslintrc.json has the no-restricted-imports
 * rule configured for API routes, preventing regression of the S2S auth migration.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('ESLint auth() import ban rule', () => {
  const eslintConfigPath = path.resolve(__dirname, '../../.eslintrc.json');

  it('.eslintrc.json exists and is valid JSON', () => {
    expect(fs.existsSync(eslintConfigPath)).toBe(true);
    const content = fs.readFileSync(eslintConfigPath, 'utf8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('has overrides section targeting API routes', () => {
    const config = JSON.parse(fs.readFileSync(eslintConfigPath, 'utf8'));
    expect(config.overrides).toBeDefined();
    expect(Array.isArray(config.overrides)).toBe(true);

    const apiOverride = config.overrides.find(
      (o: { files?: string[] }) => o.files && o.files.some((f: string) => f.includes('src/app/api'))
    );
    expect(apiOverride).toBeDefined();
  });

  it('bans @/auth imports in API routes with error severity', () => {
    const config = JSON.parse(fs.readFileSync(eslintConfigPath, 'utf8'));
    const apiOverride = config.overrides.find(
      (o: { files?: string[] }) => o.files && o.files.some((f: string) => f.includes('src/app/api'))
    );

    const rule = apiOverride.rules['no-restricted-imports'];
    expect(rule).toBeDefined();
    expect(rule[0]).toBe('error'); // Must be error, not warn

    const patterns = rule[1].patterns;
    expect(patterns).toBeDefined();

    // Should ban @/auth
    const authBan = patterns.find(
      (p: { group?: string[] }) => p.group && p.group.includes('@/auth')
    );
    expect(authBan).toBeDefined();
    expect(authBan.message).toContain('authServiceOrSession');
  });

  it('bans auth from @/lib/auth in API routes', () => {
    const config = JSON.parse(fs.readFileSync(eslintConfigPath, 'utf8'));
    const apiOverride = config.overrides.find(
      (o: { files?: string[] }) => o.files && o.files.some((f: string) => f.includes('src/app/api'))
    );

    const patterns = apiOverride.rules['no-restricted-imports'][1].patterns;
    const libAuthBan = patterns.find(
      (p: { group?: string[] }) => p.group && p.group.includes('@/lib/auth')
    );
    expect(libAuthBan).toBeDefined();
    expect(libAuthBan.message).toContain('authServiceOrSession');
  });

  it('exempt routes have eslint-disable comments', () => {
    const exemptRoutes = [
      'src/app/api/auth/session/route.ts',
      'src/app/api/auth/refresh/route.ts',
      'src/app/api/google/connect/route.ts',
      'src/app/api/auth/[...nextauth]/route.ts',
    ];

    for (const route of exemptRoutes) {
      const filePath = path.resolve(__dirname, '../../', route);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        expect(
          content.includes('eslint-disable') && content.includes('no-restricted-imports'),
          `${route} should have eslint-disable for no-restricted-imports`
        ).toBe(true);
      }
    }
  });

  it('no API routes import from @/auth without eslint-disable', () => {
    const apiDir = path.resolve(__dirname, '../../src/app/api');

    function findRouteFiles(dir: string): string[] {
      const files: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...findRouteFiles(fullPath));
        } else if (entry.name === 'route.ts') {
          files.push(fullPath);
        }
      }
      return files;
    }

    const routeFiles = findRouteFiles(apiDir);
    const violations: string[] = [];

    for (const file of routeFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Check for @/auth import (not @/auth-service, not @/auth.config)
        if (
          (line.includes("from '@/auth'") || line.includes('from "@/auth"')) &&
          !line.includes('auth-service') &&
          !line.includes('auth.config')
        ) {
          // Check if previous line has eslint-disable
          const prevLine = i > 0 ? lines[i - 1] : '';
          if (!prevLine.includes('eslint-disable')) {
            const relative = path.relative(apiDir, file);
            violations.push(relative);
          }
        }
        // Also check @/lib/auth (not auth-service)
        if (
          (line.includes("from '@/lib/auth'") || line.includes('from "@/lib/auth"')) &&
          !line.includes('auth-service') &&
          !line.includes('auth.config')
        ) {
          const prevLine = i > 0 ? lines[i - 1] : '';
          if (!prevLine.includes('eslint-disable')) {
            const relative = path.relative(apiDir, file);
            violations.push(relative);
          }
        }
      }
    }

    expect(
      violations,
      `These API routes import from @/auth or @/lib/auth without eslint-disable: ${violations.join(', ')}`
    ).toEqual([]);
  });
});
