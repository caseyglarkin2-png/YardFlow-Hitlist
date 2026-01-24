/**
 * Pattern Applicator
 * Applies detected email patterns to contacts missing emails
 */

import { prisma } from '@/lib/db';
import { EmailPatternDetector } from './email-pattern-detector';
import type { ApplicationResult, BatchResult } from './types';

export class PatternApplicator {
  private detector = new EmailPatternDetector();

  /**
   * Enrich all contacts at a company with generated emails
   */
  async enrichCompanyContacts(
    companyId: string,
    options: {
      dryRun?: boolean;
      minConfidence?: number;
      force?: boolean;
    } = {}
  ): Promise<ApplicationResult> {
    const { dryRun = true, minConfidence = 70, force = false } = options;

    // 1. Get company info
    const company = await prisma.target_accounts.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return {
        success: false,
        companyId,
        companyName: 'Unknown',
        applied: 0,
        skipped: 0,
        error: 'Company not found'
      };
    }

    // 2. Detect pattern
    const patternResult = await this.detector.detectPatternsForCompany(companyId);

    if (!patternResult.primaryPattern || patternResult.primaryPattern.confidence < minConfidence) {
      return {
        success: false,
        companyId,
        companyName: company.name,
        applied: 0,
        skipped: 0,
        error: `Insufficient pattern confidence (${patternResult.primaryPattern?.confidence.toFixed(0) || 0}% < ${minConfidence}%)`
      };
    }

    // 3. Get contacts needing emails
    const contactsNeedingEmail = await prisma.people.findMany({
      where: {
        accountId: companyId,
        ...(force ? {} : { email: null }),
        name: { not: '' }
      },
      orderBy: { createdAt: 'asc' }
    });

    const applied: string[] = [];
    const skipped: string[] = [];
    const generatedEmails: string[] = [];

    // 4. Generate and apply emails
    for (const contact of contactsNeedingEmail) {
      const nameParts = contact.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || nameParts[0];
      
      const generatedEmail = this.detector.generateEmail(
        firstName,
        lastName,
        patternResult.domain,
        patternResult.primaryPattern.patternType
      );

      if (!generatedEmail) {
        skipped.push(contact.id);
        continue;
      }

      generatedEmails.push(generatedEmail);

      if (!dryRun) {
        await prisma.people.update({
          where: { id: contact.id },
          data: {
            email: generatedEmail,
            updatedAt: new Date()
          }
        });
      }

      applied.push(contact.id);
    }

    return {
      success: true,
      companyId,
      companyName: company.name,
      applied: applied.length,
      skipped: skipped.length,
      pattern: patternResult.primaryPattern.patternType,
      confidence: patternResult.primaryPattern.confidence,
      sampleEmails: generatedEmails.slice(0, 5)
    };
  }

  /**
   * Enrich all companies in batch
   */
  async enrichAllCompanies(options: {
    minConfidence?: number;
    limit?: number;
    dryRun?: boolean;
  } = {}): Promise<BatchResult> {
    const { minConfidence = 70, limit = 100, dryRun = true } = options;

    // Get companies that have emails to analyze
    const companiesWithEmails = await prisma.target_accounts.findMany({
      where: {
        people: {
          some: {
            email: { not: '' },
            name: { not: '' }
          }
        }
      },
      take: limit
    });

    const results: ApplicationResult[] = [];

    for (const company of companiesWithEmails) {
      const result = await this.enrichCompanyContacts(company.id, {
        dryRun,
        minConfidence
      });
      
      results.push(result);

      // Rate limiting: 1 company per second
      await this.sleep(1000);
    }

    return {
      total: results.length,
      successful: results.filter(r => r.success).length,
      totalApplied: results.reduce((sum, r) => sum + r.applied, 0),
      totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
      results
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
