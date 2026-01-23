/**
 * Advanced Domain Intelligence
 * 
 * Smarter domain guessing with:
 * - TLD pattern recognition (.com, .io, .co, country codes)
 * - Industry-specific patterns
 * - Common naming conventions
 * - DNS verification
 */

interface DomainGuess {
  domain: string;
  confidence: number;
  verified: boolean;
}

/**
 * Guess company domain with advanced pattern matching
 */
export async function guessCompanyDomain(
  companyName: string,
  industry?: string
): Promise<DomainGuess[]> {
  const guesses: DomainGuess[] = [];
  
  // Normalize company name
  const normalized = normalizeCompanyName(companyName);
  
  // Generate TLD variants
  const tlds = getTLDsForCompany(companyName, industry);
  
  for (const tld of tlds) {
    guesses.push({
      domain: `${normalized}.${tld}`,
      confidence: getTLDConfidence(tld, industry),
      verified: false,
    });
  }
  
  // Add common patterns
  const patterns = getCompanyPatterns(normalized, industry);
  for (const pattern of patterns) {
    for (const tld of tlds.slice(0, 3)) { // Top 3 TLDs only
      guesses.push({
        domain: `${pattern}.${tld}`,
        confidence: 40,
        verified: false,
      });
    }
  }
  
  // Sort by confidence
  guesses.sort((a, b) => b.confidence - a.confidence);
  
  // Verify top candidates
  const topGuesses = guesses.slice(0, 5);
  const verifiedGuesses = await Promise.all(
    topGuesses.map(async (guess) => ({
      ...guess,
      verified: await verifyDomainExists(guess.domain),
    }))
  );
  
  // Boost confidence for verified domains
  return verifiedGuesses.map(g => ({
    ...g,
    confidence: g.verified ? Math.min(g.confidence + 30, 95) : g.confidence,
  })).sort((a, b) => b.confidence - a.confidence);
}

/**
 * Normalize company name for domain
 */
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    // Remove legal entities
    .replace(/\b(inc|incorporated|llc|ltd|limited|corp|corporation|co|company|gmbh|ag)\b\.?/gi, '')
    // Remove special chars
    .replace(/[^a-z0-9\s-]/g, '')
    // Collapse whitespace
    .replace(/\s+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Remove double hyphens
    .replace(/-{2,}/g, '-');
}

/**
 * Get likely TLDs based on company and industry
 */
function getTLDsForCompany(companyName: string, industry?: string): string[] {
  const tlds: string[] = [];
  
  // Default to .com first
  tlds.push('com');
  
  // Industry-specific TLDs
  if (industry) {
    const industryTLDs: Record<string, string[]> = {
      technology: ['io', 'ai', 'tech', 'dev', 'app'],
      software: ['io', 'ai', 'app', 'dev', 'tech'],
      logistics: ['express', 'freight', 'ship', 'delivery'],
      finance: ['financial', 'capital', 'bank'],
      healthcare: ['health', 'care', 'medical'],
      education: ['edu', 'academy', 'school'],
      media: ['media', 'news', 'press'],
      retail: ['shop', 'store'],
      consulting: ['partners', 'group', 'consulting'],
    };
    
    const lowerIndustry = industry.toLowerCase();
    for (const [key, values] of Object.entries(industryTLDs)) {
      if (lowerIndustry.includes(key)) {
        tlds.push(...values);
      }
    }
  }
  
  // Common alternatives
  tlds.push('co', 'net', 'org', 'io');
  
  // Country codes (common ones)
  tlds.push('uk', 'ca', 'au', 'de', 'fr');
  
  // Remove duplicates while preserving order
  return [...new Set(tlds)];
}

/**
 * Get TLD confidence score
 */
function getTLDConfidence(tld: string, industry?: string): number {
  // Base scores
  const baseScores: Record<string, number> = {
    'com': 80,
    'io': 60,
    'co': 60,
    'net': 50,
    'org': 40,
  };
  
  let score = baseScores[tld] || 30;
  
  // Industry boost
  if (industry) {
    if (industry.toLowerCase().includes('tech') && ['io', 'ai', 'tech'].includes(tld)) {
      score += 20;
    }
    if (industry.toLowerCase().includes('logistics') && ['express', 'freight'].includes(tld)) {
      score += 20;
    }
  }
  
  return Math.min(score, 90);
}

/**
 * Generate common naming patterns
 */
function getCompanyPatterns(normalized: string, industry?: string): string[] {
  const patterns: string[] = [];
  
  // Remove hyphens for some patterns
  const nohyphens = normalized.replace(/-/g, '');
  
  patterns.push(
    `get${nohyphens}`,
    `use${nohyphens}`,
    `try${nohyphens}`,
    `${nohyphens}app`,
    `${nohyphens}hq`,
  );
  
  // Industry-specific patterns
  if (industry?.toLowerCase().includes('logistics')) {
    patterns.push(
      `${nohyphens}express`,
      `${nohyphens}freight`,
      `${nohyphens}logistics`
    );
  }
  
  return patterns;
}

/**
 * Verify domain exists via DNS lookup
 */
async function verifyDomainExists(domain: string): Promise<boolean> {
  try {
    // Try to resolve domain
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=A`, {
      signal: AbortSignal.timeout(3000),
    });
    
    const data = await response.json();
    return data.Answer && data.Answer.length > 0;
  } catch (error) {
    // If verification fails, assume it might exist (don't penalize)
    return false;
  }
}

/**
 * Extract domain from URL or email
 */
export function extractDomain(input: string): string | null {
  // Email format
  if (input.includes('@')) {
    return input.split('@')[1]?.toLowerCase() || null;
  }
  
  // URL format
  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Validate domain format
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
}
