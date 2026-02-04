/**
 * Frontend-Compatible Dossier Response Types
 *
 * These types match EXACTLY what GTM-YardFlow's DossierPanel expects.
 * Railway API responses must conform to these interfaces.
 *
 * Source: GTM-YardFlow/src/components/panels/DossierPanel.tsx
 */

/**
 * Research data for a company - matches ResearchedCompanyData in frontend
 */
export interface ResearchedCompanyData {
  // Core fields
  description: string;
  website: string;

  // Company profile grid (displayed in 2-column grid)
  facilityCount: string; // e.g., "12 facilities"
  industryCategory: string; // e.g., "Logistics & Distribution"
  distributionFootprint: string; // e.g., "National", "Regional", "Local"
  headquarters: string; // e.g., "Dallas, TX"
  revenueEstimate: string; // e.g., "$50M-100M"
  isYardIntensive: boolean; // Whether company likely has yard operations

  // Rich content arrays
  yardPainPoints: string[]; // Pain points specific to yard management
  talkingPoints: string[]; // Conversation starters for sales
  competitors: string[]; // Competitor company names
  decisionMakers: string[]; // Target titles to find (e.g., "VP Operations")
}

/**
 * Confidence levels for research data quality
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Full research result - matches CompanyResearchResult in frontend
 */
export interface FrontendDossierResponse {
  success: boolean;
  data: ResearchedCompanyData | null;
  confidence?: {
    overall: ConfidenceLevel;
  };
  researchedAt: string; // ISO date string
  sources?: string[]; // Source URLs or names
  error?: string;
}

/**
 * Type guard to check if data is valid ResearchedCompanyData
 */
export function isValidResearchData(data: unknown): data is ResearchedCompanyData {
  if (!data || typeof data !== 'object') return false;

  const d = data as Record<string, unknown>;

  return (
    typeof d.description === 'string' &&
    typeof d.facilityCount === 'string' &&
    typeof d.industryCategory === 'string' &&
    typeof d.isYardIntensive === 'boolean' &&
    Array.isArray(d.yardPainPoints) &&
    Array.isArray(d.talkingPoints) &&
    Array.isArray(d.competitors) &&
    Array.isArray(d.decisionMakers)
  );
}

/**
 * Default empty research data for error cases
 */
export function getEmptyResearchData(): ResearchedCompanyData {
  return {
    description: '',
    website: '',
    facilityCount: 'Unknown',
    industryCategory: 'Unknown',
    distributionFootprint: 'Unknown',
    headquarters: 'Unknown',
    revenueEstimate: 'Unknown',
    isYardIntensive: false,
    yardPainPoints: [],
    talkingPoints: [],
    competitors: [],
    decisionMakers: [],
  };
}
