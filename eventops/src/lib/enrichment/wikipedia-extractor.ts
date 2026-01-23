/**
 * Wikipedia Extractor
 * Extracts structured company data from Wikipedia
 */

export interface WikipediaCompanyData {
  title: string;
  extract: string;
  industry?: string;
  founded?: string;
  headquarters?: string;
  keyPeople?: string[];
  products?: string[];
  revenue?: string;
  employees?: string;
  website?: string;
  subsidiaries?: string[];
}

export class WikipediaExtractor {
  private apiUrl = 'https://en.wikipedia.org/w/api.php';

  /**
   * Search Wikipedia for company page
   */
  async searchCompany(companyName: string): Promise<string | null> {
    // Validate and sanitize company name
    if (!companyName || typeof companyName !== 'string') {
      return null;
    }

    const sanitizedName = companyName.trim();
    if (sanitizedName.length === 0 || sanitizedName.length > 200) {
      return null;
    }

    try {
      const params = new URLSearchParams({
        action: 'opensearch',
        search: companyName,
        limit: '5',
        format: 'json',
      });

      const response = await fetch(`${this.apiUrl}?${params}`, {
        headers: {
          'User-Agent': 'YardFlowBot/1.0',
        },
        signal: AbortSignal.timeout(5000),
      });

      const data = await response.json();

      // Returns [query, [titles], [descriptions], [urls]]
      if (data[1] && data[1].length > 0) {
        return data[1][0]; // First result title
      }

      return null;
    } catch (error) {
      console.error('Wikipedia search error:', error);
      return null;
    }
  }

  /**
   * Extract company data from Wikipedia
   */
  async extractCompanyData(companyName: string): Promise<WikipediaCompanyData | null> {
    // Validate input
    if (!companyName || typeof companyName !== 'string' || companyName.trim().length === 0) {
      return null;
    }

    try {
      // Search for company page
      const pageTitle = await this.searchCompany(companyName);
      if (!pageTitle) {
        return null;
      }

      // Fetch page content
      const params = new URLSearchParams({
        action: 'query',
        titles: pageTitle,
        prop: 'extracts|revisions',
        rvprop: 'content',
        exintro: 'true',
        explaintext: 'true',
        format: 'json',
      });

      const response = await fetch(`${this.apiUrl}?${params}`, {
        headers: {
          'User-Agent': 'YardFlowBot/1.0',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`Wikipedia API error: ${response.status}`);
      }

      let data;
      try {
        data = await response.json();
      } catch (error) {
        console.error('Wikipedia JSON parse error:', error);
        return null;
      }

      const pages = data.query?.pages;
      
      if (!pages || typeof pages !== 'object') {
        return null;
      }

      const pageValues = Object.values(pages);
      if (pageValues.length === 0) {
        return null;
      }

      const page = pageValues[0] as any;
      
      if (!page || page.missing || !page.title) {
        return null;
      }

      // Get infobox data if available
      const wikitext = page.revisions?.[0]?.['*'] || '';
      const infobox = this.parseInfobox(wikitext);

      return {
        title: page.title,
        extract: page.extract || '',
        industry: infobox.industry,
        founded: infobox.founded,
        headquarters: infobox.headquarters || infobox.hq_location,
        keyPeople: this.parseList(infobox.key_people),
        products: this.parseList(infobox.products),
        revenue: infobox.revenue,
        employees: infobox.num_employees || infobox.employees,
        website: infobox.website,
        subsidiaries: this.parseList(infobox.subsidiaries),
      };
    } catch (error) {
      console.error('Wikipedia extraction error:', error);
      return null;
    }
  }

  /**
   * Parse Wikipedia infobox data
   */
  private parseInfobox(wikitext: string): Record<string, string> {
    const infobox: Record<string, string> = {};

    // Extract infobox template
    const infoboxMatch = wikitext.match(/\{\{Infobox company(.*?)\}\}/is);
    if (!infoboxMatch) {
      return infobox;
    }

    const content = infoboxMatch[1];

    // Parse key-value pairs
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*\|\s*([^=]+?)\s*=\s*(.+)$/);
      if (match) {
        const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
        const value = this.cleanWikitext(match[2].trim());
        if (value) {
          infobox[key] = value;
        }
      }
    }

    return infobox;
  }

  /**
   * Clean Wikipedia markup
   */
  private cleanWikitext(text: string): string {
    return text
      // Remove refs
      .replace(/<ref[^>]*>.*?<\/ref>/gis, '')
      .replace(/<ref[^>]*\/>/gi, '')
      // Remove wikilinks markup but keep text
      .replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1')
      // Remove templates
      .replace(/\{\{[^}]+\}\}/g, '')
      // Remove bold/italic
      .replace(/'''?/g, '')
      // Remove HTML
      .replace(/<[^>]+>/g, '')
      // Clean up
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Parse list from wikitext
   */
  private parseList(text?: string): string[] | undefined {
    if (!text) return undefined;

    const items = text
      .split(/[,\n]/)
      .map(item => this.cleanWikitext(item))
      .filter(item => item.length > 0 && item.length < 100);

    return items.length > 0 ? items.slice(0, 10) : undefined;
  }

  /**
   * Get company summary (lightweight)
   */
  async getCompanySummary(companyName: string): Promise<string | null> {
    // Validate input
    if (!companyName || typeof companyName !== 'string' || companyName.trim().length === 0) {
      return null;
    }

    try {
      const pageTitle = await this.searchCompany(companyName);
      if (!pageTitle) {
        return null;
      }

      const params = new URLSearchParams({
        action: 'query',
        titles: pageTitle,
        prop: 'extracts',
        exintro: 'true',
        explaintext: 'true',
        exsentences: '3',
        format: 'json',
      });

      const response = await fetch(`${this.apiUrl}?${params}`, {
        headers: {
          'User-Agent': 'YardFlowBot/1.0',
        },
        signal: AbortSignal.timeout(5000),
      });

      const data = await response.json();
      const pages = data.query?.pages;
      const page = Object.values(pages || {})[0] as any;

      return page?.extract || null;
    } catch (error) {
      console.error('Wikipedia summary error:', error);
      return null;
    }
  }
}
