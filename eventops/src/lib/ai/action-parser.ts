/**
 * Brain Action Parser
 *
 * Parses AI responses to extract structured actions.
 * Uses regex patterns to identify user intent from natural language.
 */

import type {
  BrainAction,
  NavigateAction,
  FilterAction,
  SearchAction,
  ResearchAction,
  EmailAction,
  ParseResult,
} from '@/types/brain-actions';

// Regex patterns for detecting actions in AI responses
const ACTION_PATTERNS = {
  navigate:
    /\b(go to|show me|open|navigate to|take you to|let me show you the)\s+(dashboard|prospects|sequences|import|accounts|hitlist|companies|contacts|campaigns)/i,
  filter:
    /\b(filter|show|display|let me find|i'll filter)\s+.*?(tier\s*[123]|with\s*email|without\s*email|no\s*email)/i,
  search:
    /\b(search(?:ing)?|(?:let me )?find|look(?:ing)?\s+for|i'll search for)\s+["']?([^"'\n.!?]+)["']?/i,
  research:
    /\b(research(?:ing)?|analyze|look(?:ing)?\s+up|let me research|i'll analyze)\s+(?:company\s+)?["']?([^"'\n.!?]+)["']?/i,
  email: /\b(send|write|compose|draft|email|emailing)\s+.*?email/i,
};

// Destination aliases for navigation
const DESTINATION_ALIASES: Record<string, NavigateAction['destination']> = {
  dashboard: 'dashboard',
  home: 'dashboard',
  main: 'dashboard',
  prospects: 'prospects',
  prospect: 'prospects',
  people: 'prospects',
  contacts: 'prospects',
  sequences: 'sequences',
  sequence: 'sequences',
  campaigns: 'sequences',
  import: 'import',
  upload: 'import',
  accounts: 'accounts',
  account: 'accounts',
  companies: 'accounts',
  hitlist: 'accounts',
};

/**
 * Normalize a destination string to a valid NavigateAction destination
 */
function normalizeDestination(dest: string): NavigateAction['destination'] {
  const normalized = dest.toLowerCase().trim();
  return DESTINATION_ALIASES[normalized] || 'dashboard';
}

/**
 * Parse a filter action from text
 */
function parseFilterAction(text: string): FilterAction {
  const action: FilterAction = { type: 'filter' };

  // Check for tier
  const tierMatch = text.match(/tier\s*([123])/i);
  if (tierMatch) {
    action.tier = `Tier ${tierMatch[1]}` as FilterAction['tier'];
  }

  // Check for email criteria
  if (/with\s*email/i.test(text)) {
    action.hasEmail = true;
  } else if (/without\s*email|no\s*email/i.test(text)) {
    action.hasEmail = false;
  }

  // Check for industry
  const industryMatch = text.match(/industry[:\s]+["']?([^"'\n,]+)["']?/i);
  if (industryMatch) {
    action.industry = industryMatch[1].trim();
  }

  // Check for ICP score
  const icpMatch = text.match(/icp\s*(?:score)?\s*(?:above|over|>=?|min(?:imum)?)\s*(\d+)/i);
  if (icpMatch) {
    action.icpScoreMin = parseInt(icpMatch[1], 10);
  }

  return action;
}

/**
 * Parse an AI response to extract a structured action
 *
 * @param response - The AI response text to parse
 * @returns The parsed action or undefined if no action detected
 */
export function parseActionFromResponse(response: string): BrainAction | undefined {
  // Check for navigation first (most specific)
  const navMatch = response.match(ACTION_PATTERNS.navigate);
  if (navMatch) {
    const dest = normalizeDestination(navMatch[2]);
    return {
      type: 'navigate',
      tab: dest, // GTM-YardFlow expects 'tab'
      destination: dest, // Backward compatibility
    };
  }

  // Check for filter
  const filterMatch = response.match(ACTION_PATTERNS.filter);
  if (filterMatch) {
    // Pass the full response for complete filter parsing
    return parseFilterAction(response);
  }

  // Check for research BEFORE search (analyze, research are research-specific)
  const researchMatch = response.match(ACTION_PATTERNS.research);
  if (researchMatch && researchMatch[2]) {
    const companyName = researchMatch[2].trim();
    // Skip if too short or common phrase
    if (companyName.length > 2 && !/^(the|this|that|a|an)$/i.test(companyName)) {
      return { type: 'research', companyName };
    }
  }

  // Check for search
  const searchMatch = response.match(ACTION_PATTERNS.search);
  if (searchMatch && searchMatch[2]) {
    const query = searchMatch[2].trim();
    // Skip if the "query" is actually a common phrase
    if (query.length > 2 && !/^(the|a|an|some|any)$/i.test(query)) {
      return { type: 'search', query };
    }
  }

  // Check for email
  if (ACTION_PATTERNS.email.test(response)) {
    return { type: 'email' } as EmailAction;
  }

  // No action detected
  return undefined;
}

/**
 * Parse an action with confidence scoring
 *
 * @param response - The AI response text to parse
 * @returns ParseResult with action and confidence score
 */
export function parseActionWithConfidence(response: string): ParseResult {
  const action = parseActionFromResponse(response);

  if (!action) {
    return { confidence: 0 };
  }

  // Base confidence
  let confidence = 0.5;

  // Boost for explicit intent phrases
  if (/I'll|Let me|I will|I'm going to/i.test(response)) {
    confidence += 0.25;
  }

  // Boost for action-specific confidence
  switch (action.type) {
    case 'navigate':
      // Navigation is usually unambiguous
      confidence += 0.15;
      break;
    case 'filter':
      // Higher confidence if tier is specified
      if ((action as FilterAction).tier) {
        confidence += 0.1;
      }
      // Higher confidence if email criteria specified
      if ((action as FilterAction).hasEmail !== undefined) {
        confidence += 0.05;
      }
      break;
    case 'search':
      // Confidence based on query specificity
      if ((action as SearchAction).query.length > 5) {
        confidence += 0.1;
      }
      break;
    case 'research':
      // Higher confidence if company name is clear
      if ((action as ResearchAction).companyName) {
        confidence += 0.1;
      }
      break;
    default:
      break;
  }

  return {
    action,
    confidence: Math.min(confidence, 1),
  };
}

/**
 * Check if a response contains actionable content
 */
export function hasActionableContent(response: string): boolean {
  return Object.values(ACTION_PATTERNS).some((pattern) => pattern.test(response));
}
