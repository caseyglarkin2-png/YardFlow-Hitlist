/**
 * API Route: Conversations List
 * GET /api/ai/conversations - List user's conversations
 * POST /api/ai/conversations - Create new conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { logger } from '@/lib/logger';
import {
  getUserConversations,
  generateConversationId,
  saveConversation,
} from '@/lib/ai/conversation-store';
import type { ConversationMessage } from '@/lib/ai/conversation-store';

export const dynamic = 'force-dynamic';

/**
 * GET - List user's conversations
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationIds = await getUserConversations(authResult.userId);

    logger.info('Listed conversations', {
      userId: authResult.userId,
      count: conversationIds.length,
    });

    return NextResponse.json({
      conversations: conversationIds,
      count: conversationIds.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to list conversations', { error: errorMessage });
    return NextResponse.json(
      { error: 'Failed to list conversations', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new conversation
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = generateConversationId();
    const now = Date.now();

    // Create empty conversation
    await saveConversation(conversationId, authResult.userId, {
      id: conversationId,
      userId: authResult.userId,
      messages: [] as ConversationMessage[],
      createdAt: now,
      lastMessageAt: now,
    });

    logger.info('Created conversation', {
      userId: authResult.userId,
      conversationId,
    });

    return NextResponse.json({
      conversationId,
      createdAt: new Date(now).toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to create conversation', { error: errorMessage });
    return NextResponse.json(
      { error: 'Failed to create conversation', details: errorMessage },
      { status: 500 }
    );
  }
}
