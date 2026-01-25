/**
 * Tests for Email Validator
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailValidator } from '../email-validator';

// Mock fetch for MX record checks
global.fetch = vi.fn();

describe('EmailValidator', () => {
  let validator: EmailValidator;

  beforeEach(() => {
    validator = new EmailValidator();
    vi.clearAllMocks();
  });

  describe('validateEmail', () => {
    it('should reject invalid email format', async () => {
      const result = await validator.validateEmail('notanemail');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid email format');
      expect(result.confidence).toBe(0);
    });

    it('should accept valid email with MX records', async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        json: async () => ({
          Answer: [
            { data: '10 mx1.google.com' },
            { data: '20 mx2.google.com' },
          ],
        }),
      });

      const result = await validator.validateEmail('john@gmail.com');

      expect(result.valid).toBe(true);
      expect(result.reason).toContain('Valid format');
      expect(result.confidence).toBe(90);
      expect(result.mxRecords).toContain('mx1.google.com');
    });

    it('should reject email without MX records', async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        json: async () => ({
          Answer: [],
        }),
      });

      const result = await validator.validateEmail('john@nonexistentdomain123456.com');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('no MX records');
    });

    it('should handle MX check failures gracefully', async () => {
      (global.fetch as vi.Mock).mockRejectedValue(new Error('Network error'));

      const result = await validator.validateEmail('john@example.com');

      // Should not penalize for failed check
      expect(result.valid).toBe(false);
    });

    it('should validate various email formats', async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        json: async () => ({ Answer: [{ data: '10 mx.example.com' }] }),
      });

      const validEmails = [
        'john@example.com',
        'john.doe@example.com',
        'john_doe@example.com',
        'john+tag@example.com',
        'j.doe123@example.co.uk',
      ];

      for (const email of validEmails) {
        const result = await validator.validateEmail(email);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject malformed emails', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'john@',
        'john@@example.com',
        'john@.com',
      ];

      for (const email of invalidEmails) {
        const result = await validator.validateEmail(email);
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple emails', async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        json: async () => ({ Answer: [{ data: '10 mx.example.com' }] }),
      });

      const emails = [
        'john@example.com',
        'jane@example.com',
        'invalidemail',
      ];

      const results = await validator.validateBatch(emails);

      expect(results.size).toBe(3);
      expect(results.get('john@example.com')?.valid).toBe(true);
      expect(results.get('jane@example.com')?.valid).toBe(true);
      expect(results.get('invalidemail')?.valid).toBe(false);
    });
  });
});
