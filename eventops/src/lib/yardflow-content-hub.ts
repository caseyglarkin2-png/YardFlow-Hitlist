import { logger } from '@/lib/logger';
import { cacheGet, cacheSet, generateCacheKey } from '@/lib/redis-cache';

/**
 * YardFlow Content Hub API Client
 * 
 * Integrates with https://flow-state-klbt.vercel.app/ to pull:
 * - ROI calculator data
 * - Case studies filtered by industry/company size
 * - Brand messaging per persona
 * - Visual assets for campaigns
 * - Social media templates
 * - Contract/proposal templates
 * 
 * Features Redis caching with 24hr TTL for all responses.
 */

const CONTENT_HUB_URL = process.env.YARDFLOW_CONTENT_HUB_URL || 'https://flow-state-klbt.vercel.app';
const API_KEY = process.env.YARDFLOW_CONTENT_HUB_API_KEY;

export interface RoiParams {
  facilityCount: number;
  operationalScale: 'small' | 'medium' | 'large';
  companySize: number;
  persona: string;
  industry: string;
}

export interface RoiData {
  annualSavings: number;
  paybackPeriod: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  breakdown?: {
    laborSavings: number;
    efficiencyGains: number;
    errorReduction: number;
  };
}

export interface CaseStudy {
  id: string;
  title: string;
  company: string;
  industry: string;
  companySize: string;
  challenge: string;
  solution: string;
  results: string[];
  metrics: {
    roiPercentage?: number;
    paybackMonths?: number;
    facilitiesDeployed?: number;
  };
}

export interface MessagingGuide {
  persona: string;
  valueProps: string[];
  painPoints: string[];
  objectionHandlers: Record<string, string>;
  emailTemplates: {
    subject: string;
    body: string;
  }[];
}

export interface GraphicAsset {
  id: string;
  type: string;
  url: string;
  title: string;
  description: string;
  tags: string[];
}

export interface SocialTemplate {
  platform: string;
  template: string;
  hashtags: string[];
  callToAction: string;
}

export interface ContractTemplate {
  dealType: string;
  templateUrl: string;
  sections: string[];
}

class YardFlowContentHubClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = CONTENT_HUB_URL, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey || API_KEY;
  }

  /**
   * Fetch ROI calculation from external calculator.
   * Falls back to local calculation if unavailable.
   * Cached for 24 hours.
   */
  async getRoiCalculation(params: RoiParams): Promise<RoiData | null> {
    const cacheKey = generateCacheKey('roi', params);
    
    // Check cache first
    const cached = await cacheGet<RoiData>(cacheKey);
    if (cached) {
      logger.info('ROI data from cache', { params });
      return cached;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/api/roi/calculate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(5000), // 5s timeout
      });

      if (!response.ok) {
        logger.warn('Content hub ROI API returned error', { 
          status: response.status,
          statusText: response.statusText 
        });
        return null;
      }

      const data = await response.json();
      logger.info('ROI data fetched from content hub', { 
        annualSavings: data.annualSavings 
      });
      
      // Cache the result
      await cacheSet(cacheKey, data, 86400); // 24 hours
      
      return data;
    } catch (error) {
      logger.error('Failed to fetch ROI from content hub', { error });
      return null;
    }
  }
 Cached for 24 hours.
   */
  async getCaseStudies(
    industry: string, 
    companySize?: string
  ): Promise<CaseStudy[]> {
    const cacheKey = generateCacheKey('case_studies', { industry, companySize });
    
    // Check cache first
    const cached = await cacheGet<CaseStudy[]>(cacheKey);
    if (cached) {
      logger.info('Case studies from cache', { industry, count: cached.length });
      return cached;
    }
    
    industry: string, 
    companySize?: string
  ): Promise<CaseStudy[]> {
    try {
      const params = new URLSearchParams({ industry });
      if (companySize) params.append('companySize', companySize);

      const response = await fetch(
        `${this.baseUrl}/api/case-studies?${params}`,
        {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(5000),
        }
      );

      if (!response.ok) {
        logger.warn('Content hub case studies API error', { 
          status: response.status 
      // Cache the result
      await cacheSet(cacheKey, data, 86400); // 24 hours
      
        });
        return [];
      }

      const data = await response.json();
      logger.info('Case studies fetched from content hub', { 
        count: data.length,
        industry 
      });
      
      return data;
    } catch (error) {
      logger.error('Failed to fetch case studies', { error, industry });
      return [];
    }
  }

  /**
   * Get brand messaging guidelines for a specific persona.
   */
  async getBrandMessaging(persona: string): Promise<MessagingGuide | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/messaging/${persona}`,
        {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(5000),
        }
      );

      if (!response.ok) {
        logger.warn('Content hub messaging API error', { 
          status: response.status,
          persona 
        });
        return null;
      }

      const data = await response.json();
      logger.info('Brand messaging fetched from content hub', { persona });
      
      return data;
    } catch (error) {
      logger.error('Failed to fetch brand messaging', { error, persona });
      return null;
    }
  }

  /**
   * Get visual assets for campaigns (booth materials, email headers, etc).
   */
  async getGraphics(
    assetType: string, 
    filters?: Record<string, string>
  ): Promise<GraphicAsset[]> {
    try {
      const params = new URLSearchParams({ type: assetType, ...filters });
      
      const response = await fetch(
        `${this.baseUrl}/api/graphics?${params}`,
        {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(5000),
        }
      );

      if (!response.ok) {
        logger.warn('Content hub graphics API error', { 
          status: response.status,
          assetType 
        });
        return [];
      }

      const data = await response.json();
      logger.info('Graphics fetched from content hub', { 
        count: data.length,
        assetType 
      });
      
      return data;
    } catch (error) {
      logger.error('Failed to fetch graphics', { error, assetType });
      return [];
    }
  }

  /**
   * Get social media templates for LinkedIn, Twitter, etc.
   */
  async getSocialTemplates(platform: string): Promise<SocialTemplate[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/social-templates?platform=${platform}`,
        {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(5000),
        }
      );

      if (!response.ok) {
        logger.warn('Content hub social templates API error', { 
          status: response.status,
          platform 
        });
        return [];
      }

      const data = await response.json();
      logger.info('Social templates fetched from content hub', { 
        count: data.length,
        platform 
      });
      
      return data;
    } catch (error) {
      logger.error('Failed to fetch social templates', { error, platform });
      return [];
    }
  }

  /**
   * Get contract/proposal templates for deal stages.
   */
  async getContractTemplates(dealType: string): Promise<ContractTemplate[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/contract-templates?dealType=${dealType}`,
        {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(5000),
        }
      );

      if (!response.ok) {
        logger.warn('Content hub contract templates API error', { 
          status: response.status,
          dealType 
        });
        return [];
      }

      const data = await response.json();
      logger.info('Contract templates fetched from content hub', { 
        count: data.length,
        dealType 
      });
      
      return data;
    } catch (error) {
      logger.error('Failed to fetch contract templates', { error, dealType });
      return [];
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }
}

// Singleton instance
export const contentHubClient = new YardFlowContentHubClient();
