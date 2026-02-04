/**
 * Integration Tests for Sprint 31 Brain Enhancements
 *
 * Tests the full flow from chat → action parsing → conversation memory.
 * Uses mocks for external services but tests real code integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    target_accounts: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    people: {
      findUnique: vi.fn(),
    },
    company_dossiers: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/lib/queue/client', () => {
  const mockRedis = {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    sadd: vi.fn(),
    srem: vi.fn(),
    smembers: vi.fn(),
    expire: vi.fn(),
    exists: vi.fn(),
    incr: vi.fn(),
    ttl: vi.fn(),
    multi: vi.fn(() => ({
      incr: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    })),
  };
  return {
    getRedisConnection: vi.fn(() => mockRedis),
  };
});

vi.mock('@/lib/ai/provider', () => ({
  generateContent: vi.fn().mockResolvedValue({
    content: "I'll show you the Tier 1 prospects now.",
    provider: 'gemini',
    fallbackUsed: false,
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks
import { parseActionFromResponse, parseActionWithConfidence } from '@/lib/ai/action-parser';
import {
  generateConversationId,
  getConversation,
  saveConversation,
  addMessage,
  getMessagesForContext,
} from '@/lib/ai/conversation-store';
import { getRedisConnection } from '@/lib/queue/client';
import type { FilterAction, NavigateAction } from '@/types/brain-actions';

describe('Sprint 31 Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Full Chat → Action Flow', () => {
    it('parses navigation action from AI response', () => {
      const aiResponse = "Let me show you the dashboard now.";
      const action = parseActionFromResponse(aiResponse);

      expect(action).toBeDefined();
      expect(action?.type).toBe('navigate');
      expect((action as NavigateAction).destination).toBe('dashboard');
    });

    it('parses filter action with tier and email criteria', () => {
      const aiResponse = "I'll filter for Tier 1 prospects with email.";
      const action = parseActionFromResponse(aiResponse);

      expect(action).toBeDefined();
      expect(action?.type).toBe('filter');
      expect((action as FilterAction).tier).toBe('Tier 1');
      expect((action as FilterAction).hasEmail).toBe(true);
    });

    it('returns confidence score with action', () => {
      const aiResponse = "Let me show you the Tier 2 accounts.";
      const result = parseActionWithConfidence(aiResponse);

      expect(result.action).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('handles non-actionable responses', () => {
      const aiResponse = 'The ICP score indicates a good fit for yard management solutions.';
      const action = parseActionFromResponse(aiResponse);

      expect(action).toBeUndefined();
    });
  });

  describe('Conversation Memory Flow', () => {
    it('generates unique conversation IDs', () => {
      const id1 = generateConversationId();
      const id2 = generateConversationId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1.startsWith('conv_')).toBe(true);
    });

    it('saves and retrieves conversations', async () => {
      const mockRedis = getRedisConnection();
      const conversationId = 'conv_test123';
      const userId = 'user_abc';

      // Mock Redis get to return a conversation
      const mockConversation = {
        id: conversationId,
        userId,
        messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }],
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      };

      vi.mocked(mockRedis.get).mockResolvedValue(JSON.stringify(mockConversation));

      const retrieved = await getConversation(conversationId, userId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(conversationId);
      expect(retrieved?.messages).toHaveLength(1);
    });

    it('adds messages to existing conversation', async () => {
      const mockRedis = getRedisConnection();
      const conversationId = 'conv_test456';
      const userId = 'user_abc';

      // Mock existing conversation
      const existingConvo = {
        id: conversationId,
        userId,
        messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }],
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      };

      vi.mocked(mockRedis.get).mockResolvedValue(JSON.stringify(existingConvo));
      vi.mocked(mockRedis.setex).mockResolvedValue('OK');
      vi.mocked(mockRedis.sadd).mockResolvedValue(1);
      vi.mocked(mockRedis.expire).mockResolvedValue(1);

      const newMessage = {
        role: 'assistant' as const,
        content: "I'll help you with that.",
        timestamp: Date.now(),
      };

      const updated = await addMessage(conversationId, userId, newMessage);

      expect(updated.messages).toHaveLength(2);
      expect(updated.messages[1].content).toBe("I'll help you with that.");
    });

    it('formats messages for AI context', async () => {
      const conversation = {
        id: 'conv_test',
        userId: 'user_abc',
        messages: [
          { role: 'user' as const, content: 'Message 1', timestamp: 1 },
          { role: 'assistant' as const, content: 'Response 1', timestamp: 2 },
          { role: 'user' as const, content: 'Message 2', timestamp: 3 },
          { role: 'assistant' as const, content: 'Response 2', timestamp: 4 },
          { role: 'user' as const, content: 'Message 3', timestamp: 5 },
          { role: 'assistant' as const, content: 'Response 3', timestamp: 6 },
          { role: 'user' as const, content: 'Message 4', timestamp: 7 },
          { role: 'assistant' as const, content: 'Response 4', timestamp: 8 },
        ],
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      };

      // Get last 6 messages for context
      const contextMessages = getMessagesForContext(conversation, 6);

      expect(contextMessages).toHaveLength(6);
      // Last 6 messages are: Message 2, Response 2, Message 3, Response 3, Message 4, Response 4
      expect(contextMessages[0].content).toBe('Message 2');
      expect(contextMessages[5].content).toBe('Response 4');
    });

    it('prevents unauthorized conversation access', async () => {
      const mockRedis = getRedisConnection();

      // Conversation owned by different user
      const otherUserConvo = {
        id: 'conv_other',
        userId: 'user_other',
        messages: [],
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      };

      vi.mocked(mockRedis.get).mockResolvedValue(JSON.stringify(otherUserConvo));

      // Try to access with different userId
      const result = await getConversation('conv_other', 'user_attacker');

      expect(result).toBeNull(); // Should be denied
    });
  });

  describe('Action + Conversation Combined', () => {
    it('can parse action and store in conversation', async () => {
      const mockRedis = getRedisConnection();
      const aiResponse = "Let me show you the sequences now.";
      const conversationId = generateConversationId();
      const userId = 'user_test';

      // Parse the action
      const parseResult = parseActionWithConfidence(aiResponse);
      expect(parseResult.action?.type).toBe('navigate');

      // Prepare conversation message with action
      const assistantMessage = {
        role: 'assistant' as const,
        content: aiResponse,
        timestamp: Date.now(),
        action: parseResult.action,
      };

      // Mock empty existing conversation
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(mockRedis.setex).mockResolvedValue('OK');
      vi.mocked(mockRedis.sadd).mockResolvedValue(1);
      vi.mocked(mockRedis.expire).mockResolvedValue(1);

      // Add message
      const conversation = await addMessage(conversationId, userId, assistantMessage);

      expect(conversation.messages).toHaveLength(1);
      expect(conversation.messages[0].action?.type).toBe('navigate');
    });
  });

  describe('Error Resilience', () => {
    it('handles Redis connection failures gracefully', async () => {
      const mockRedis = getRedisConnection();
      vi.mocked(mockRedis.get).mockRejectedValue(new Error('Connection refused'));

      const result = await getConversation('conv_test', 'user_test');
      expect(result).toBeNull(); // Should return null, not throw
    });

    it('handles malformed conversation data', async () => {
      const mockRedis = getRedisConnection();
      vi.mocked(mockRedis.get).mockResolvedValue('not valid json');

      const result = await getConversation('conv_test', 'user_test');
      expect(result).toBeNull();
    });
  });
});
