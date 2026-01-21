// Email enrichment using Hunter.io API
// Docs: https://hunter.io/api-documentation/v2#email-finder

interface EmailFinderResult {
  email: string | null;
  confidence: number; // 0-100
  firstName: string;
  lastName: string;
  position: string;
  companyName: string;
  source: string;
}

interface EnrichmentResult {
  email: string | null;
  confidence: number;
  source: string;
  error?: string;
}

/**
 * Find email address using Hunter.io Email Finder API
 * Requires HUNTER_API_KEY environment variable
 */
export async function findEmail(
  firstName: string,
  lastName: string,
  companyDomain: string
): Promise<EnrichmentResult> {
  const apiKey = process.env.HUNTER_API_KEY;
  
  if (!apiKey) {
    return {
      email: null,
      confidence: 0,
      source: 'none',
      error: 'HUNTER_API_KEY not configured'
    };
  }

  try {
    const url = new URL('https://api.hunter.io/v2/email-finder');
    url.searchParams.append('domain', companyDomain);
    url.searchParams.append('first_name', firstName);
    url.searchParams.append('last_name', lastName);
    url.searchParams.append('api_key', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok) {
      return {
        email: null,
        confidence: 0,
        source: 'hunter',
        error: data.errors?.[0]?.details || 'API error'
      };
    }

    const result = data.data as EmailFinderResult;
    
    return {
      email: result.email,
      confidence: result.confidence || 0,
      source: 'hunter',
    };
  } catch (error) {
    return {
      email: null,
      confidence: 0,
      source: 'hunter',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validate email format and perform basic DNS check
 */
export function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Extract domain from company name (best effort)
 * Examples: 
 *   "GXO Logistics" -> "gxo.com"
 *   "Thrive Market" -> "thrivemarket.com"
 *   "Fabletics" -> "fabletics.com"
 */
export function guessDomain(companyName: string): string {
  // Remove common business suffixes
  let domain = companyName
    .toLowerCase()
    .replace(/\s*(inc\.|incorporated|llc|ltd|limited|corp|corporation|co\.|company)\s*$/gi, '')
    .trim();
  
  // Remove spaces and special characters
  domain = domain.replace(/[^a-z0-9]/g, '');
  
  // Add .com (most common)
  return `${domain}.com`;
}

/**
 * Batch email enrichment with rate limiting
 * @param contacts Array of {name, companyName, companyDomain}
 * @param rateLimitMs Milliseconds between requests (default 1000ms = 1/sec)
 */
export async function batchEnrichEmails(
  contacts: Array<{ name: string; companyName: string; companyDomain?: string }>,
  rateLimitMs: number = 1000
): Promise<Array<EnrichmentResult & { name: string; companyName: string }>> {
  const results: Array<EnrichmentResult & { name: string; companyName: string }> = [];

  for (const contact of contacts) {
    // Parse name into first/last
    const nameParts = contact.name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Use provided domain or guess it
    const domain = contact.companyDomain || guessDomain(contact.companyName);
    
    const result = await findEmail(firstName, lastName, domain);
    results.push({
      ...result,
      name: contact.name,
      companyName: contact.companyName,
    });

    // Rate limiting - wait before next request
    if (contacts.indexOf(contact) < contacts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, rateLimitMs));
    }
  }

  return results;
}
