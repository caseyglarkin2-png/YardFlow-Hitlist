/**
 * Google Search Client
 * Performs Google searches without API key using web scraping
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export class GoogleSearchClient {
  private baseUrl = 'https://www.google.com/search';
  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];

  /**
   * Search Google for a query
   */
  async search(query: string, options: { maxResults?: number; delay?: number } = {}): Promise<SearchResult[]> {
    const { maxResults = 10, delay = 2000 } = options;

    try {
      // Rotate user agent to avoid detection
      const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];

      const searchUrl = `${this.baseUrl}?q=${encodeURIComponent(query)}&num=${maxResults}`;

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`Google search failed: ${response.status}`);
      }

      const html = await response.text();
      const results = this.parseGoogleResults(html);

      // Rate limiting delay
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      return results.slice(0, maxResults);
    } catch (error: any) {
      console.error('Google search error:', error);
      
      // If blocked, return empty results rather than failing
      if (error.message?.includes('429') || error.message?.includes('captcha')) {
        console.warn('Google rate limit or captcha detected');
      }
      
      return [];
    }
  }

  /**
   * Parse Google search results HTML
   */
  private parseGoogleResults(html: string): SearchResult[] {
    const results: SearchResult[] = [];

    // Simple regex-based parsing (works for basic cases)
    // Note: Google HTML structure changes frequently, so this is a basic implementation
    
    // Match result blocks
    const resultRegex = /<div class="[^"]*g[^"]*"[^>]*>(.*?)<\/div>/gis;
    const matches = html.matchAll(resultRegex);

    for (const match of matches) {
      const block = match[1];

      // Extract title and URL from <a> tag
      const linkMatch = block.match(/<a href="\/url\?q=([^"&]+)[^>]*>.*?<h3[^>]*>(.*?)<\/h3>/is);
      
      if (linkMatch) {
        const url = decodeURIComponent(linkMatch[1]);
        const title = this.stripHtml(linkMatch[2]);

        // Extract snippet
        const snippetMatch = block.match(/<div class="[^"]*VwiC3b[^"]*"[^>]*>(.*?)<\/div>/is);
        const snippet = snippetMatch ? this.stripHtml(snippetMatch[1]) : '';

        // Filter out Google's own pages
        if (!url.includes('google.com') && !url.includes('youtube.com')) {
          results.push({
            title,
            url,
            snippet,
          });
        }
      }
    }

    return results;
  }

  /**
   * Strip HTML tags from text
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Search for LinkedIn profile
   */
  async searchLinkedIn(firstName: string, lastName: string, company: string): Promise<string | null> {
    const query = `${firstName} ${lastName} ${company} site:linkedin.com/in`;
    const results = await this.search(query, { maxResults: 3, delay: 2000 });

    // Find first LinkedIn /in/ URL
    for (const result of results) {
      if (result.url.includes('linkedin.com/in/')) {
        // Clean up URL (remove tracking params)
        const cleanUrl = result.url.split('?')[0];
        return cleanUrl;
      }
    }

    return null;
  }

  /**
   * Search for company website
   */
  async searchCompanyWebsite(companyName: string): Promise<string | null> {
    const query = `${companyName} official website`;
    const results = await this.search(query, { maxResults: 5, delay: 2000 });

    // Return first non-social media result
    for (const result of results) {
      const url = result.url.toLowerCase();
      
      // Skip social media and directories
      if (
        !url.includes('linkedin.com') &&
        !url.includes('facebook.com') &&
        !url.includes('twitter.com') &&
        !url.includes('instagram.com') &&
        !url.includes('yelp.com') &&
        !url.includes('yellowpages.com')
      ) {
        return result.url;
      }
    }

    return null;
  }
}
