/**
 * Tests for Wikipedia Extractor
 */

import { WikipediaExtractor } from '../wikipedia-extractor';

global.fetch = jest.fn();

describe('WikipediaExtractor', () => {
  let extractor: WikipediaExtractor;

  beforeEach(() => {
    extractor = new WikipediaExtractor();
    jest.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should reject empty company name', async () => {
      const result = await extractor.searchCompany('');
      expect(result).toBeNull();
    });

    it('should reject very long company names', async () => {
      const longName = 'A'.repeat(300);
      const result = await extractor.searchCompany(longName);
      expect(result).toBeNull();
    });

    it('should handle null input', async () => {
      const result = await extractor.searchCompany(null as any);
      expect(result).toBeNull();
    });
  });

  describe('searchCompany', () => {
    it('should return first search result', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ['query', ['Apple Inc.', 'Apple Store'], [], []],
      });

      const result = await extractor.searchCompany('Apple');
      expect(result).toBe('Apple Inc.');
    });

    it('should return null when no results found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ['query', [], [], []],
      });

      const result = await extractor.searchCompany('NonexistentCompany12345');
      expect(result).toBeNull();
    });

    it('should handle JSON parse errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await extractor.searchCompany('Test');
      expect(result).toBeNull();
    });

    it('should handle HTTP errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await extractor.searchCompany('Test');
      expect(result).toBeNull();
    });
  });

  describe('extractCompanyData', () => {
    it('should extract infobox data', async () => {
      // Mock search
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ['query', ['Acme Corp'], [], []],
      });

      // Mock page data
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: {
            pages: {
              '12345': {
                title: 'Acme Corp',
                extract: 'Acme Corporation is a tech company.',
                revisions: [{
                  '*': '{{Infobox company\n| industry = Technology\n| founded = 2000\n| headquarters = San Francisco\n}}'
                }]
              }
            }
          }
        }),
      });

      const result = await extractor.extractCompanyData('Acme Corp');

      expect(result).toBeDefined();
      expect(result?.title).toBe('Acme Corp');
      expect(result?.industry).toBe('Technology');
      expect(result?.founded).toBe('2000');
    });

    it('should handle missing pages', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ['query', ['Test'], [], []],
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: {
            pages: {
              '-1': { missing: true }
            }
          }
        }),
      });

      const result = await extractor.extractCompanyData('Test');
      expect(result).toBeNull();
    });

    it('should handle malformed API response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ['query', ['Test'], [], []],
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // Missing query.pages
      });

      const result = await extractor.extractCompanyData('Test');
      expect(result).toBeNull();
    });
  });
});
