/**
 * Email Config Validator Tests
 *
 * Sprint 59: Tests for email configuration validation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateEmailConfig,
  getEmailConfigSummary,
} from '@/lib/email/config-validator';

describe('Email Config Validator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    vi.resetModules();
    process.env = { ...originalEnv };
    // Clear SendGrid-related vars
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_API_KEY_CASEY;
    delete process.env.SENDGRID_FROM_EMAIL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('API Key Validation', () => {
    it('detects missing SENDGRID_API_KEY', () => {
      const result = validateEmailConfig();
      expect(result.valid).toBe(false);
      expect(result.apiKeySet).toBe(false);
      expect(result.errors).toContain('SENDGRID_API_KEY is not set');
    });

    it('detects wrong variable name (SENDGRID_API_KEY_CASEY)', () => {
      process.env.SENDGRID_API_KEY_CASEY = 'SG.test-key-here-long-enough-12345';
      const result = validateEmailConfig();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Found SENDGRID_API_KEY_CASEY but code expects SENDGRID_API_KEY - rename the variable in Railway'
      );
    });

    it('detects short/invalid API key', () => {
      process.env.SENDGRID_API_KEY = 'short';
      const result = validateEmailConfig();
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('appears invalid');
    });

    it('warns when API key does not start with SG.', () => {
      process.env.SENDGRID_API_KEY =
        'not-starting-with-SG-but-long-enough-12345678901234567890';
      const result = validateEmailConfig();
      expect(result.warnings).toContain(
        'SENDGRID_API_KEY does not start with "SG." - verify this is a valid SendGrid key'
      );
    });

    it('accepts valid API key starting with SG.', () => {
      process.env.SENDGRID_API_KEY =
        'SG.valid-api-key-that-is-definitely-long-enough-1234567890';
      process.env.SENDGRID_FROM_EMAIL = 'casey@freightroll.com';
      const result = validateEmailConfig();
      expect(result.valid).toBe(true);
      expect(result.apiKeySet).toBe(true);
    });
  });

  describe('From Email Validation', () => {
    beforeEach(() => {
      // Set valid API key for these tests
      process.env.SENDGRID_API_KEY =
        'SG.valid-api-key-that-is-definitely-long-enough-1234567890';
    });

    it('warns when SENDGRID_FROM_EMAIL not set', () => {
      const result = validateEmailConfig();
      expect(result.fromEmailSet).toBe(false);
      expect(result.warnings).toContain(
        'SENDGRID_FROM_EMAIL not set - will use default casey@freightroll.com'
      );
    });

    it('rejects invalid email format', () => {
      process.env.SENDGRID_FROM_EMAIL = 'not-an-email';
      const result = validateEmailConfig();
      expect(result.valid).toBe(false);
      expect(result.fromEmailValid).toBe(false);
      expect(result.errors[0]).toContain('is not a valid email');
    });

    it('warns about unverified jake@ sender', () => {
      process.env.SENDGRID_FROM_EMAIL = 'jake@freightroll.com';
      const result = validateEmailConfig();
      expect(result.warnings).toContain(
        'SENDGRID_FROM_EMAIL is jake@freightroll.com - ensure this sender is verified in SendGrid'
      );
    });

    it('warns about non-freightroll.com domain', () => {
      process.env.SENDGRID_FROM_EMAIL = 'test@gmail.com';
      const result = validateEmailConfig();
      expect(result.warnings).toContain(
        'SENDGRID_FROM_EMAIL "test@gmail.com" is not from @freightroll.com domain'
      );
    });

    it('accepts valid freightroll.com email', () => {
      process.env.SENDGRID_FROM_EMAIL = 'casey@freightroll.com';
      const result = validateEmailConfig();
      expect(result.valid).toBe(true);
      expect(result.fromEmailSet).toBe(true);
      expect(result.fromEmailValid).toBe(true);
      expect(result.fromEmail).toBe('casey@freightroll.com');
    });
  });

  describe('Full Configuration', () => {
    it('passes with valid complete config', () => {
      process.env.SENDGRID_API_KEY =
        'SG.valid-api-key-that-is-definitely-long-enough-1234567890';
      process.env.SENDGRID_FROM_EMAIL = 'casey@freightroll.com';

      const result = validateEmailConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.apiKeySet).toBe(true);
      expect(result.fromEmailSet).toBe(true);
      expect(result.fromEmailValid).toBe(true);
    });

    it('reports multiple errors when both vars missing', () => {
      const result = validateEmailConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.apiKeySet).toBe(false);
      expect(result.fromEmailSet).toBe(false);
    });
  });

  describe('getEmailConfigSummary', () => {
    it('returns OK message for valid config', () => {
      process.env.SENDGRID_API_KEY =
        'SG.valid-api-key-that-is-definitely-long-enough-1234567890';
      process.env.SENDGRID_FROM_EMAIL = 'casey@freightroll.com';

      const summary = getEmailConfigSummary();
      expect(summary).toBe('Email config OK: from=casey@freightroll.com');
    });

    it('returns issues message for invalid config', () => {
      const summary = getEmailConfigSummary();
      expect(summary).toContain('Email config issues:');
      expect(summary).toContain('SENDGRID_API_KEY is not set');
    });
  });
});
