/**
 * Email Pattern Detector
 * Detects email patterns from existing company emails and generates new emails
 */

import { prisma } from '@/lib/db';
import type { EmailPattern, PatternDetectionResult, EmailPatternType } from './types';

export class EmailPatternDetector {
  /**
   * Detect email patterns for a specific company
   */
  async detectPatternsForCompany(accountId: string): Promise<PatternDetectionResult> {
    // 1. Get all contacts with emails for this company
    const contacts = await prisma.people.findMany({
      where: { 
        accountId,
        email: { not: '' },
        name: { not: '' }
      },
      include: { target_accounts: true },
      orderBy: { createdAt: 'asc' }
    });

    if (contacts.length === 0) {
      return {
        domain: '',
        totalEmails: 0,
        detectedPatterns: [],
        primaryPattern: null,
        recommendation: 'No emails found. Need at least 1 email to detect pattern.'
      };
    }

    // 2. Extract domain from first email
    const domain = this.extractDomain(contacts[0].email!);

    // 3. Analyze each email to determine its pattern
    const patternCounts = new Map<EmailPatternType, number>();
    const patternExamples = new Map<EmailPatternType, string[]>();
    
    for (const contact of contacts) {
      const nameParts = contact.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || nameParts[0];
      
      const pattern = this.inferPattern(
        contact.email!,
        firstName,
        lastName
      );
      
      patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
      
      const examples = patternExamples.get(pattern) || [];
      if (examples.length < 3) {
        examples.push(contact.email!);
        patternExamples.set(pattern, examples);
      }
    }

    // 4. Calculate confidence scores for each pattern
    const detectedPatterns: Omit<EmailPattern, 'id' | 'verifiedCount' | 'bouncedCount' | 'lastDetectedAt'>[] = [];
    
    for (const [patternType, count] of patternCounts) {
      const confidence = (count / contacts.length) * 100;
      
      detectedPatterns.push({
        companyId: accountId,
        companyDomain: domain,
        patternType,
        confidence,
        sampleSize: count,
        examples: patternExamples.get(patternType) || []
      });
    }

    // 5. Sort by confidence (highest first)
    detectedPatterns.sort((a, b) => b.confidence - a.confidence);
    const primaryPattern = detectedPatterns[0] || null;

    // 6. Generate recommendation
    let recommendation: string;
    if (!primaryPattern) {
      recommendation = 'No pattern detected';
    } else if (primaryPattern.confidence >= 80) {
      recommendation = `Strong pattern detected: ${primaryPattern.patternType} (${primaryPattern.confidence.toFixed(0)}% confidence from ${primaryPattern.sampleSize} samples)`;
    } else if (primaryPattern.confidence >= 50) {
      recommendation = `Moderate pattern: ${primaryPattern.patternType} (${primaryPattern.confidence.toFixed(0)}% confidence). Consider manual verification.`;
    } else {
      recommendation = `Weak pattern: ${primaryPattern.patternType} (${primaryPattern.confidence.toFixed(0)}% confidence). Not recommended for auto-generation.`;
    }

    return {
      domain,
      totalEmails: contacts.length,
      detectedPatterns: detectedPatterns as any,
      primaryPattern: primaryPattern as any,
      recommendation
    };
  }

  /**
   * Infer pattern type from email and name
   */
  private inferPattern(email: string, firstName: string, lastName: string): EmailPatternType {
    const [localPart] = email.toLowerCase().split('@');
    const f = this.normalize(firstName);
    const l = this.normalize(lastName);

    // Check each pattern type
    if (localPart === `${f}.${l}`) return 'first.last';
    if (localPart === `${f}${l}`) return 'firstlast';
    if (localPart === f) return 'first';
    if (localPart === `${f[0]}.${l}`) return 'f.last';
    if (localPart === `${f[0]}${l}`) return 'flast';
    if (localPart === `${f}.${l[0]}`) return 'first.l';
    if (localPart === `${f}${l[0]}`) return 'firstl';
    if (localPart === `${l[0]}.${f}`) return 'l.first';
    if (localPart === `${l[0]}${f}`) return 'lfirst';
    if (localPart === `${f}_${l}`) return 'first_last';
    
    return 'custom';
  }

  /**
   * Normalize name for comparison (lowercase, remove special chars)
   */
  private normalize(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD') // Decompose accented characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9]/g, ''); // Remove non-alphanumeric
  }

  /**
   * Extract domain from email
   */
  private extractDomain(email: string): string {
    return email.split('@')[1].toLowerCase();
  }

  /**
   * Generate email using detected pattern
   */
  generateEmail(
    firstName: string,
    lastName: string,
    domain: string,
    patternType: EmailPatternType
  ): string {
    const f = this.normalize(firstName);
    const l = this.normalize(lastName);

    const patterns: Record<EmailPatternType, string> = {
      'first.last': `${f}.${l}@${domain}`,
      'firstlast': `${f}${l}@${domain}`,
      'first': `${f}@${domain}`,
      'f.last': `${f[0]}.${l}@${domain}`,
      'flast': `${f[0]}${l}@${domain}`,
      'first.l': `${f}.${l[0]}@${domain}`,
      'firstl': `${f}${l[0]}@${domain}`,
      'l.first': `${l[0]}.${f}@${domain}`,
      'lfirst': `${l[0]}${f}@${domain}`,
      'first_last': `${f}_${l}@${domain}`,
      'custom': `${f}.${l}@${domain}` // Default fallback
    };

    return patterns[patternType];
  }

  /**
   * Save detected patterns to database
   */
  async savePatternsToDatabase(
    companyId: string,
    patterns: Omit<EmailPattern, 'id' | 'verifiedCount' | 'bouncedCount' | 'lastDetectedAt'>[]
  ): Promise<void> {
    for (const pattern of patterns) {
      await prisma.email_patterns.upsert({
        where: {
          accountId_patternType: {
            accountId: pattern.companyId,
            patternType: pattern.patternType
          }
        },
        create: {
          accountId: pattern.companyId,
          companyDomain: pattern.companyDomain,
          patternType: pattern.patternType,
          confidence: pattern.confidence,
          sampleSize: pattern.sampleSize,
          examples: pattern.examples
        },
        update: {
          confidence: pattern.confidence,
          sampleSize: pattern.sampleSize,
          examples: pattern.examples,
          lastDetectedAt: new Date()
        }
      });
    }
  }
}
