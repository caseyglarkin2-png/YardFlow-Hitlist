/**
 * Conversation Store
 *
 * Redis-backed storage for Brain conversation history.
 * Enables multi-turn conversations with context persistence.
 *
 * Security: All functions verify userId ownership to prevent data leakage.
 * Lazy Init: Redis connection retrieved inside functions, not at module scope.
 */

import { randomUUID } from 'crypto';
import { getRedisConnection } from '@/lib/queue/client';
import { logger } from '@/lib/logger';
import type { BrainAction } from '@/types/brain-actions';

// Configuration
const CONVERSATION_TTL = 60 * 60 * 24; // 24 hours
const MAX_MESSAGES = 20; // Trim to last N messages

/**
 * A single message in a conversation
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  action?: BrainAction;
}

/**
 * Full conversation with metadata
 */
export interface Conversation {
  id: string;
  userId: string;
  messages: ConversationMessage[];
  createdAt: number;
  lastMessageAt: number;
}

/**
 * Generate a unique conversation ID
 */
export function generateConversationId(): string {
  return `conv_${randomUUID()}`;
}

/**
 * Get Redis key for a conversation
 */
function getConversationKey(conversationId: string): string {
  return `conversation:${conversationId}`;
}

/**
 * Get Redis key for user's conversation list
 */
function getUserConversationsKey(userId: string): string {
  return `user:${userId}:conversations`;
}

/**
 * Get a conversation by ID
 * Only returns if userId matches (security)
 */
export async function getConversation(
  conversationId: string,
  userId: string
): Promise<Conversation | null> {
  const redis = getRedisConnection();

  try {
    const data = await redis.get(getConversationKey(conversationId));

    if (!data) {
      return null;
    }

    const conversation = JSON.parse(data) as Conversation;

    // Security: Verify ownership
    if (conversation.userId !== userId) {
      logger.warn('Conversation access denied - userId mismatch', {
        conversationId,
        requestedBy: userId,
      });
      return null;
    }

    return conversation;
  } catch (error) {
    logger.error('Failed to get conversation', {
      conversationId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return null;
  }
}

/**
 * Save a conversation to Redis
 */
export async function saveConversation(conversation: Conversation): Promise<void> {
  const redis = getRedisConnection();

  try {
    // Trim messages if over limit
    if (conversation.messages.length > MAX_MESSAGES) {
      conversation.messages = conversation.messages.slice(-MAX_MESSAGES);
    }

    await redis.setex(
      getConversationKey(conversation.id),
      CONVERSATION_TTL,
      JSON.stringify(conversation)
    );

    // Track in user's conversation list
    await redis.sadd(getUserConversationsKey(conversation.userId), conversation.id);
    await redis.expire(getUserConversationsKey(conversation.userId), CONVERSATION_TTL);
  } catch (error) {
    logger.error('Failed to save conversation', {
      conversationId: conversation.id,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    throw error;
  }
}

/**
 * Add a message to a conversation
 * Creates new conversation if it doesn't exist
 */
export async function addMessage(
  conversationId: string,
  userId: string,
  message: ConversationMessage
): Promise<Conversation> {
  // Try to get existing conversation
  let conversation = await getConversation(conversationId, userId);

  if (!conversation) {
    // Create new conversation
    conversation = {
      id: conversationId,
      userId,
      messages: [],
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
    };
  }

  // Add message
  conversation.messages.push(message);
  conversation.lastMessageAt = Date.now();

  // Save
  await saveConversation(conversation);

  return conversation;
}

/**
 * Clear a conversation
 * Only clears if userId matches (security)
 */
export async function clearConversation(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const redis = getRedisConnection();

  try {
    // Verify ownership first
    const existing = await getConversation(conversationId, userId);
    if (!existing) {
      // Either doesn't exist or not owned by this user
      return false;
    }

    await redis.del(getConversationKey(conversationId));
    await redis.srem(getUserConversationsKey(userId), conversationId);

    logger.info('Conversation cleared', { conversationId, userId });
    return true;
  } catch (error) {
    logger.error('Failed to clear conversation', {
      conversationId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return false;
  }
}

/**
 * Get all conversation IDs for a user
 */
export async function getUserConversations(userId: string): Promise<string[]> {
  const redis = getRedisConnection();

  try {
    const conversationIds = await redis.smembers(getUserConversationsKey(userId));

    // Prune any that no longer exist
    const validIds: string[] = [];
    for (const id of conversationIds) {
      const exists = await redis.exists(getConversationKey(id));
      if (exists) {
        validIds.push(id);
      } else {
        // Remove stale reference
        await redis.srem(getUserConversationsKey(userId), id);
      }
    }

    return validIds;
  } catch (error) {
    logger.error('Failed to get user conversations', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return [];
  }
}

/**
 * Get conversation summary for display
 */
export function getConversationSummary(conversation: Conversation): string {
  if (conversation.messages.length === 0) {
    return 'Empty conversation';
  }

  // Get first user message as topic
  const firstUserMessage = conversation.messages.find((m) => m.role === 'user');
  const topic = firstUserMessage?.content.slice(0, 50) || 'Conversation';

  // Count actions taken
  const actionCount = conversation.messages.filter((m) => m.action).length;

  return `${topic}${topic.length >= 50 ? '...' : ''} (${conversation.messages.length} messages, ${actionCount} actions)`;
}

/**
 * Get messages formatted for AI context
 * Returns last N messages in a format suitable for conversation history
 */
export function getMessagesForContext(
  conversation: Conversation,
  limit: number = 6
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return conversation.messages.slice(-limit).map((m) => ({
    role: m.role,
    content: m.content,
  }));
}
