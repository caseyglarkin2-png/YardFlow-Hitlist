/**
 * Company Enrichment Orchestrator
 * Coordinates multiple data sources to enrich company profiles
 */

import { prisma } from '@/lib/db';
import { WebsiteScraper } from './website-scraper';
import { WikipediaExtractor } from './wikipedia-extractor';
import { GoogleSearchClient } from './google-search-client';

export interface EnrichmentResult {
  accountId: string;
  companyName: string;
  success: boolean;
  dataPoints: number;
  sources: string[];
  data: {
    website?: string;
    industry?: string;
    headquarters?: string;
    employeeCount?: string;
    foundedYear?: number;
    description?: string;
    aboutText?: string;
    keyProducts?: string[];
    socialLinks?: {
      linkedin?: string;
      twitter?: string;
      facebook?: string;
    };
    wikipediaSummary?: string;
  };
  error?: string;
}

export class CompanyEnrichmentOrchestrator {
  private websiteScraper = new WebsiteScraper();
  private wikiExtractor = new WikipediaExtractor();
  private searchClient = new GoogleSearchClient();

  /**
   * Enrich a single company from all available sources
   */
  async enrichCompany(accountId: string): Promise<EnrichmentResult> {
    try {
      // Get company from database
      const company = await prisma.target_accounts.findUnique({
        where: { id: accountId },
      });

      if (!company) {
        return {
          accountId,
          companyName: 'Unknown',
          success: false,
          dataPoints: 0,
          sources: [],
          data: {},
          error: 'Company not found',
        };
      }

      const sources: string[] = [];
      const data: EnrichmentResult['data'] = {};

      // 1. Get website if not already known
      let website = company.website;
      if (!website) {
        website = await this.searchClient.searchCompanyWebsite(company.name);
        if (website) {
          data.website = website;
          sources.push('google_search');
        }
      } else {
        data.website = website;
      }

      // 2. Scrape company website
      if (website) {
        try {
          const webData = await this.websiteScraper.scrapeCompanyWebsite(company.name, website);
          
          if (webData.description) {
            data.description = webData.description;
          }
          if (webData.about) {
            data.aboutText = webData.about;
          }
          if (webData.industry) {
            data.industry = webData.industry;
          }
          if (webData.headquarters) {
            data.headquarters = webData.headquarters;
          }
          if (webData.employeeCount) {
            data.employeeCount = webData.employeeCount;
          }
          if (webData.foundedYear) {
            data.foundedYear = webData.foundedYear;
          }
          if (webData.keyProducts && webData.keyProducts.length > 0) {
            data.keyProducts = webData.keyProducts;
          }
          if (webData.socialLinks) {
            data.socialLinks = webData.socialLinks;
          }

          sources.push('website_scraping');
        } catch (error: any) {
          console.warn(`Website scraping failed for ${company.name}:`, error.message);
        }
      }

      // 3. Get Wikipedia data
      try {
        const wikiData = await this.wikiExtractor.extractCompanyData(company.name);
        
        if (wikiData) {
          // Fill in missing data from Wikipedia
          if (!data.industry && wikiData.industry) {
            data.industry = wikiData.industry;
          }
          if (!data.headquarters && wikiData.headquarters) {
            data.headquarters = wikiData.headquarters;
          }
          if (!data.employeeCount && wikiData.employees) {
            data.employeeCount = wikiData.employees;
          }
          if (!data.foundedYear && wikiData.founded) {
            const year = parseInt(wikiData.founded);
            if (!isNaN(year)) {
              data.foundedYear = year;
            }
          }
          if (!data.keyProducts && wikiData.products) {
            data.keyProducts = wikiData.products;
          }
          if (wikiData.extract) {
            data.wikipediaSummary = wikiData.extract;
          }

          sources.push('wikipedia');
        }
      } catch (error: any) {
        console.warn(`Wikipedia extraction failed for ${company.name}:`, error.message);
      }

      // Count data points collected
      const dataPoints = Object.keys(data).filter(key => {
        const value = data[key as keyof typeof data];
        return value !== undefined && value !== null && 
               (typeof value !== 'object' || Object.keys(value).length > 0);
      }).length;

      return {
        accountId,
        companyName: company.name,
        success: dataPoints > 0,
        dataPoints,
        sources,
        data,
      };
    } catch (error: any) {
      console.error(`Company enrichment error for ${accountId}:`, error);
      return {
        accountId,
        companyName: 'Unknown',
        success: false,
        dataPoints: 0,
        sources: [],
        data: {},
        error: error.message,
      };
    }
  }

  /**
   * Save enrichment results to database
   */
  async saveEnrichmentData(accountId: string, data: EnrichmentResult['data']): Promise<void> {
    // Update target_accounts table
    const updateData: any = {};
    
    if (data.website) updateData.website = data.website;
    if (data.industry) updateData.industry = data.industry;
    if (data.headquarters) updateData.headquarters = data.headquarters;

    if (Object.keys(updateData).length > 0) {
      await prisma.target_accounts.update({
        where: { id: accountId },
        data: updateData,
      });
    }

    // Update or create company_dossiers with enriched data
    const dossierData: any = {};
    
    if (data.description || data.wikipediaSummary) {
      dossierData.companyOverview = data.description || data.wikipediaSummary;
    }
    if (data.aboutText) {
      dossierData.companyOverview = data.aboutText;
    }
    if (data.industry) {
      dossierData.industryContext = data.industry;
    }
    if (data.socialLinks && typeof data.socialLinks === 'object') {
      try {
        dossierData.socialPresence = JSON.stringify(data.socialLinks);
      } catch (error) {
        console.error('Failed to stringify social links:', error);
      }
    }

    // Add structured data to rawData field
    try {
      dossierData.rawData = JSON.stringify({
      employeeCount: data.employeeCount,
      foundedYear: data.foundedYear,
      keyProducts: data.keyProducts,
      socialLinks: data.socialLinks,
      sources: ['web_scraping', 'wikipedia'],
      scrapedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to stringify raw data:', error);
      dossierData.rawData = '{"error": "Failed to serialize data"}';
    }

    if (Object.keys(dossierData).length > 0) {
      await prisma.company_dossiers.upsert({
        where: { accountId },
        create: {
          id: `dossier-${accountId}`,
          accountId,
          ...dossierData,
          researchedAt: new Date(),
          researchedBy: 'web_scraping',
        },
        update: {
          ...dossierData,
          researchedAt: new Date(),
        },
      });
    }
  }

  /**
   * Batch enrich multiple companies
   */
  async enrichBatch(
    accountIds: string[],
    options: { dryRun?: boolean; delay?: number } = {}
  ): Promise<EnrichmentResult[]> {
    const { dryRun = true, delay = 1000 } = options;
    const results: EnrichmentResult[] = [];

    for (const accountId of accountIds) {
      try {
        const result = await this.enrichCompany(accountId);
        results.push(result);

        // Save to database if not dry run and successful
        if (!dryRun && result.success) {
          try {
            await this.saveEnrichmentData(accountId, result.data);
          } catch (saveError: any) {
            console.error(`Failed to save enrichment for ${accountId}:`, saveError);
            result.error = `Enriched but save failed: ${saveError.message}`;
            result.success = false;
          }
        }
      } catch (error: any) {
        console.error(`Critical error enriching ${accountId}:`, error);
        results.push({
          accountId,
          companyName: 'Unknown',
          success: false,
          dataPoints: 0,
          sources: [],
          data: {},
          error: `Critical error: ${error.message}`,
        });
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    return results;
  }

  /**
   * Enrich all companies missing data
   */
  async enrichAll(options: { limit?: number; dryRun?: boolean } = {}): Promise<{
    total: number;
    successful: number;
    totalDataPoints: number;
    results: EnrichmentResult[];
  }> {
    const { limit = 50, dryRun = true } = options;

    // Get companies missing enrichment data
    const companies = await prisma.target_accounts.findMany({
      where: {
        OR: [
          { industry: null },
          { headquarters: null },
          { website: null },
        ],
      },
      take: limit,
    });

    const accountIds = companies.map(c => c.id);
    const results = await this.enrichBatch(accountIds, { dryRun, delay: 2000 });

    return {
      total: results.length,
      successful: results.filter(r => r.success).length,
      totalDataPoints: results.reduce((sum, r) => sum + r.dataPoints, 0),
      results,
    };
  }
}
