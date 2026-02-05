/**
 * API Route: Single Conversation
 * GET /api/ai/conversations/[id] - Get conversation details
 * DELETE /api/ai/conversations/[id] - Delete conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { logger } from '@/lib/logger';
import {
  getConversation,
  clearConversation,
  getConversationSummary,
} from '@/lib/ai/conversation-store';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Get conversation details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await params;

    const conversation = await getConversation(conversationId, authResult.userId);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const summary = getConversationSummary(conversation);

    logger.info('Retrieved conversation', {
      userId: authResult.userId,
      conversationId,
      messageCount: conversation.messages.length,
    });

    return NextResponse.json({
      ...conversation,
      summary,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    captureRouteError(error, {
      route: '/api/ai/conversations/[id]',
      method: 'GET',
      userId: authResult?.userId,
    });
    logger.error('Failed to get conversation', { error: errorMessage });
    return NextResponse.json(
      { error: 'Failed to get conversation', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete conversation
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await params;

    const deleted = await clearConversation(conversationId, authResult.userId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Conversation not found or unauthorized' },
        { status: 404 }
      );
    }

    logger.info('Deleted conversation', {
      userId: authResult.userId,
      conversationId,
    });

    return NextResponse.json({ success: true, conversationId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    captureRouteError(error, {
      route: '/api/ai/conversations/[id]',
      method: 'DELETE',
      userId: authResult?.userId,
    });
    logger.error('Failed to delete conversation', { error: errorMessage });
    return NextResponse.json(
      { error: 'Failed to delete conversation', details: errorMessage },
      { status: 500 }
    );
  }
}
