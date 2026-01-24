import { calculateRoi, type RoiInput, type RoiResult } from '@/lib/roi-calculator';
import { contentHubClient, type RoiParams, type RoiData } from '@/lib/yardflow-content-hub';
import { logger } from '@/lib/logger';

/**
 * Unified ROI calculator that tries external content hub first,
 * then falls back to local calculation.
 * 
 * Implements hybrid approach:
 * 1. Try YardFlow content hub API (flow-state-klbt.vercel.app)
 * 2. Fall back to local calculation (src/lib/roi-calculator.ts)
 * 3. Cache results in memory (future: Redis)
 */

interface UnifiedRoiInput extends RoiInput {
  // RoiInput from local calculator includes all needed fields
}

interface UnifiedRoiResult extends RoiResult {
  source: 'content_hub' | 'local_calculation';
  timestamp: string;
}

// Simple in-memory cache (future: move to Redis)
const roiCache = new Map<string, { result: UnifiedRoiResult; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Calculate ROI with hybrid approach: external API → local fallback.
 */
export async function calculateRoiUnified(
  input: UnifiedRoiInput
): Promise<UnifiedRoiResult> {
  // Generate cache key
  const cacheKey = JSON.stringify(input);
  
  // Check cache first
  const cached = roiCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    logger.info('ROI cache hit', { source: cached.result.source });
    return cached.result;
  }

  // Try external content hub first
  const externalRoi = await tryExternalRoi(input);
  if (externalRoi) {
    const result: UnifiedRoiResult = {
      ...externalRoi,
      source: 'content_hub',
      timestamp: new Date().toISOString(),
    };
    
    // Cache the result
    roiCache.set(cacheKey, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    
    return result;
  }

  // Fall back to local calculation
  logger.info('Using local ROI calculation as fallback');
  const localRoi = calculateRoi(input);
  const result: UnifiedRoiResult = {
    ...localRoi,
    source: 'local_calculation',
    timestamp: new Date().toISOString(),
  };
  
  // Cache local result too
  roiCache.set(cacheKey, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  
  return result;
}

/**
 * Attempts to fetch ROI from external content hub.
 * Returns null if unavailable or error occurs.
 */
async function tryExternalRoi(input: UnifiedRoiInput): Promise<RoiData | null> {
  try {
    // Map local input to content hub API format
    const hubParams: RoiParams = {
      facilityCount: input.facilityCount || 1,
      operationalScale: input.operationalScale,
      companySize: input.companySize,
      persona: input.persona,
      industry: input.industry,
    };

    const roiData = await contentHubClient.getRoiCalculation(hubParams);
    
    if (roiData) {
      logger.info('Successfully fetched ROI from content hub', { 
        annualSavings: roiData.annualSavings,
        confidence: roiData.confidence 
      });
      return roiData;
    }

    return null;
  } catch (error) {
    logger.error('Error fetching external ROI', { error });
    return null;
  }
}

/**
 * Clear ROI cache (useful for testing or forced refresh).
 */
export function clearRoiCache(): void {
  roiCache.clear();
  logger.info('ROI cache cleared');
}

/**
 * Get cache statistics for monitoring.
 */
export function getRoiCacheStats(): {
  size: number;
  entries: { key: string; expiresIn: number; source: string }[];
} {
  const now = Date.now();
  const entries = Array.from(roiCache.entries()).map(([key, value]) => ({
    key,
    expiresIn: Math.max(0, value.expiresAt - now),
    source: value.result.source,
  }));

  return {
    size: roiCache.size,
    entries,
  };
}
