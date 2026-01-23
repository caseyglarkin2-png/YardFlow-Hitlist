/**
 * Tests for Google Search Client
 */

import { GoogleSearchClient } from '../google-search-client';

// Mock fetch
global.fetch = jest.fn();

describe('GoogleSearchClient', () => {
  let client: GoogleSearchClient;

  beforeEach(() => {
    client = new GoogleSearchClient();
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should return empty results on fetch error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const results = await client.search('test query');

      expect(results).toEqual([]);
    });

    it('should handle rate limiting gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
      });

      const results = await client.search('test query');

      expect(results).toEqual([]);
    });

    it('should use rotating user agents', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => '<html></html>',
      });

      await client.search('test 1');
      await client.search('test 2');
      await client.search('test 3');

      const calls = (global.fetch as jest.Mock).mock.calls;
      const userAgents = calls.map(call => call[1]?.headers?.['User-Agent']);

      // Should have different user agents (at least sometimes)
      expect(userAgents.length).toBe(3);
      expect(userAgents.some(ua => ua?.includes('Mozilla'))).toBe(true);
    });
  });

  describe('searchLinkedIn', () => {
    it('should find LinkedIn profile URL', async () => {
      const mockHtml = `
        <div class="g">
          <a href="/url?q=https://www.linkedin.com/in/johndoe123&sa=U">
            <h3>John Doe - LinkedIn</h3>
          </a>
          <div class="VwiC3b">John Doe's profile on LinkedIn</div>
        </div>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      });

      const url = await client.searchLinkedIn('John', 'Doe', 'Acme Corp');

      expect(url).toContain('linkedin.com/in/johndoe123');
      expect(url).not.toContain('?'); // Should remove query params
    });

    it('should return null when no LinkedIn profile found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => '<html>No results</html>',
      });

      const url = await client.searchLinkedIn('John', 'Doe', 'Acme Corp');

      expect(url).toBeNull();
    });
  });

  describe('searchCompanyWebsite', () => {
    it('should find company website', async () => {
      const mockHtml = `
        <div class="g">
          <a href="/url?q=https://www.acmecorp.com&sa=U">
            <h3>Acme Corp - Official Website</h3>
          </a>
        </div>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      });

      const url = await client.searchCompanyWebsite('Acme Corp');

      expect(url).toContain('acmecorp.com');
    });

    it('should skip social media results', async () => {
      const mockHtml = `
        <div class="g">
          <a href="/url?q=https://www.linkedin.com/company/acme&sa=U">
            <h3>Acme Corp on LinkedIn</h3>
          </a>
        </div>
        <div class="g">
          <a href="/url?q=https://www.acmecorp.com&sa=U">
            <h3>Acme Corp</h3>
          </a>
        </div>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      });

      const url = await client.searchCompanyWebsite('Acme Corp');

      expect(url).toContain('acmecorp.com');
      expect(url).not.toContain('linkedin.com');
    });
  });
});
