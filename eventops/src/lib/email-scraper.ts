/**
 * Custom Email Pattern Scraper
 * Reverse-engineer company email patterns and generate likely addresses
 * No external API required - pure pattern matching and validation
 */

interface EmailPattern {
  pattern: string; // e.g., "first.last@company.com", "flast@company.com"
  confidence: number; // 0-100
  examples?: string[];
}

interface CompanyEmailPattern {
  domain: string;
  commonPatterns: EmailPattern[];
  detectedPattern?: string;
}

interface LinkedInProfile {
  url: string | null;
  confidence: number;
  source: 'direct' | 'search' | 'pattern';
}

/**
 * Common email patterns used by companies
 * Ranked by popularity in B2B SaaS/Enterprise
 */
const COMMON_PATTERNS = [
  { pattern: '{first}.{last}@{domain}', weight: 40 }, // john.smith@company.com
  { pattern: '{first}{last}@{domain}', weight: 25 }, // johnsmith@company.com
  { pattern: '{first}@{domain}', weight: 15 }, // john@company.com
  { pattern: '{first.char}{last}@{domain}', weight: 10 }, // jsmith@company.com
  { pattern: '{first}_{last}@{domain}', weight: 5 }, // john_smith@company.com
  { pattern: '{last}.{first}@{domain}', weight: 3 }, // smith.john@company.com
  { pattern: '{first.char}{last.char}@{domain}', weight: 2 }, // js@company.com (rare for large orgs)
];

/**
 * Generate all possible email addresses based on common patterns
 */
export function generateEmailCandidates(
  firstName: string,
  lastName: string,
  domain: string
): Array<{ email: string; pattern: string; confidence: number }> {
  const first = firstName.toLowerCase().trim();
  const last = lastName.toLowerCase().trim();
  const cleanDomain = domain.toLowerCase().replace(/^www\./, '');

  const candidates = [];

  for (const { pattern, weight } of COMMON_PATTERNS) {
    let email = pattern
      .replace('{first}', first)
      .replace('{last}', last)
      .replace('{first.char}', first.charAt(0))
      .replace('{last.char}', last.charAt(0))
      .replace('{domain}', cleanDomain);

    // Remove special chars that snuck in
    email = email.replace(/[^a-z0-9@._-]/g, '');

    candidates.push({
      email,
      pattern,
      confidence: weight,
    });
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Analyze known emails from a company to detect their pattern
 * If you have any confirmed emails, this improves accuracy dramatically
 */
export function detectCompanyPattern(
  knownEmails: Array<{ name: string; email: string }>,
  domain: string
): CompanyEmailPattern {
  const patterns: { [key: string]: number } = {};

  for (const { name, email } of knownEmails) {
    if (!email.endsWith(`@${domain}`)) continue;

    const nameParts = name.trim().split(/\s+/);
    const first = nameParts[0]?.toLowerCase() || '';
    const last = nameParts.slice(1).join(' ').toLowerCase() || '';
    
    const localPart = email.split('@')[0]?.toLowerCase() || '';

    // Detect pattern
    if (localPart === `${first}.${last}`) {
      patterns['first.last'] = (patterns['first.last'] || 0) + 1;
    } else if (localPart === `${first}${last}`) {
      patterns['firstlast'] = (patterns['firstlast'] || 0) + 1;
    } else if (localPart === first) {
      patterns['first'] = (patterns['first'] || 0) + 1;
    } else if (localPart === `${first.charAt(0)}${last}`) {
      patterns['flast'] = (patterns['flast'] || 0) + 1;
    } else if (localPart === `${first}_${last}`) {
      patterns['first_last'] = (patterns['first_last'] || 0) + 1;
    }
  }

  // Find most common pattern
  const sortedPatterns = Object.entries(patterns)
    .sort((a, b) => b[1] - a[1])
    .map(([pattern, count]) => ({
      pattern,
      confidence: Math.min(100, (count / knownEmails.length) * 100),
      examples: knownEmails
        .filter(e => e.email.endsWith(`@${domain}`))
        .slice(0, 3)
        .map(e => e.email),
    }));

  return {
    domain,
    commonPatterns: sortedPatterns,
    detectedPattern: sortedPatterns[0]?.pattern,
  };
}

/**
 * Generate LinkedIn profile URL from name and company
 * Uses pattern matching - actual scraping would require puppeteer/playwright
 */
export function generateLinkedInProfileUrl(
  firstName: string,
  lastName: string,
  companyName: string
): LinkedInProfile {
  // LinkedIn profile URL pattern: linkedin.com/in/first-last
  const first = firstName.toLowerCase().trim().replace(/[^a-z]/g, '');
  const last = lastName.toLowerCase().trim().replace(/[^a-z]/g, '');
  
  if (!first || !last) {
    return {
      url: null,
      confidence: 0,
      source: 'pattern',
    };
  }

  // Most common pattern
  const profileSlug = `${first}-${last}`;
  const url = `https://www.linkedin.com/in/${profileSlug}`;

  // Confidence based on name complexity (common names have more duplicates)
  let confidence = 70;
  
  // If name is very common (short), reduce confidence
  if (first.length <= 4 && last.length <= 5) {
    confidence = 50; // e.g., "John Smith" has many LinkedIn profiles
  }
  
  // If name is unique, increase confidence
  if (first.length > 7 || last.length > 8) {
    confidence = 85;
  }

  return {
    url,
    confidence,
    source: 'pattern',
  };
}

/**
 * Advanced: Build LinkedIn search URL to find profile
 * User can manually verify or we could automate with browser automation
 */
export function buildLinkedInSearchUrl(
  firstName: string,
  lastName: string,
  companyName: string
): string {
  const query = encodeURIComponent(`${firstName} ${lastName} ${companyName}`);
  return `https://www.linkedin.com/search/results/people/?keywords=${query}`;
}

/**
 * Validate email using DNS MX record check (basic verification)
 * NOTE: This requires server-side execution, not browser
 */
export async function verifyEmailDomain(domain: string): Promise<boolean> {
  try {
    // In production, you'd use dns.resolveMx() from Node.js
    // For now, just validate format
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
    return domainRegex.test(domain);
  } catch {
    return false;
  }
}

/**
 * Score email candidates based on company research
 * If we know facility count, size, industry - adjust confidence
 */
export function scoreEmailCandidate(
  candidate: { email: string; pattern: string; confidence: number },
  companyData?: {
    size?: string; // "Large", "Medium", "Small"
    industry?: string;
    knownPattern?: string;
  }
): number {
  let score = candidate.confidence;

  // Large companies typically use first.last format
  if (companyData?.size === 'Large' && candidate.pattern.includes('first.last')) {
    score += 20;
  }

  // Small companies often use first@ or firstlast@
  if (companyData?.size === 'Small' && 
      (candidate.pattern.includes('{first}@') || candidate.pattern.includes('firstlast'))) {
    score += 15;
  }

  // If we detected their pattern, boost matching candidates
  if (companyData?.knownPattern && candidate.pattern.includes(companyData.knownPattern)) {
    score += 30;
  }

  return Math.min(100, score);
}

/**
 * Main function: Get best email guess for a contact
 */
export interface EmailGuess {
  email: string;
  confidence: number;
  pattern: string;
  alternatives: Array<{ email: string; confidence: number }>;
  linkedinUrl: string | null;
  linkedinSearchUrl: string;
}

export function guessContactEmail(
  firstName: string,
  lastName: string,
  companyDomain: string,
  companyName: string,
  companySize?: string,
  knownEmails?: Array<{ name: string; email: string }>
): EmailGuess {
  // Generate all candidates
  const candidates = generateEmailCandidates(firstName, lastName, companyDomain);

  // Detect company pattern if we have known emails
  let detectedPattern: string | undefined;
  if (knownEmails && knownEmails.length > 0) {
    const pattern = detectCompanyPattern(knownEmails, companyDomain);
    detectedPattern = pattern.detectedPattern;
  }

  // Score each candidate
  const scored = candidates.map(c => ({
    ...c,
    confidence: scoreEmailCandidate(c, { 
      size: companySize, 
      knownPattern: detectedPattern 
    }),
  })).sort((a, b) => b.confidence - a.confidence);

  // Generate LinkedIn profile
  const linkedin = generateLinkedInProfileUrl(firstName, lastName, companyName);
  const linkedinSearch = buildLinkedInSearchUrl(firstName, lastName, companyName);

  return {
    email: scored[0]!.email,
    confidence: scored[0]!.confidence,
    pattern: scored[0]!.pattern,
    alternatives: scored.slice(1, 4).map(s => ({
      email: s.email,
      confidence: s.confidence,
    })),
    linkedinUrl: linkedin.url,
    linkedinSearchUrl: linkedinSearch,
  };
}
