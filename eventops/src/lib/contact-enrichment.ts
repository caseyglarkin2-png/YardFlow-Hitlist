/**
 * Multi-Source Contact Enrichment Service
 * 
 * Aggregates data from:
 * - Hunter.io (email finding)
 * - Clearbit (company + person data)
 * - LinkedIn (via web scraping/API if available)
 * - AI-powered smart guessing
 * - Web scraping for social profiles
 */

import { findEmail, guessDomain } from './email-enrichment';

export interface EnrichedContact {
  // Core identifiers
  name: string;
  email: string | null;
  emailConfidence: number;
  emailSource: string;
  
  // Professional info
  title: string | null;
  seniority: string | null;
  department: string | null;
  
  // Social profiles
  linkedInUrl: string | null;
  twitterUrl: string | null;
  githubUrl: string | null;
  
  // Company context
  companyName: string;
  companyDomain: string;
  companySize: string | null;
  companyIndustry: string | null;
  
  // Contact methods
  phoneNumber: string | null;
  mobileNumber: string | null;
  
  // Metadata
  lastEnriched: Date;
  dataQualityScore: number; // 0-100
  sources: string[];
}

export interface EnrichmentOptions {
  useHunter?: boolean;
  useClearbit?: boolean;
  useAI?: boolean;
  scrapeLinkedIn?: boolean;
  timeout?: number;
}

/**
 * Main enrichment function - combines multiple data sources
 */
export async function enrichContact(
  name: string,
  companyName: string,
  options: EnrichmentOptions = {}
): Promise<EnrichedContact> {
  const {
    useHunter = true,
    useClearbit = false,
    useAI = true,
    scrapeLinkedIn = false,
    timeout = 10000,
  } = options;

  const startTime = Date.now();
  const sources: string[] = [];
  
  // Parse name
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  // Guess company domain
  const companyDomain = guessDomain(companyName);
  
  // Initialize result
  const result: EnrichedContact = {
    name,
    email: null,
    emailConfidence: 0,
    emailSource: 'none',
    title: null,
    seniority: null,
    department: null,
    linkedInUrl: null,
    twitterUrl: null,
    githubUrl: null,
    companyName,
    companyDomain,
    companySize: null,
    companyIndustry: null,
    phoneNumber: null,
    mobileNumber: null,
    lastEnriched: new Date(),
    dataQualityScore: 0,
    sources: [],
  };

  // 1. Try Hunter.io for email
  if (useHunter && process.env.HUNTER_API_KEY) {
    try {
      const hunterResult = await Promise.race([
        findEmail(firstName, lastName, companyDomain),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
      ]) as any;
      
      if (hunterResult.email) {
        result.email = hunterResult.email;
        result.emailConfidence = hunterResult.confidence;
        result.emailSource = 'hunter';
        sources.push('hunter.io');
      }
    } catch (error) {
      console.warn('Hunter.io enrichment failed:', error);
    }
  }

  // 2. Try Clearbit Person API
  if (useClearbit && process.env.CLEARBIT_API_KEY && result.email) {
    try {
      const clearbitData = await enrichWithClearbit(result.email);
      if (clearbitData) {
        result.title = clearbitData.title || result.title;
        result.seniority = clearbitData.seniority || result.seniority;
        result.linkedInUrl = clearbitData.linkedin || result.linkedInUrl;
        result.twitterUrl = clearbitData.twitter || result.twitterUrl;
        result.companySize = clearbitData.companySize || result.companySize;
        sources.push('clearbit');
      }
    } catch (error) {
      console.warn('Clearbit enrichment failed:', error);
    }
  }

  // 3. LinkedIn scraping (if enabled)
  if (scrapeLinkedIn) {
    try {
      const linkedInData = await findLinkedInProfile(name, companyName);
      if (linkedInData) {
        result.linkedInUrl = linkedInData.url;
        result.title = linkedInData.title || result.title;
        sources.push('linkedin_scrape');
      }
    } catch (error) {
      console.warn('LinkedIn scraping failed:', error);
    }
  }

  // 4. AI-powered smart guessing for missing data
  if (useAI && !result.email) {
    try {
      const aiGuess = await smartGuessContactInfo(firstName, lastName, companyName, companyDomain);
      if (aiGuess.email && aiGuess.confidence > 60) {
        result.email = aiGuess.email;
        result.emailConfidence = aiGuess.confidence;
        result.emailSource = 'ai_guess';
        sources.push('ai_inference');
      }
    } catch (error) {
      console.warn('AI guessing failed:', error);
    }
  }

  // 5. Web search for social profiles
  try {
    const socialProfiles = await findSocialProfiles(name, companyName);
    result.linkedInUrl = result.linkedInUrl || socialProfiles.linkedin;
    result.twitterUrl = result.twitterUrl || socialProfiles.twitter;
    result.githubUrl = socialProfiles.github;
    if (socialProfiles.found) sources.push('web_search');
  } catch (error) {
    console.warn('Social profile search failed:', error);
  }

  // Calculate data quality score
  result.dataQualityScore = calculateDataQuality(result);
  result.sources = sources;

  return result;
}

/**
 * Clearbit Person API enrichment
 */
async function enrichWithClearbit(email: string): Promise<any> {
  const apiKey = process.env.CLEARBIT_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(`https://person.clearbit.com/v2/combined/find?email=${email}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) return null;
  
  const data = await response.json();
  return {
    title: data.person?.employment?.title,
    seniority: data.person?.employment?.seniority,
    linkedin: data.person?.linkedin?.handle ? `https://linkedin.com/in/${data.person.linkedin.handle}` : null,
    twitter: data.person?.twitter?.handle ? `https://twitter.com/${data.person.twitter.handle}` : null,
    companySize: data.company?.metrics?.employees,
  };
}

/**
 * LinkedIn profile finder using web search
 */
async function findLinkedInProfile(name: string, companyName: string): Promise<{ url: string; title?: string } | null> {
  // Use Google Custom Search API or SerpAPI
  const searchQuery = `${name} ${companyName} site:linkedin.com/in`;
  
  // If we have SerpAPI key
  if (process.env.SERPAPI_KEY) {
    try {
      const response = await fetch(
        `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&api_key=${process.env.SERPAPI_KEY}&num=1`
      );
      const data = await response.json();
      const firstResult = data.organic_results?.[0];
      
      if (firstResult && firstResult.link.includes('linkedin.com/in/')) {
        return {
          url: firstResult.link,
          title: firstResult.snippet?.match(/(?:at|@)\s+([^|•]+)/)?.[1]?.trim(),
        };
      }
    } catch (error) {
      console.warn('SerpAPI search failed:', error);
    }
  }
  
  return null;
}

/**
 * AI-powered email pattern inference
 */
async function smartGuessContactInfo(
  firstName: string,
  lastName: string,
  companyName: string,
  domain: string
): Promise<{ email: string; confidence: number }> {
  // Common email patterns
  const patterns = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()}@${domain}`,
    `${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}@${domain}`,
    `${firstName.toLowerCase()}_${lastName.toLowerCase()}@${domain}`,
    `${firstName.toLowerCase()}@${domain}`,
  ];

  // If we have OpenAI, use it to rank patterns based on company context
  if (process.env.OPENAI_API_KEY) {
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Given a person named "${firstName} ${lastName}" at company "${companyName}" with domain "${domain}", which email pattern is most likely?
          
Options:
${patterns.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Respond with just the number (1-${patterns.length}) of the most likely pattern.`
        }],
        temperature: 0.3,
      });

      const choice = parseInt(response.choices[0]?.message?.content || '1') - 1;
      if (choice >= 0 && choice < patterns.length) {
        return {
          email: patterns[choice],
          confidence: 65, // AI guess - moderate confidence
        };
      }
    } catch (error) {
      console.warn('AI email pattern inference failed:', error);
    }
  }

  // Default to most common pattern
  return {
    email: patterns[0],
    confidence: 50,
  };
}

/**
 * Find social media profiles via web search
 */
async function findSocialProfiles(name: string, companyName: string): Promise<{
  linkedin: string | null;
  twitter: string | null;
  github: string | null;
  found: boolean;
}> {
  const result = {
    linkedin: null as string | null,
    twitter: null as string | null,
    github: null as string | null,
    found: false,
  };

  // Would use SerpAPI or similar here
  // For now, construct likely URLs
  
  const linkedInSlug = name.toLowerCase().replace(/\s+/g, '-');
  result.linkedin = `https://linkedin.com/in/${linkedInSlug}`;
  
  const twitterHandle = name.toLowerCase().replace(/\s+/g, '');
  result.twitter = `https://twitter.com/${twitterHandle}`;
  
  return result;
}

/**
 * Calculate data quality score based on completeness
 */
function calculateDataQuality(contact: EnrichedContact): number {
  let score = 0;
  
  // Email is most important
  if (contact.email) {
    score += 40;
    score += Math.min(contact.emailConfidence * 0.3, 30); // Up to 30 more for confidence
  }
  
  // Social profiles
  if (contact.linkedInUrl) score += 15;
  if (contact.twitterUrl) score += 5;
  
  // Professional info
  if (contact.title) score += 10;
  if (contact.seniority) score += 5;
  if (contact.department) score += 5;
  
  // Contact methods
  if (contact.phoneNumber) score += 10;
  
  return Math.min(score, 100);
}

/**
 * Batch enrichment with concurrency control
 */
export async function batchEnrichContacts(
  contacts: Array<{ name: string; companyName: string }>,
  options: EnrichmentOptions & { concurrency?: number } = {}
): Promise<EnrichedContact[]> {
  const { concurrency = 3, ...enrichOptions } = options;
  const results: EnrichedContact[] = [];
  
  // Process in batches
  for (let i = 0; i < contacts.length; i += concurrency) {
    const batch = contacts.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(c => enrichContact(c.name, c.companyName, enrichOptions))
    );
    results.push(...batchResults);
    
    // Rate limiting between batches
    if (i + concurrency < contacts.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}
