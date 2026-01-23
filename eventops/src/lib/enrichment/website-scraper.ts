/**
 * Website Scraper
 * Extracts company information from corporate websites
 */

import { GoogleSearchClient } from './google-search-client';

export interface CompanyWebData {
  domain: string;
  about?: string;
  industry?: string;
  foundedYear?: number;
  headquarters?: string;
  employeeCount?: string;
  description?: string;
  keyProducts?: string[];
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
}

export class WebsiteScraper {
  private searchClient = new GoogleSearchClient();

  /**
   * Scrape company website for data
   */
  async scrapeCompanyWebsite(companyName: string, website?: string): Promise<CompanyWebData> {
    try {
      // If no website provided, search for it
      let domain = website;
      if (!domain) {
        const foundWebsite = await this.searchClient.searchCompanyWebsite(companyName);
        if (!foundWebsite) {
          throw new Error('Website not found');
        }
        domain = foundWebsite;
      }

      // Fetch website HTML
      const html = await this.fetchWebsite(domain);

      // Extract structured data
      const data: CompanyWebData = {
        domain,
        about: this.extractAbout(html),
        description: this.extractMetaDescription(html),
        industry: this.extractIndustry(html),
        headquarters: this.extractHeadquarters(html),
        employeeCount: this.extractEmployeeCount(html),
        foundedYear: this.extractFoundedYear(html),
        keyProducts: this.extractKeyProducts(html),
        contactInfo: this.extractContactInfo(html),
        socialLinks: this.extractSocialLinks(html),
      };

      return data;
    } catch (error: any) {
      console.error(`Website scraping error for ${companyName}:`, error);
      throw error;
    }
  }

  /**
   * Fetch website HTML
   */
  private async fetchWebsite(url: string): Promise<string> {
    // Ensure URL has protocol
    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }

    // Validate URL to prevent SSRF
    try {
      const parsedUrl = new URL(url);
      
      // Only allow http/https protocols
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }

      // Block internal/private IPs
      const hostname = parsedUrl.hostname.toLowerCase();
      const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254'];
      if (blockedHosts.some(blocked => hostname.includes(blocked))) {
        throw new Error('Cannot fetch internal URLs');
      }

      // Block private IP ranges (basic check)
      if (hostname.match(/^(10|172\.(1[6-9]|2[0-9]|3[01])|192\.168)\./)) {
        throw new Error('Cannot fetch private IP addresses');
      }
    } catch (error: any) {
      throw new Error(`Invalid URL: ${error.message}`);
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  }

  /**
   * Extract meta description
   */
  private extractMetaDescription(html: string): string | undefined {
    const match = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    return match ? this.cleanText(match[1]) : undefined;
  }

  /**
   * Extract about section
   */
  private extractAbout(html: string): string | undefined {
    // Look for common "About" section patterns
    const patterns = [
      /<section[^>]*about[^>]*>(.*?)<\/section>/is,
      /<div[^>]*about[^>]*>(.*?)<\/div>/is,
      /<h[1-3][^>]*>about[^<]*<\/h[1-3]>\s*<p>(.*?)<\/p>/is,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const text = this.stripHtml(match[1]);
        if (text.length > 50 && text.length < 2000) {
          return this.cleanText(text);
        }
      }
    }

    return undefined;
  }

  /**
   * Extract industry/sector
   */
  private extractIndustry(html: string): string | undefined {
    const patterns = [
      /industry[:\s]+([^<\n]+)/i,
      /sector[:\s]+([^<\n]+)/i,
      /market[:\s]+([^<\n]+)/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const industry = this.cleanText(match[1]);
        if (industry.length > 3 && industry.length < 100) {
          return industry;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract headquarters location
   */
  private extractHeadquarters(html: string): string | undefined {
    const patterns = [
      /headquarters[:\s]+([^<\n]+)/i,
      /head office[:\s]+([^<\n]+)/i,
      /based in[:\s]+([^<\n]+)/i,
      /located in[:\s]+([^<\n]+)/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const location = this.cleanText(match[1]);
        if (location.length > 3 && location.length < 100) {
          return location;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract employee count
   */
  private extractEmployeeCount(html: string): string | undefined {
    const patterns = [
      /(\d+[\+]?)\s*employees/i,
      /team of\s*(\d+[\+]?)/i,
      /(\d+[\+]?)\s*team members/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Extract founded year
   */
  private extractFoundedYear(html: string): number | undefined {
    const patterns = [
      /founded in\s*(\d{4})/i,
      /established in\s*(\d{4})/i,
      /since\s*(\d{4})/i,
      /©\s*(\d{4})/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const year = parseInt(match[1], 10);
        if (year >= 1800 && year <= new Date().getFullYear()) {
          return year;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract key products/services
   */
  private extractKeyProducts(html: string): string[] {
    const products: string[] = [];

    // Look for product/service lists
    const listMatch = html.match(/<ul[^>]*products[^>]*>(.*?)<\/ul>/is) || 
                      html.match(/<ul[^>]*services[^>]*>(.*?)<\/ul>/is);

    if (listMatch) {
      const items = listMatch[1].match(/<li[^>]*>(.*?)<\/li>/gis);
      if (items) {
        for (const item of items.slice(0, 5)) {
          const text = this.cleanText(this.stripHtml(item));
          if (text.length > 3 && text.length < 100) {
            products.push(text);
          }
        }
      }
    }

    return products;
  }

  /**
   * Extract contact information
   */
  private extractContactInfo(html: string): CompanyWebData['contactInfo'] {
    const contactInfo: CompanyWebData['contactInfo'] = {};

    // Email
    const emailMatch = html.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch && !emailMatch[1].includes('example')) {
      contactInfo.email = emailMatch[1];
    }

    // Phone (US format)
    const phoneMatch = html.match(/(?:\+?1[-.\s]?)?\(?([2-9]\d{2})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/);
    if (phoneMatch) {
      contactInfo.phone = `${phoneMatch[1]}-${phoneMatch[2]}-${phoneMatch[3]}`;
    }

    return Object.keys(contactInfo).length > 0 ? contactInfo : undefined;
  }

  /**
   * Extract social media links
   */
  private extractSocialLinks(html: string): CompanyWebData['socialLinks'] {
    const socialLinks: CompanyWebData['socialLinks'] = {};

    // LinkedIn
    const linkedinMatch = html.match(/linkedin\.com\/company\/([^"'\s<]+)/i);
    if (linkedinMatch) {
      socialLinks.linkedin = `https://www.linkedin.com/company/${linkedinMatch[1]}`;
    }

    // Twitter
    const twitterMatch = html.match(/(?:twitter\.com|x\.com)\/([^"'\s<]+)/i);
    if (twitterMatch) {
      socialLinks.twitter = `https://twitter.com/${twitterMatch[1]}`;
    }

    // Facebook
    const facebookMatch = html.match(/facebook\.com\/([^"'\s<]+)/i);
    if (facebookMatch) {
      socialLinks.facebook = `https://www.facebook.com/${facebookMatch[1]}`;
    }

    return Object.keys(socialLinks).length > 0 ? socialLinks : undefined;
  }

  /**
   * Strip HTML tags
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Clean and normalize text
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '')
      .trim();
  }
}
