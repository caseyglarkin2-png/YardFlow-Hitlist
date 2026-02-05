/**
 * Brain Action Types
 *
 * Type definitions for structured actions the Brain can return.
 * The frontend (GTM-YardFlow) uses these to execute navigation,
 * filtering, and other UI actions based on chat responses.
 */

// All possible action types
export type BrainActionType =
  | 'navigate' // Go to a tab/page
  | 'filter' // Apply filters to current view
  | 'search' // Search for specific items
  | 'select' // Select specific items
  | 'research' // Trigger company research
  | 'email' // Open email composer
  | 'explain'; // Just explain (no UI action)

// Navigate to a specific page/tab
export interface NavigateAction {
  type: 'navigate';
  destination: 'dashboard' | 'prospects' | 'sequences' | 'import' | 'accounts';
  tab?: 'dashboard' | 'prospects' | 'sequences' | 'import' | 'accounts'; // Alias for GTM-YardFlow frontend
}

// Apply filters to the current view
export interface FilterAction {
  type: 'filter';
  tier?: 'Tier 1' | 'Tier 2' | 'Tier 3';
  hasEmail?: boolean;
  industry?: string;
  icpScoreMin?: number;
}

// Search for items
export interface SearchAction {
  type: 'search';
  query: string;
}

// Select specific items by ID
export interface SelectAction {
  type: 'select';
  itemIds: string[];
}

// Trigger research for a company
export interface ResearchAction {
  type: 'research';
  companyName?: string;
  accountId?: string;
}

// Open email composer
export interface EmailAction {
  type: 'email';
  recipientIds?: string[];
  templateType?: 'intro' | 'followup' | 'meeting';
}

// Just explain something (no action needed)
export interface ExplainAction {
  type: 'explain';
  topic: string;
}

// Union of all action types
export type BrainAction =
  | NavigateAction
  | FilterAction
  | SearchAction
  | SelectAction
  | ResearchAction
  | EmailAction
  | ExplainAction;

// Result of parsing an action with confidence
export interface ParseResult {
  action?: BrainAction;
  confidence: number; // 0-1, how confident in the parsed action
}

// Full brain response structure
export interface BrainResponse {
  response: string; // The AI's text response
  action?: BrainAction;
  confidence?: number; // 0-1, how confident in the parsed action
  conversationId?: string; // For conversation continuity
  suggestions?: string[];
  metadata?: {
    provider?: string;
    fallbackUsed?: boolean;
  };
}

/**
 * RailwayAIAction - Type alias for GTM-YardFlow frontend compatibility
 * The frontend uses this name for type-safe action handling
 */
export type RailwayAIAction = BrainAction;

/**
 * RailwayAIResponse - Full response type for GTM-YardFlow integration
 */
export interface RailwayAIResponse extends BrainResponse {
  // Alias for frontend compatibility
}
