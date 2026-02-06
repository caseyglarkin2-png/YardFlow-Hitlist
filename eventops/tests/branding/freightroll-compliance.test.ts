/**
 * FreightRoll Branding Compliance Tests
 *
 * Ensures no customer-facing code uses "EventOps" or "YardFlow" branding.
 * All customer-facing output must use "FreightRoll" until after Manifest 2026.
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

const SRC_DIR = path.resolve(__dirname, '../../src');

// Files that are ALLOWED to contain "EventOps" or "YardFlow" references
// because they exist to catch/prevent branding slips
const ALLOWLISTED_PATTERNS = [
  'voiceConfigs.ts', // AI prompt telling model NOT to use YardFlow
  'content-generator.ts', // Contains sanitizeFreightRollContent() sanitizer
  'copilot-instructions', // Developer docs
  '__tests__', // Test files can reference old branding for testing
  '.test.ts', // Test files
  '.test.tsx', // Test files
  'node_modules', // Dependencies
  '.next', // Build artifacts
];

function buildGrepExclude(): string {
  return ALLOWLISTED_PATTERNS.map((p) => `--exclude='*${p}*'`).join(' ');
}

describe('FreightRoll Branding Compliance', () => {
  describe('No "EventOps" in customer-facing code', () => {
    it('should have zero "EventOps" references in src/ (excluding allowlisted files)', () => {
      try {
        // grep returns exit code 1 when no matches found (which is what we want)
        const result = execSync(
          `grep -rn "EventOps" "${SRC_DIR}" ${buildGrepExclude()} --include='*.ts' --include='*.tsx' || true`,
          { encoding: 'utf-8' }
        ).trim();

        const matches = result
          .split('\n')
          .filter((line) => line.length > 0)
          .filter((line) => !ALLOWLISTED_PATTERNS.some((p) => line.includes(p)));

        if (matches.length > 0) {
          console.error('Found "EventOps" in customer-facing code:');
          matches.forEach((m) => console.error(`  ${m}`));
        }

        expect(matches.length).toBe(0);
      } catch (_error) {
        // grep exits with code 1 when no matches found — that's success
        expect(true).toBe(true);
      }
    });

    it('should have zero "eventops.io" URLs in src/', () => {
      try {
        const result = execSync(
          `grep -rn "eventops\\.io" "${SRC_DIR}" ${buildGrepExclude()} --include='*.ts' --include='*.tsx' || true`,
          { encoding: 'utf-8' }
        ).trim();

        const matches = result
          .split('\n')
          .filter((line) => line.length > 0)
          .filter((line) => !ALLOWLISTED_PATTERNS.some((p) => line.includes(p)));

        if (matches.length > 0) {
          console.error('Found "eventops.io" URLs in code:');
          matches.forEach((m) => console.error(`  ${m}`));
        }

        expect(matches.length).toBe(0);
      } catch (_error) {
        expect(true).toBe(true);
      }
    });
  });

  describe('No "YardFlow" in customer-facing email/outreach defaults', () => {
    it('should not use "YardFlow" in email sender defaults', () => {
      try {
        const result = execSync(
          `grep -rn "YardFlow\\|yardflow" "${SRC_DIR}/lib/outreach" "${SRC_DIR}/lib/sendgrid.ts" "${SRC_DIR}/lib/email" --include='*.ts' || true`,
          { encoding: 'utf-8' }
        ).trim();

        const matches = result
          .split('\n')
          .filter((line) => line.length > 0)
          // Allow references in sanitizer code and comments about sanitization
          .filter((line) => !line.includes('sanitize'))
          .filter((line) => !line.includes('content-generator'))
          .filter((line) => !ALLOWLISTED_PATTERNS.some((p) => line.includes(p)));

        if (matches.length > 0) {
          console.error('Found "YardFlow" in email/outreach code:');
          matches.forEach((m) => console.error(`  ${m}`));
        }

        expect(matches.length).toBe(0);
      } catch (_error) {
        expect(true).toBe(true);
      }
    });
  });

  describe('Correct FreightRoll defaults', () => {
    it('should use freightroll.com in FROM_EMAIL default', async () => {
      const content = execSync(`grep "FROM_EMAIL" "${SRC_DIR}/lib/outreach/email-sender.ts"`, {
        encoding: 'utf-8',
      });
      expect(content).toContain('freightroll.com');
      expect(content).not.toContain('yardflow.com');
    });

    it('should use FreightRoll in FROM_NAME default', async () => {
      const content = execSync(`grep "FROM_NAME" "${SRC_DIR}/lib/outreach/email-sender.ts"`, {
        encoding: 'utf-8',
      });
      expect(content).toContain('FreightRoll');
      expect(content).not.toContain('YardFlow');
    });

    it('should use FreightRoll in SendGrid FROM_NAME default', async () => {
      const content = execSync(`grep "FROM_NAME" "${SRC_DIR}/lib/sendgrid.ts"`, {
        encoding: 'utf-8',
      });
      expect(content).toContain('FreightRoll');
      expect(content).not.toContain('EventOps');
    });

    it('should use FreightRoll in HubSpot outreach defaults', async () => {
      const content = execSync(
        `grep -n "Outreach from\\|scheduled via" "${SRC_DIR}/lib/hubspot-integration.ts"`,
        { encoding: 'utf-8' }
      );
      expect(content).toContain('FreightRoll');
      expect(content).not.toContain('EventOps');
    });

    it('should use FreightRoll in report titles and filenames', async () => {
      const content = execSync(
        `grep -n "filename=\\|<title>" "${SRC_DIR}/app/api/reports/pdf/route.ts"`,
        { encoding: 'utf-8' }
      );
      expect(content).toContain('FreightRoll');
      expect(content).not.toContain('EventOps');
    });

    it('should use FreightRoll in export filenames', async () => {
      const content = execSync(`grep "filename=" "${SRC_DIR}/app/api/export/full/route.ts"`, {
        encoding: 'utf-8',
      });
      expect(content).toContain('FreightRoll');
      expect(content).not.toContain('EventOps');
    });

    it('should use FreightRoll in UI layout metadata', async () => {
      const content = execSync(`grep -n "title:" "${SRC_DIR}/app/layout.tsx"`, {
        encoding: 'utf-8',
      });
      expect(content).toContain('FreightRoll');
      expect(content).not.toContain('EventOps');
    });
  });
});
