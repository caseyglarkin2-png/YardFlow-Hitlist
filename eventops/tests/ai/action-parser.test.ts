/**
 * Action Parser Unit Tests
 *
 * Tests for parsing Brain actions from AI responses
 */

import { describe, it, expect } from 'vitest';
import {
  parseActionFromResponse,
  parseActionWithConfidence,
  hasActionableContent,
} from '@/lib/ai/action-parser';
import type {
  FilterAction,
  NavigateAction,
  SearchAction,
  ResearchAction,
} from '@/types/brain-actions';

describe('parseActionFromResponse', () => {
  describe('navigation', () => {
    it('parses "go to prospects"', () => {
      const action = parseActionFromResponse("I'll go to prospects to show you the list");
      expect(action).toEqual({ type: 'navigate', tab: 'prospects', destination: 'prospects' });
    });

    it('parses "show me the dashboard"', () => {
      const action = parseActionFromResponse('Let me show you the dashboard');
      expect(action).toEqual({ type: 'navigate', tab: 'dashboard', destination: 'dashboard' });
    });

    it('parses "navigate to accounts"', () => {
      const action = parseActionFromResponse("I'll navigate to accounts now");
      expect(action).toEqual({ type: 'navigate', tab: 'accounts', destination: 'accounts' });
    });

    it('parses "open sequences"', () => {
      const action = parseActionFromResponse('Let me open sequences for you');
      expect(action).toEqual({ type: 'navigate', tab: 'sequences', destination: 'sequences' });
    });

    it('handles destination aliases', () => {
      const action = parseActionFromResponse("I'll go to companies") as NavigateAction;
      expect(action?.tab).toBe('accounts');
      expect(action?.destination).toBe('accounts');
    });
  });

  describe('filtering', () => {
    it('parses "show tier 1 prospects"', () => {
      const action = parseActionFromResponse("I'll show tier 1 prospects") as FilterAction;
      expect(action?.type).toBe('filter');
      expect(action?.tier).toBe('Tier 1');
    });

    it('parses "filter tier 2"', () => {
      const action = parseActionFromResponse('Let me filter tier 2 for you') as FilterAction;
      expect(action?.type).toBe('filter');
      expect(action?.tier).toBe('Tier 2');
    });

    it('parses "filter prospects with email"', () => {
      const action = parseActionFromResponse(
        "I'll filter prospects with email addresses"
      ) as FilterAction;
      expect(action?.type).toBe('filter');
      expect(action?.hasEmail).toBe(true);
    });

    it('parses "find prospects without email"', () => {
      const action = parseActionFromResponse('Let me find prospects without email') as FilterAction;
      expect(action?.type).toBe('filter');
      expect(action?.hasEmail).toBe(false);
    });

    it('parses "show tier 2 with no email"', () => {
      const action = parseActionFromResponse(
        "I'll show tier 2 prospects with no email"
      ) as FilterAction;
      expect(action?.type).toBe('filter');
      expect(action?.tier).toBe('Tier 2');
      expect(action?.hasEmail).toBe(false);
    });
  });

  describe('search', () => {
    it('parses "search for Acme Corp"', () => {
      const action = parseActionFromResponse(
        'I\'ll search for "Acme Corp" in your prospects'
      ) as SearchAction;
      expect(action?.type).toBe('search');
      expect(action?.query).toBe('Acme Corp');
    });

    it('parses "find XYZ Logistics"', () => {
      const action = parseActionFromResponse(
        'Let me find XYZ Logistics in the system'
      ) as SearchAction;
      expect(action?.type).toBe('search');
      expect(action?.query).toContain('XYZ Logistics');
    });

    it('handles unquoted search terms', () => {
      const action = parseActionFromResponse(
        "I'm searching for United Trucking now"
      ) as SearchAction;
      expect(action?.type).toBe('search');
      expect(action?.query).toContain('United Trucking');
    });
  });

  describe('research', () => {
    it('parses "research company XYZ Logistics"', () => {
      const action = parseActionFromResponse(
        'Let me research company "XYZ Logistics" for you'
      ) as ResearchAction;
      expect(action?.type).toBe('research');
      expect(action?.companyName).toBe('XYZ Logistics');
    });

    it('parses "analyze Acme Corp"', () => {
      const action = parseActionFromResponse(
        "I'll analyze Acme Corp to find more information"
      ) as ResearchAction;
      expect(action?.type).toBe('research');
      expect(action?.companyName).toContain('Acme Corp');
    });
  });

  describe('email', () => {
    it('parses "send email"', () => {
      const action = parseActionFromResponse("I'll help you send an email to this contact");
      expect(action?.type).toBe('email');
    });

    it('parses "compose email"', () => {
      const action = parseActionFromResponse('Let me compose an email for you');
      expect(action?.type).toBe('email');
    });
  });

  describe('no action', () => {
    it('returns undefined for explanatory text', () => {
      const action = parseActionFromResponse(
        'The tier system works by categorizing prospects based on their ICP score.'
      );
      expect(action).toBeUndefined();
    });

    it('returns undefined for questions', () => {
      const action = parseActionFromResponse(
        'Would you like me to explain how the filtering works?'
      );
      expect(action).toBeUndefined();
    });

    it('returns undefined for general responses', () => {
      const action = parseActionFromResponse(
        'Sure, I can help you with that. What would you like to know?'
      );
      expect(action).toBeUndefined();
    });
  });
});

describe('parseActionWithConfidence', () => {
  it('returns 0 confidence for no action', () => {
    const result = parseActionWithConfidence('Just explaining something here.');
    expect(result.confidence).toBe(0);
    expect(result.action).toBeUndefined();
  });

  it('returns higher confidence for explicit intent', () => {
    const withIntent = parseActionWithConfidence("I'll go to prospects now");
    const withoutIntent = parseActionWithConfidence('Go to prospects');

    expect(withIntent.confidence).toBeGreaterThan(withoutIntent.confidence);
  });

  it('returns higher confidence for navigation (unambiguous)', () => {
    const result = parseActionWithConfidence("I'll go to dashboard");
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('returns higher confidence when tier is specified', () => {
    const withTier = parseActionWithConfidence("I'll filter tier 1 prospects");
    const withoutTier = parseActionWithConfidence("I'll filter prospects with email");

    expect(withTier.confidence).toBeGreaterThan(withoutTier.confidence);
  });

  it('caps confidence at 1.0', () => {
    const result = parseActionWithConfidence("I'll definitely navigate to the dashboard right now");
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

describe('hasActionableContent', () => {
  it('returns true for actionable responses', () => {
    expect(hasActionableContent("I'll go to prospects")).toBe(true);
    expect(hasActionableContent('Let me filter tier 1')).toBe(true);
    expect(hasActionableContent("I'll search for Acme")).toBe(true);
  });

  it('returns false for non-actionable responses', () => {
    expect(hasActionableContent('Here is some information about tiers.')).toBe(false);
    expect(hasActionableContent('The ICP score measures fit.')).toBe(false);
  });
});
