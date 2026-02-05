import { logger } from '@/lib/logger';

/**
 * Centralized client for YardFlow Content Hub.
 *
 * Content Hub (flow-state-klbt.vercel.app) provides:
 * - Brand assets and graphics
 * - Messaging templates by persona
 * - Case studies
 * - Contract templates
 * - ROI calculator data
 *
 * All URLs are configurable via environment variables.
 */

const CONTENT_HUB_URL =
  process.env.YARDFLOW_CONTENT_HUB_URL || 'https://flow-state-klbt.vercel.app';
const CONTENT_HUB_API_KEY = process.env.YARDFLOW_CONTENT_HUB_API_KEY;

/**
 * Content Hub client with lazy fetching and error handling.
 */
export const contentHub = {
  /**
   * Base URL for Content Hub
   */
  baseUrl: CONTENT_HUB_URL,

  /**
   * API base URL
   */
  apiUrl: `${CONTENT_HUB_URL}/api`,

  /**
   * Get URL for a static asset
   */
  getAssetUrl(path: string): string {
    return `${CONTENT_HUB_URL}/api/assets/${path}`;
  },

  /**
   * Get URL for a contract template
   */
  getContractUrl(type: string): string {
    return `${CONTENT_HUB_URL}/api/contracts/${type}`;
  },

  /**
   * Get placeholder image URL (for stubs)
   */
  getPlaceholderImage(): string {
    return `${CONTENT_HUB_URL}/api/assets/placeholder.png`;
  },

  /**
   * Get placeholder PDF URL (for stubs)
   */
  getPlaceholderPdf(): string {
    return `${CONTENT_HUB_URL}/api/contracts/placeholder.pdf`;
  },

  /**
   * Fetch messaging templates for a persona
   */
  async fetchMessaging(persona: string): Promise<Record<string, unknown> | null> {
    try {
      const res = await fetch(`${CONTENT_HUB_URL}/api/messaging/${persona}`, {
        headers: CONTENT_HUB_API_KEY ? { 'x-api-key': CONTENT_HUB_API_KEY } : {},
        next: { revalidate: 3600 }, // Cache for 1 hour
      });

      if (!res.ok) {
        logger.warn('Content Hub messaging fetch failed', {
          persona,
          status: res.status,
        });
        return null;
      }

      return res.json();
    } catch (error) {
      logger.error('Content Hub messaging error', { persona, error: String(error) });
      return null;
    }
  },

  /**
   * Fetch case study by ID
   */
  async fetchCaseStudy(id: string): Promise<Record<string, unknown> | null> {
    try {
      const res = await fetch(`${CONTENT_HUB_URL}/api/case-studies/${id}`, {
        headers: CONTENT_HUB_API_KEY ? { 'x-api-key': CONTENT_HUB_API_KEY } : {},
        next: { revalidate: 3600 },
      });

      if (!res.ok) {
        logger.warn('Content Hub case study fetch failed', { id, status: res.status });
        return null;
      }

      return res.json();
    } catch (error) {
      logger.error('Content Hub case study error', { id, error: String(error) });
      return null;
    }
  },

  /**
   * Fetch ROI calculator data
   */
  async fetchRoiData(calculatorType: string): Promise<Record<string, unknown> | null> {
    try {
      const res = await fetch(`${CONTENT_HUB_URL}/api/roi/${calculatorType}`, {
        headers: CONTENT_HUB_API_KEY ? { 'x-api-key': CONTENT_HUB_API_KEY } : {},
        next: { revalidate: 3600 },
      });

      if (!res.ok) {
        logger.warn('Content Hub ROI fetch failed', { calculatorType, status: res.status });
        return null;
      }

      return res.json();
    } catch (error) {
      logger.error('Content Hub ROI error', { calculatorType, error: String(error) });
      return null;
    }
  },

  /**
   * Health check for Content Hub
   */
  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${CONTENT_HUB_URL}/api/health`, {
        next: { revalidate: 60 },
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};

// Export individual functions for tree-shaking
export const getAssetUrl = contentHub.getAssetUrl.bind(contentHub);
export const getContractUrl = contentHub.getContractUrl.bind(contentHub);
export const fetchMessaging = contentHub.fetchMessaging.bind(contentHub);
export const fetchCaseStudy = contentHub.fetchCaseStudy.bind(contentHub);
