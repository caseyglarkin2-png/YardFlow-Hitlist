/**
 * Email Validator
 * Validates email format and checks DNS MX records
 */

import { prisma } from '@/lib/db';
import type { ValidationResult } from './types';

export class EmailValidator {
  /**
   * Validate email format and DNS MX records
   */
  async validateEmail(email: string): Promise<ValidationResult> {
    // 1. Format validation
    if (!this.isValidFormat(email)) {
      return {
        valid: false,
        reason: 'Invalid email format',
        confidence: 0
      };
    }

    // 2. Extract domain
    const [, domain] = email.split('@');

    // 3. Check DNS MX records
    const mxResult = await this.checkMXRecords(domain);

    if (mxResult.hasMX) {
      return {
        valid: true,
        reason: 'Valid format and domain accepts email',
        confidence: 90,
        mxRecords: mxResult.records
      };
    } else {
      return {
        valid: false,
        reason: 'Domain does not accept email (no MX records)',
        confidence: 20
      };
    }
  }

  /**
   * Validate email format using regex
   */
  private isValidFormat(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Check if domain has MX records (accepts email)
   */
  private async checkMXRecords(domain: string): Promise<{ hasMX: boolean; records: string[] }> {
    try {
      // Use Google DNS API (free, no auth required)
      const response = await fetch(
        `https://dns.google/resolve?name=${domain}&type=MX`,
        { signal: AbortSignal.timeout(3000) }
      );

      const data = await response.json();

      if (data.Answer && data.Answer.length > 0) {
        const records = data.Answer.map((a: any) => {
          // MX records format: "priority exchange"
          const parts = a.data.split(' ');
          return parts[1] || a.data;
        });
        return { hasMX: true, records };
      }

      return { hasMX: false, records: [] };
    } catch (error) {
      console.warn('MX record check failed:', error);
      // If check fails, assume domain might be valid (don't penalize)
      return { hasMX: false, records: [] };
    }
  }

  /**
   * Batch validate multiple emails
   */
  async validateBatch(emails: string[]): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();

    for (const email of emails) {
      const result = await this.validateEmail(email);
      results.set(email, result);

      // Rate limit: 100ms between checks
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Track pattern accuracy based on delivery/bounce data
   */
  async trackPatternAccuracy(
    companyId: string,
    email: string,
    delivered: boolean
  ): Promise<void> {
    const contact = await prisma.people.findFirst({
      where: { email, accountId: companyId }
    });

    if (!contact) {
      return;
    }

    // Get the pattern that was used
    const patterns = await prisma.email_patterns.findMany({
      where: { accountId: companyId }
    });

    for (const pattern of patterns) {
      // Update verification stats
      if (delivered) {
        await prisma.email_patterns.update({
          where: { id: pattern.id },
          data: {
            verifiedCount: { increment: 1 },
            lastVerifiedAt: new Date()
          }
        });

        await prisma.people.update({
          where: { id: contact.id },
          data: {
            updatedAt: new Date()
          }
        });
      } else {
        await prisma.email_patterns.update({
          where: { id: pattern.id },
          data: {
            bouncedCount: { increment: 1 }
          }
        });

        await prisma.people.update({
          where: { id: contact.id },
          data: {
            updatedAt: new Date()
          }
        });
      }
    }
  }
}
