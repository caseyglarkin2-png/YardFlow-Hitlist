/**
 * Tests for Website Scraper
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebsiteScraper } from '../website-scraper';

global.fetch = vi.fn();

describe('WebsiteScraper', () => {
  let scraper: WebsiteScraper;

  beforeEach(() => {
    scraper = new WebsiteScraper();
    vi.clearAllMocks();
  });

  describe('URL Validation', () => {
    it('should reject file:// protocol', async () => {
      await expect(scraper.scrapeCompanyWebsite('Test', 'file:///etc/passwd')).rejects.toThrow(
        'Invalid protocol'
      );
    });

    it('should reject localhost', async () => {
      await expect(scraper.scrapeCompanyWebsite('Test', 'http://localhost:3000')).rejects.toThrow(
        'internal URLs'
      );
    });

    it('should reject 127.0.0.1', async () => {
      await expect(scraper.scrapeCompanyWebsite('Test', 'http://127.0.0.1')).rejects.toThrow(
        'internal URLs'
      );
    });

    it('should reject private IP 192.168.x.x', async () => {
      await expect(scraper.scrapeCompanyWebsite('Test', 'http://192.168.1.1')).rejects.toThrow(
        'private IP'
      );
    });

    it('should accept valid https URL', async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        text: async () =>
          '<html><head><meta name="description" content="Test company"/></head></html>',
      });

      const result = await scraper.scrapeCompanyWebsite('Test', 'https://example.com');
      expect(result.domain).toBe('https://example.com');
    });
  });

  describe('HTML Parsing', () => {
    it('should extract meta description', async () => {
      const html =
        '<html><head><meta name="description" content="A great company" /></head></html>';
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        text: async () => html,
      });

      const result = await scraper.scrapeCompanyWebsite('Test', 'https://example.com');
      expect(result.description).toBe('A great company');
    });

    it('should handle malformed HTML gracefully', async () => {
      const html = '<html><head><meta name="description" content="Unclosed tag';
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        text: async () => html,
      });

      const result = await scraper.scrapeCompanyWebsite('Test', 'https://example.com');
      expect(result).toBeDefined();
    });

    it('should extract founded year correctly', async () => {
      const html = '<p>Founded in 2005</p>';
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        text: async () => html,
      });

      const result = await scraper.scrapeCompanyWebsite('Test', 'https://example.com');
      expect(result.foundedYear).toBe(2005);
    });

    it('should reject invalid founded years', async () => {
      const html = '<p>Founded in 1700</p>'; // Too old
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        text: async () => html,
      });

      const result = await scraper.scrapeCompanyWebsite('Test', 'https://example.com');
      expect(result.foundedYear).toBeUndefined();
    });

    it('should extract email addresses', async () => {
      const html = '<p>Contact: hello@example.com</p>';
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        text: async () => html,
      });

      const result = await scraper.scrapeCompanyWebsite('Test', 'https://example.com');
      expect(result.contactInfo?.email).toBe('hello@example.com');
    });

    it('should skip example emails', async () => {
      const html = '<p>Contact: email@example.com</p>';
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        text: async () => html,
      });

      const result = await scraper.scrapeCompanyWebsite('Test', 'https://example.com');
      expect(result.contactInfo?.email).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch timeout', async () => {
      (global.fetch as vi.Mock).mockRejectedValue(new Error('Timeout'));

      await expect(
        scraper.scrapeCompanyWebsite('Test', 'https://slow-website.com')
      ).rejects.toThrow();
    });

    it('should handle HTTP errors', async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(scraper.scrapeCompanyWebsite('Test', 'https://example.com')).rejects.toThrow(
        'HTTP 404'
      );
    });
  });
});
