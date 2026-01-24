/**
 * LinkedIn Profile Extractor
 * Discovers LinkedIn profiles via Google search
 */

import { prisma } from '@/lib/db';
import { GoogleSearchClient } from './google-search-client';

export interface LinkedInDiscoveryResult {
  personId: string;
  personName: string;
  profileUrl: string | null;
  confidence: number;
  foundVia: string;
  error?: string;
}

export interface BatchLinkedInResult {
  total: number;
  found: number;
  notFound: number;
  results: LinkedInDiscoveryResult[];
}

export class LinkedInExtractor {
  private searchClient = new GoogleSearchClient();

  /**
   * Discover LinkedIn profile for a single person
   */
  async discoverProfile(personId: string): Promise<LinkedInDiscoveryResult> {
    try {
      // Get person details
      const person = await prisma.people.findUnique({
        where: { id: personId },
        include: { target_accounts: true },
      });

      if (!person) {
        return {
          personId,
          personName: 'Unknown',
          profileUrl: null,
          confidence: 0,
          foundVia: 'error',
          error: 'Person not found',
        };
      }

      // Parse name
      const nameParts = person.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || nameParts[0];
      const companyName = person.target_accounts.name;

      // Search Google for LinkedIn profile
      const profileUrl = await this.searchClient.searchLinkedIn(firstName, lastName, companyName);

      if (!profileUrl) {
        return {
          personId,
          personName: person.name,
          profileUrl: null,
          confidence: 0,
          foundVia: 'google_search',
          error: 'Profile not found',
        };
      }

      // Calculate confidence based on URL match quality
      const confidence = this.calculateConfidence(profileUrl, firstName, lastName);

      return {
        personId,
        personName: person.name,
        profileUrl,
        confidence,
        foundVia: 'google_search',
      };
    } catch (error: any) {
      console.error(`LinkedIn discovery error for ${personId}:`, error);
      return {
        personId,
        personName: 'Unknown',
        profileUrl: null,
        confidence: 0,
        foundVia: 'error',
        error: error.message,
      };
    }
  }

  /**
   * Calculate confidence score based on name match in LinkedIn URL
   */
  private calculateConfidence(profileUrl: string, firstName: string, lastName: string): number {
    const urlLower = profileUrl.toLowerCase();
    const firstNameLower = firstName.toLowerCase().replace(/[^a-z]/g, '');
    const lastNameLower = lastName.toLowerCase().replace(/[^a-z]/g, '');

    let confidence = 50; // Base confidence

    // Check if URL contains first name
    if (urlLower.includes(firstNameLower)) {
      confidence += 25;
    }

    // Check if URL contains last name
    if (urlLower.includes(lastNameLower)) {
      confidence += 25;
    }

    return Math.min(confidence, 95); // Max 95% (never 100% without verification)
  }

  /**
   * Save LinkedIn profile to database
   */
  async saveProfile(personId: string, profileUrl: string, confidence: number): Promise<void> {
    await prisma.linkedin_profiles.upsert({
      where: { personId },
      create: {
        personId,
        profileUrl,
        confidence,
        foundVia: 'google_search',
      },
      update: {
        profileUrl,
        confidence,
        updatedAt: new Date(),
      },
    });

    // Also update the people.linkedin field
    await prisma.people.update({
      where: { id: personId },
      data: { linkedin: profileUrl },
    });
  }

  /**
   * Batch discover LinkedIn profiles for all people at a company
   */
  async enrichCompanyContacts(
    accountId: string,
    options: { dryRun?: boolean; limit?: number } = {}
  ): Promise<BatchLinkedInResult> {
    const { dryRun = true, limit = 50 } = options;

    // Get people needing LinkedIn profiles
    const people = await prisma.people.findMany({
      where: {
        accountId,
        linkedin: null,
        name: { not: '' }
      },
      include: { target_accounts: true },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    const results: LinkedInDiscoveryResult[] = [];

    for (const person of people) {
      const result = await this.discoverProfile(person.id);
      results.push(result);

      // Save to database if found and not dry run
      if (!dryRun && result.profileUrl && result.confidence >= 50) {
        await this.saveProfile(person.id, result.profileUrl, result.confidence);
      }

      // Rate limiting: 2 seconds between searches
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return {
      total: results.length,
      found: results.filter(r => r.profileUrl !== null).length,
      notFound: results.filter(r => r.profileUrl === null).length,
      results,
    };
  }

  /**
   * Batch enrich all companies
   */
  async enrichAllCompanies(options: {
    limit?: number;
    peoplePerCompany?: number;
    dryRun?: boolean;
  } = {}): Promise<{ totalCompanies: number; totalPeople: number; totalFound: number }> {
    const { limit = 10, peoplePerCompany = 10, dryRun = true } = options;

    // Get companies with people needing LinkedIn
    const companies = await prisma.target_accounts.findMany({
      where: {
        people: {
          some: {
            linkedin: null,
            name: { not: '' }
          },
        },
      },
      take: limit,
    });

    let totalPeople = 0;
    let totalFound = 0;

    for (const company of companies) {
      console.log(`Enriching LinkedIn for ${company.name}...`);

      const result = await this.enrichCompanyContacts(company.id, {
        dryRun,
        limit: peoplePerCompany,
      });

      totalPeople += result.total;
      totalFound += result.found;

      // Delay between companies
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    return {
      totalCompanies: companies.length,
      totalPeople,
      totalFound,
    };
  }
}
