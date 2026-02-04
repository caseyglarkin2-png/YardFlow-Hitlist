/**
 * Conversation Store Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateConversationId,
  getConversation,
  saveConversation,
  addMessage,
  clearConversation,
  getUserConversations,
  getConversationSummary,
  getMessagesForContext,
} from '@/lib/ai/conversation-store';
import type { Conversation, ConversationMessage } from '@/lib/ai/conversation-store';

// Mock Redis
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  sadd: vi.fn(),
  srem: vi.fn(),
  smembers: vi.fn(),
  expire: vi.fn(),
  exists: vi.fn(),
};

vi.mock('@/lib/queue/client', () => ({
  getRedisConnection: () => mockRedis,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ConversationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('generateConversationId', () => {
    it('generates unique IDs with conv_ prefix', () => {
      const id1 = generateConversationId();
      const id2 = generateConversationId();

      expect(id1).toMatch(/^conv_[a-f0-9-]+$/);
      expect(id2).toMatch(/^conv_[a-f0-9-]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('getConversation', () => {
    it('returns null for unknown ID', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await getConversation('conv-unknown', 'user-1');

      expect(result).toBeNull();
    });

    it('returns conversation for known ID with matching userId', async () => {
      const conversation: Conversation = {
        id: 'conv-1',
        userId: 'user-1',
        messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }],
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(conversation));

      const result = await getConversation('conv-1', 'user-1');

      expect(result).toEqual(conversation);
    });

    it('returns null for mismatched userId (security)', async () => {
      const conversation: Conversation = {
        id: 'conv-1',
        userId: 'user-1',
        messages: [],
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(conversation));

      const result = await getConversation('conv-1', 'user-2');

      expect(result).toBeNull();
    });
  });

  describe('saveConversation', () => {
    it('saves conversation to Redis with TTL', async () => {
      const conversation: Conversation = {
        id: 'conv-1',
        userId: 'user-1',
        messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }],
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      };

      await saveConversation(conversation);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'conversation:conv-1',
        86400, // 24 hours
        expect.any(String)
      );
      expect(mockRedis.sadd).toHaveBeenCalledWith('user:user-1:conversations', 'conv-1');
    });

    it('trims messages to MAX_MESSAGES limit', async () => {
      const messages: ConversationMessage[] = Array.from({ length: 25 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: Date.now() + i,
      }));

      const conversation: Conversation = {
        id: 'conv-1',
        userId: 'user-1',
        messages,
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      };

      await saveConversation(conversation);

      // Verify the saved data has trimmed messages
      const savedData = JSON.parse(mockRedis.setex.mock.calls[0][2]) as Conversation;
      expect(savedData.messages.length).toBeLessThanOrEqual(20);
    });
  });

  describe('addMessage', () => {
    it('creates new conversation on first message', async () => {
      mockRedis.get.mockResolvedValue(null);

      const message: ConversationMessage = {
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      };

      const conv = await addMessage('conv-new', 'user-1', message);

      expect(conv.id).toBe('conv-new');
      expect(conv.userId).toBe('user-1');
      expect(conv.messages).toHaveLength(1);
      expect(conv.messages[0].content).toBe('Hello');
    });

    it('appends to existing conversation', async () => {
      const existingConv: Conversation = {
        id: 'conv-1',
        userId: 'user-1',
        messages: [{ role: 'user', content: 'First', timestamp: Date.now() }],
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(existingConv));

      const message: ConversationMessage = {
        role: 'assistant',
        content: 'Response',
        timestamp: Date.now(),
      };

      const conv = await addMessage('conv-1', 'user-1', message);

      expect(conv.messages).toHaveLength(2);
      expect(conv.messages[1].content).toBe('Response');
    });

    it('updates lastMessageAt timestamp', async () => {
      const oldTime = Date.now() - 10000;
      const existingConv: Conversation = {
        id: 'conv-1',
        userId: 'user-1',
        messages: [],
        createdAt: oldTime,
        lastMessageAt: oldTime,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(existingConv));

      const conv = await addMessage('conv-1', 'user-1', {
        role: 'user',
        content: 'New message',
        timestamp: Date.now(),
      });

      expect(conv.lastMessageAt).toBeGreaterThan(oldTime);
    });
  });

  describe('clearConversation', () => {
    it('clears conversation from Redis', async () => {
      const existingConv: Conversation = {
        id: 'conv-1',
        userId: 'user-1',
        messages: [],
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(existingConv));

      const result = await clearConversation('conv-1', 'user-1');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('conversation:conv-1');
      expect(mockRedis.srem).toHaveBeenCalledWith('user:user-1:conversations', 'conv-1');
    });

    it('returns false for non-existent conversation', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await clearConversation('conv-unknown', 'user-1');

      expect(result).toBe(false);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('returns false when userId does not match (security)', async () => {
      const existingConv: Conversation = {
        id: 'conv-1',
        userId: 'user-1',
        messages: [],
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(existingConv));

      const result = await clearConversation('conv-1', 'user-2');

      expect(result).toBe(false);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('getUserConversations', () => {
    it('returns empty array for user with no conversations', async () => {
      mockRedis.smembers.mockResolvedValue([]);

      const result = await getUserConversations('user-new');

      expect(result).toEqual([]);
    });

    it('returns conversation IDs for user', async () => {
      mockRedis.smembers.mockResolvedValue(['conv-1', 'conv-2']);
      mockRedis.exists.mockResolvedValue(1);

      const result = await getUserConversations('user-1');

      expect(result).toContain('conv-1');
      expect(result).toContain('conv-2');
    });

    it('prunes stale conversation references', async () => {
      mockRedis.smembers.mockResolvedValue(['conv-1', 'conv-stale']);
      mockRedis.exists
        .mockResolvedValueOnce(1) // conv-1 exists
        .mockResolvedValueOnce(0); // conv-stale does not exist

      const result = await getUserConversations('user-1');

      expect(result).toContain('conv-1');
      expect(result).not.toContain('conv-stale');
      expect(mockRedis.srem).toHaveBeenCalledWith('user:user-1:conversations', 'conv-stale');
    });
  });

  describe('getConversationSummary', () => {
    it('returns "Empty conversation" for no messages', () => {
      const conv: Conversation = {
        id: 'conv-1',
        userId: 'user-1',
        messages: [],
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      };

      expect(getConversationSummary(conv)).toBe('Empty conversation');
    });

    it('uses first user message as topic', () => {
      const conv: Conversation = {
        id: 'conv-1',
        userId: 'user-1',
        messages: [
          { role: 'user', content: 'Tell me about tier 1 prospects', timestamp: Date.now() },
          { role: 'assistant', content: 'Sure!', timestamp: Date.now() },
        ],
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      };

      const summary = getConversationSummary(conv);
      expect(summary).toContain('Tell me about tier 1 prospects');
      expect(summary).toContain('2 messages');
    });

    it('truncates long topics', () => {
      const longMessage = 'A'.repeat(100);
      const conv: Conversation = {
        id: 'conv-1',
        userId: 'user-1',
        messages: [{ role: 'user', content: longMessage, timestamp: Date.now() }],
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      };

      const summary = getConversationSummary(conv);
      expect(summary.length).toBeLessThan(100);
      expect(summary).toContain('...');
    });
  });

  describe('getMessagesForContext', () => {
    it('returns last N messages', () => {
      const messages: ConversationMessage[] = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: Date.now() + i,
      }));

      const conv: Conversation = {
        id: 'conv-1',
        userId: 'user-1',
        messages,
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      };

      const context = getMessagesForContext(conv, 4);

      expect(context).toHaveLength(4);
      expect(context[0].content).toBe('Message 6');
      expect(context[3].content).toBe('Message 9');
    });

    it('returns all messages if fewer than limit', () => {
      const conv: Conversation = {
        id: 'conv-1',
        userId: 'user-1',
        messages: [
          { role: 'user', content: 'Hello', timestamp: Date.now() },
          { role: 'assistant', content: 'Hi!', timestamp: Date.now() },
        ],
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      };

      const context = getMessagesForContext(conv, 6);

      expect(context).toHaveLength(2);
    });
  });
});
