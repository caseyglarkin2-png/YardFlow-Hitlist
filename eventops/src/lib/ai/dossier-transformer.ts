/**
 * Dossier Response Transformer
 *
 * Transforms Railway's internal dossier format to the frontend-compatible format
 * expected by GTM-YardFlow's DossierPanel component.
 */

import type {
  FrontendDossierResponse,
  ResearchedCompanyData,
  ConfidenceLevel,
} from '@/types/dossier-response';
import type { DossierGenerationResult } from './dossier-generator';

/**
 * Account data needed for transformation
 */
interface AccountData {
  website?: string | null;
  headquarters?: string | null;
}

/**
 * Raw dossier data from AI generation (new frontend-compatible format)
 */
interface RawFrontendDossier {
  description?: string;
  industryCategory?: string;
  facilityCount?: string;
  distributionFootprint?: string;
  revenueEstimate?: string;
  isYardIntensive?: boolean;
  yardPainPoints?: string[];
  talkingPoints?: string[];
  competitors?: string[];
  decisionMakers?: string[];
  confidenceLevel?: string;
  sources?: string[];
}

/**
 * Legacy dossier format (for backwards compatibility)
 */
interface LegacyDossier {
  companyOverview?: string;
  industryContext?: string;
  keyPainPoints?: string[];
  companySize?: string;
  facilityIntelligence?: {
    estimatedYardCount?: number;
    confidenceLevel?: string;
    operationalScale?: string;
  };
  talkingPoints?: string[];
  competitors?: string[];
}

/**
 * Maps confidence level string to enum
 */
function mapConfidenceLevel(level?: string): ConfidenceLevel {
  if (!level) return 'medium';
  const normalized = level.toLowerCase().trim();
  if (normalized === 'high') return 'high';
  if (normalized === 'low') return 'low';
  return 'medium';
}

/**
 * Ensures array is valid string array
 */
function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

/**
 * Transforms raw AI dossier to frontend-compatible format
 */
export function transformDossierToFrontendFormat(
  dossier: RawFrontendDossier | LegacyDossier,
  account: AccountData
): ResearchedCompanyData {
  // Check if this is the new frontend-compatible format
  const isNewFormat = 'description' in dossier;

  if (isNewFormat) {
    const raw = dossier as RawFrontendDossier;
    return {
      description: raw.description || '',
      website: account.website || '',
      facilityCount: raw.facilityCount || 'Unknown',
      industryCategory: raw.industryCategory || 'Unknown',
      distributionFootprint: raw.distributionFootprint || 'Unknown',
      headquarters: account.headquarters || 'Unknown',
      revenueEstimate: raw.revenueEstimate || 'Unknown',
      isYardIntensive: raw.isYardIntensive ?? false,
      yardPainPoints: ensureStringArray(raw.yardPainPoints),
      talkingPoints: ensureStringArray(raw.talkingPoints),
      competitors: ensureStringArray(raw.competitors),
      decisionMakers: ensureStringArray(raw.decisionMakers),
    };
  }

  // Handle legacy format (backwards compatibility)
  const legacy = dossier as LegacyDossier;
  return {
    description: legacy.companyOverview || '',
    website: account.website || '',
    facilityCount: legacy.facilityIntelligence?.estimatedYardCount
      ? `${legacy.facilityIntelligence.estimatedYardCount} facilities`
      : 'Unknown',
    industryCategory: extractIndustryCategory(legacy.industryContext),
    distributionFootprint: legacy.facilityIntelligence?.operationalScale || 'Unknown',
    headquarters: account.headquarters || 'Unknown',
    revenueEstimate: legacy.companySize || 'Unknown',
    isYardIntensive: inferYardIntensive(legacy),
    yardPainPoints: ensureStringArray(legacy.keyPainPoints),
    talkingPoints: ensureStringArray(legacy.talkingPoints),
    competitors: ensureStringArray(legacy.competitors),
    decisionMakers: [], // Not available in legacy format
  };
}

/**
 * Extracts industry category from full context string
 */
function extractIndustryCategory(context?: string): string {
  if (!context) return 'Unknown';

  // Common industry keywords
  const categories = [
    'Logistics',
    'Distribution',
    'Manufacturing',
    'Transportation',
    '3PL',
    'Retail',
    'Warehousing',
    'Supply Chain',
    'Trucking',
    'Freight',
  ];

  for (const cat of categories) {
    if (context.toLowerCase().includes(cat.toLowerCase())) {
      return cat;
    }
  }

  // Return first 30 chars if no match
  return context.slice(0, 30) + (context.length > 30 ? '...' : '');
}

/**
 * Infers if company is yard-intensive from legacy data
 */
function inferYardIntensive(legacy: LegacyDossier): boolean {
  const yardKeywords = ['yard', 'dock', 'warehouse', 'distribution', 'logistics', 'freight'];
  const allText = [
    legacy.companyOverview,
    legacy.industryContext,
    ...(legacy.keyPainPoints || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return yardKeywords.some((kw) => allText.includes(kw));
}

/**
 * Full transformation from DossierGenerationResult to FrontendDossierResponse
 */
export function transformToFrontendResponse(
  result: DossierGenerationResult,
  account: AccountData
): FrontendDossierResponse {
  if (!result.success || !result.dossier) {
    return {
      success: false,
      data: null,
      error: result.error || 'Dossier generation failed',
      researchedAt: new Date().toISOString(),
    };
  }

  // Extract confidence level
  const rawDossier = result.dossier as RawFrontendDossier & LegacyDossier;
  const confidenceLevel =
    rawDossier.confidenceLevel || rawDossier.facilityIntelligence?.confidenceLevel;

  // Extract sources
  const sources = (rawDossier as RawFrontendDossier).sources || [
    'AI Research',
    'Company Profile Analysis',
  ];

  return {
    success: true,
    data: transformDossierToFrontendFormat(result.dossier, account),
    confidence: {
      overall: mapConfidenceLevel(confidenceLevel),
    },
    researchedAt: new Date().toISOString(),
    sources: ensureStringArray(sources),
  };
}
