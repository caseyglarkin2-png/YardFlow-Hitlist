/**
 * JSON Response Consistency Tests
 *
 * Sprint 57: Ensures all API routes return JSON on errors.
 * This prevents frontend "Unexpected token" errors when parsing responses.
 *
 * @see https://github.com/caseyglarkin2-png/YardFlow-Hitlist/issues/TBD
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '../../src');
const API_DIR = path.join(SRC_DIR, 'app/api');

/**
 * Allowlist of routes that intentionally return non-JSON:
 * - /api/unsubscribe - Returns HTML for user-facing unsubscribe page
 * - /api/tracking/* - Returns pixel images
 * - /api/outreach/track/* - Returns pixel images
 * - /api/reports/pdf - Returns PDF binary
 * - /api/export/* - Returns CSV/other formats
 */
const ALLOWED_NON_JSON_PATTERNS = [
  /^\/api\/unsubscribe/,
  /^\/api\/tracking\//,
  /^\/api\/outreach\/track\//,
  /^\/api\/reports\/pdf/,
  /^\/api\/export\//,
];

function isAllowedNonJson(filePath: string): boolean {
  // Convert file path to API route path
  const relativePath = filePath.replace(API_DIR, '/api').replace('/route.ts', '');
  return ALLOWED_NON_JSON_PATTERNS.some((pattern) => pattern.test(relativePath));
}

describe('JSON Response Consistency', () => {
  describe('All API routes return JSON on errors', () => {
    it('should not have plain text error responses in API routes', () => {
      // Find all route files that return plain text errors
      // Pattern: new NextResponse('...',  { status: 4xx|5xx })
      const grepCommand = `grep -r "new NextResponse('[^']*'," "${API_DIR}" --include="*.ts" -l 2>/dev/null || true`;
      const result = execSync(grepCommand, { encoding: 'utf-8' }).trim();

      const filesWithPlainText = result
        .split('\n')
        .filter((line) => line.trim() !== '')
        .filter((file) => !isAllowedNonJson(file));

      // For each file, check if the plain text responses are error codes (4xx, 5xx)
      const violatingFiles: Array<{ file: string; lines: string[] }> = [];

      for (const file of filesWithPlainText) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        const errorLines: string[] = [];

        lines.forEach((line, index) => {
          // Match plain text NextResponse with error status codes
          if (
            line.includes("new NextResponse('") &&
            (line.includes('status: 4') || line.includes('status: 5'))
          ) {
            // Exclude tracking pixel returns (content type image)
            if (!line.includes('Content-Type') && !line.includes('image/')) {
              errorLines.push(`Line ${index + 1}: ${line.trim()}`);
            }
          }
        });

        if (errorLines.length > 0) {
          violatingFiles.push({ file: file.replace(SRC_DIR, 'src'), lines: errorLines });
        }
      }

      if (violatingFiles.length > 0) {
        const report = violatingFiles
          .map((v) => `${v.file}:\n  ${v.lines.join('\n  ')}`)
          .join('\n\n');
        console.error('Found plain text error responses that should be JSON:\n' + report);
      }

      expect(violatingFiles).toHaveLength(0);
    });

    it('should use NextResponse.json() for error responses', () => {
      // Verify that common error patterns use JSON
      // Count files (use -l to list files, then count)
      const grepCommand = `grep -rl "NextResponse.json.*error" "${API_DIR}" --include="*.ts" 2>/dev/null | wc -l`;
      const result = execSync(grepCommand, { encoding: 'utf-8' }).trim();
      const jsonErrorFiles = parseInt(result, 10) || 0;

      // We should have many files with JSON error responses
      expect(jsonErrorFiles).toBeGreaterThan(50);
    });
  });

  describe('Campaign Status Route', () => {
    it('returns JSON for 401 Unauthorized', async () => {
      const routePath = path.join(API_DIR, 'campaigns/[id]/status/route.ts');
      const content = fs.readFileSync(routePath, 'utf-8');

      // Should use NextResponse.json for 401
      expect(content).toContain("NextResponse.json({ error: 'Unauthorized' }, { status: 401 })");

      // Should NOT use plain text NextResponse for 401
      expect(content).not.toContain("new NextResponse('Unauthorized', { status: 401 })");
    });

    it('returns JSON for 404 Not Found', async () => {
      const routePath = path.join(API_DIR, 'campaigns/[id]/status/route.ts');
      const content = fs.readFileSync(routePath, 'utf-8');

      // Should use NextResponse.json for 404
      expect(content).toContain(
        "NextResponse.json({ error: 'Campaign/Task not found' }, { status: 404 })"
      );
    });

    it('returns JSON for 500 Internal Server Error', async () => {
      const routePath = path.join(API_DIR, 'campaigns/[id]/status/route.ts');
      const content = fs.readFileSync(routePath, 'utf-8');

      // Should use NextResponse.json for 500
      expect(content).toContain(
        "NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })"
      );
    });
  });

  describe('Email Send Route', () => {
    it('returns JSON for all error responses', async () => {
      const routePath = path.join(API_DIR, 'email/send/route.ts');
      const content = fs.readFileSync(routePath, 'utf-8');

      // Should use NextResponse.json for errors
      expect(content).toContain("NextResponse.json({ error: 'Unauthorized' }, { status: 401 })");

      // Should NOT have plain text error responses
      expect(content).not.toMatch(/new NextResponse\('[^']+',\s*\{\s*status:\s*[45]\d{2}/);
    });
  });

  describe('Outreach Route', () => {
    it('returns JSON for all error responses', async () => {
      const routePath = path.join(API_DIR, 'outreach/route.ts');
      const content = fs.readFileSync(routePath, 'utf-8');

      // Should use NextResponse.json for errors
      expect(content).toContain("NextResponse.json({ error: 'Unauthorized' }, { status: 401 })");

      // Should NOT have plain text error responses
      expect(content).not.toMatch(/new NextResponse\('[^']+',\s*\{\s*status:\s*[45]\d{2}/);
    });
  });

  describe('Email Stats Route', () => {
    it('returns JSON for all error responses', async () => {
      const routePath = path.join(API_DIR, 'email/stats/route.ts');
      const content = fs.readFileSync(routePath, 'utf-8');

      // Should use NextResponse.json for errors
      expect(content).toContain("NextResponse.json({ error: 'Unauthorized' }, { status: 401 })");
      expect(content).toContain('NextResponse.json({ error:');

      // Should NOT have plain text error responses
      expect(content).not.toMatch(/new NextResponse\('[^']+',\s*\{\s*status:\s*[45]\d{2}/);
    });
  });
});
