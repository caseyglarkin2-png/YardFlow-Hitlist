/**
 * API Route: AI Chat (Brain Feature)
 * POST /api/ai/chat
 *
 * General-purpose AI chat endpoint for the Brain feature.
 * Supports context-aware conversations about accounts, people, and platform features.
 * Uses unified AI provider with automatic Gemini → OpenAI fallback.
 * Returns parsed actions for frontend navigation/filtering.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authServiceOrSession } from '@/lib/auth-service';
import { logger } from '@/lib/logger';
import { generateContent } from '@/lib/ai/provider';
import { prisma } from '@/lib/db';
import { parseActionWithConfidence } from '@/lib/ai/action-parser';
import {
  getConversation,
  addMessage,
  generateConversationId,
  getMessagesForContext,
} from '@/lib/ai/conversation-store';
import type { BrainResponse } from '@/types/brain-actions';

export const dynamic = 'force-dynamic';

const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message too long'),
  conversationId: z.string().optional(), // For conversation continuity
  context: z
    .object({
      accountId: z.string().optional(),
      personId: z.string().optional(),
      pageContext: z.string().optional(), // e.g., 'dashboard', 'prospects', 'sequences'
      conversationHistory: z
        .array(
          z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string(),
          })
        )
        .optional(),
    })
    .optional(),
});

type ChatRequest = z.infer<typeof ChatRequestSchema>;

/**
 * Build system prompt based on context
 */
function buildSystemPrompt(context?: ChatRequest['context']): string {
  let systemPrompt = `You are the YardFlow Brain, an AI assistant for the YardFlow Hitlist platform.
You help users with:
- Understanding and managing target accounts for Manifest 2026
- Researching companies and contacts
- Creating effective outreach sequences and email content
- Analyzing ICP scores and prioritizing prospects
- ROI calculations for yard management solutions

Be concise, actionable, and focused on sales enablement. You have access to account and contact data.
Always suggest next steps when appropriate.

NAVIGATION ACTIONS:
When the user wants to navigate, use phrases like:
- "I'll take you to the [destination]" (dashboard, prospects, sequences, accounts, import)
- "Let me show you the [page]"
- "Go to [page]"

FILTER ACTIONS:
When filtering prospects, use phrases like:
- "I'll filter by Tier [1/2/3]"
- "Showing prospects with/without email"

SEARCH ACTIONS:
When searching, use phrases like:
- "I'll search for [query]"
- "Looking for [term]"

RESEARCH ACTIONS:
When researching a company, use phrases like:
- "I'll research [company name]"
- "Let me analyze [company]"`;

  if (context?.pageContext) {
    const contextHints: Record<string, string> = {
      dashboard:
        'The user is on the dashboard. Help them understand metrics and prioritize actions.',
      prospects:
        'The user is viewing prospects. Help with filtering, prioritization, and outreach strategies.',
      sequences:
        'The user is managing email sequences. Help with timing, content, and optimization.',
      accounts:
        'The user is viewing account details. Help with research, scoring, and engagement strategies.',
      settings: 'The user is in settings. Help with configuration and best practices.',
    };
    systemPrompt += `\n\nContext: ${contextHints[context.pageContext] || 'General platform navigation.'}`;
  }

  return systemPrompt;
}

/**
 * Fetch context data for enriched responses
 */
async function fetchContextData(context?: ChatRequest['context']): Promise<string> {
  const contextParts: string[] = [];

  if (context?.accountId) {
    try {
      const account = await prisma.target_accounts.findUnique({
        where: { id: context.accountId },
        include: {
          company_dossiers: true,
          people: { take: 5, orderBy: { createdAt: 'desc' } },
        },
      });

      if (account) {
        contextParts.push(`
Current Account: ${account.name}
- Industry: ${account.industry || 'Unknown'}
- ICP Score: ${account.icpScore || 0}
- Website: ${account.website || 'N/A'}
- Contacts: ${account.people.length}
${account.company_dossiers?.companyOverview ? `- Overview: ${account.company_dossiers.companyOverview}` : ''}`);
      }
    } catch (error) {
      logger.warn('Failed to fetch account context', { accountId: context.accountId, error });
    }
  }

  if (context?.personId) {
    try {
      const person = await prisma.people.findUnique({
        where: { id: context.personId },
        include: { target_accounts: true },
      });

      if (person) {
        contextParts.push(`
Current Contact: ${person.name}
- Title: ${person.title || 'Unknown'}
- Company: ${person.target_accounts?.name || 'Unknown'}
- Email: ${person.email || 'N/A'}
- Personas: ${
          [
            person.isExecOps && 'ExecOps',
            person.isOps && 'Ops',
            person.isProc && 'Procurement',
            person.isSales && 'Sales',
          ]
            .filter(Boolean)
            .join(', ') || 'None'
        }`);
      }
    } catch (error) {
      logger.warn('Failed to fetch person context', { personId: context.personId, error });
    }
  }

  return contextParts.join('\n');
}

/**
 * Build conversation messages for the AI
 */
function buildMessages(
  systemPrompt: string,
  userMessage: string,
  contextData: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): string {
  let fullPrompt = systemPrompt;

  if (contextData) {
    fullPrompt += `\n\n--- CONTEXT DATA ---\n${contextData}\n--- END CONTEXT ---`;
  }

  if (conversationHistory && conversationHistory.length > 0) {
    fullPrompt += '\n\n--- CONVERSATION HISTORY ---';
    for (const msg of conversationHistory.slice(-6)) {
      // Last 6 messages for context
      fullPrompt += `\n${msg.role.toUpperCase()}: ${msg.content}`;
    }
    fullPrompt += '\n--- END HISTORY ---';
  }

  fullPrompt += `\n\nUSER: ${userMessage}\n\nASSISTANT:`;

  return fullPrompt;
}

/**
 * Extract suggested actions from AI response
 */
function extractSuggestions(response: string): string[] {
  const suggestions: string[] = [];

  // Look for bullet points or numbered lists
  const bulletMatches = response.match(/[-•]\s+(.+)/g);
  if (bulletMatches) {
    suggestions.push(...bulletMatches.slice(0, 3).map((m) => m.replace(/^[-•]\s+/, '')));
  }

  // Look for "you should" or "I recommend" phrases
  const actionMatches = response.match(/(you should|I recommend|consider|try)\s+([^.!?]+)/gi);
  if (actionMatches && suggestions.length < 3) {
    suggestions.push(...actionMatches.slice(0, 3 - suggestions.length));
  }

  return suggestions.slice(0, 3);
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.userId;
    const body = await request.json();
    const validationResult = ChatRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { message, conversationId: providedConversationId, context } = validationResult.data;

    // Get or create conversation
    const conversationId = providedConversationId || generateConversationId();
    let conversationHistory = context?.conversationHistory;

    // If conversationId provided, try to load from store
    if (providedConversationId) {
      const storedConvo = await getConversation(providedConversationId, userId);
      if (storedConvo) {
        conversationHistory = getMessagesForContext(storedConvo, 6);
      }
    }

    logger.info('AI Chat request', {
      userId,
      conversationId,
      isNewConversation: !providedConversationId,
      hasAccountContext: !!context?.accountId,
      hasPersonContext: !!context?.personId,
      pageContext: context?.pageContext,
      messageLength: message.length,
    });

    // Build prompts
    const systemPrompt = buildSystemPrompt(context);
    const contextData = await fetchContextData(context);
    const fullPrompt = buildMessages(systemPrompt, message, contextData, conversationHistory);

    // Generate response
    const result = await generateContent(fullPrompt, {
      temperature: 0.7,
      maxTokens: 800,
    });

    // Parse action from response
    const parseResult = parseActionWithConfidence(result.content);

    // Extract suggestions from response
    const suggestions = extractSuggestions(result.content);

    // Save to conversation store
    try {
      await addMessage(conversationId, userId, {
        role: 'user',
        content: message,
        timestamp: Date.now(),
      });
      await addMessage(conversationId, userId, {
        role: 'assistant',
        content: result.content,
        timestamp: Date.now(),
        action: parseResult.action,
      });
    } catch (storeError) {
      // Non-fatal: log but continue
      logger.warn('Failed to save conversation', { conversationId, error: storeError });
    }

    logger.info('AI Chat response generated', {
      userId,
      conversationId,
      provider: result.provider,
      fallbackUsed: result.fallbackUsed,
      responseLength: result.content.length,
      suggestionsCount: suggestions.length,
      hasAction: !!parseResult.action,
      actionType: parseResult.action?.type,
      actionConfidence: parseResult.confidence,
    });

    const response: BrainResponse = {
      response: result.content,
      action: parseResult.action,
      confidence: parseResult.confidence,
      conversationId,
      suggestions,
      metadata: {
        provider: result.provider,
        fallbackUsed: result.fallbackUsed,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('AI Chat error', { error: errorMessage });

    return NextResponse.json(
      { error: 'Failed to generate response', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET - Health check and capabilities
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      status: 'ready',
      capabilities: [
        'account-research',
        'contact-insights',
        'email-generation',
        'sequence-optimization',
        'icp-analysis',
        'roi-calculation',
        'general-assistance',
        'navigation-actions',
        'filter-actions',
        'search-actions',
        'conversation-memory',
      ],
      maxMessageLength: 2000,
      maxHistoryMessages: 6,
      providers: ['gemini', 'openai'],
      actions: ['navigate', 'filter', 'search', 'research', 'email', 'explain', 'select'],
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('AI Chat GET error', { error: errorMessage });
    return NextResponse.json(
      { error: 'Failed to get capabilities', details: errorMessage },
      { status: 500 }
    );
  }
}
