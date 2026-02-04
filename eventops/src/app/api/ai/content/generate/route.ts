/**
 * API Route: Generate Content (Brand Voice)
 * POST /api/ai/content/generate
 * 
 * Uses unified AI provider with automatic fallback (Gemini → OpenAI)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { authServiceOrSession } from '@/lib/auth-service';
import { logger } from '@/lib/logger';
import { generateContent } from '@/lib/ai/provider';
import {
  buildPrompt,
  buildLuisRepairPrompt,
  enforceLuisConstraints,
  parseModelJson,
  validateLuisOutput,
  type ContentContext,
} from '@/lib/ai/content-generator';
import { VOICE_CONFIGS } from '@/lib/ai/voiceConfigs';

export const dynamic = 'force-dynamic';

const ToneSchema = z.enum(['luis', 'professional', 'challenger']);

const RequestSchema = z.object({
  type: z.literal('email'),
  tone: ToneSchema,
  goal: z.string().optional(),
  context: z.object({
    prospectName: z.string().min(1),
    companyName: z.string().min(1),
    title: z.string().optional(),
  }),
});

type RateLimitState = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateLimitStore: Map<string, RateLimitState> = new Map();

function checkRateLimit(key: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const state = rateLimitStore.get(key);

  if (!state || now > state.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (state.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterMs: state.resetAt - now };
  }

  state.count += 1;
  rateLimitStore.set(key, state);
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 12);
  const startedAt = Date.now();

  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult || authResult.type !== 'service') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const serviceKey = request.headers.get('x-service-key') || 'unknown-service';
    const rateCheck = checkRateLimit(serviceKey);
    if (!rateCheck.allowed) {
      logger.warn('AI content generate throttled', {
        requestId,
        serviceKey,
        retryAfterMs: rateCheck.retryAfterMs,
      });
      return NextResponse.json(
        { error: 'rate_limited' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rateCheck.retryAfterMs || 0) / 1000)) },
        }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      logger.warn('AI content generate invalid JSON', { requestId });
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => issue.message).join('; ');
      logger.warn('AI content generate validation failed', {
        requestId,
        details,
      });
      return NextResponse.json({ error: 'validation_error', details }, { status: 400 });
    }

    const { context, tone, goal } = parsed.data;

    if (!VOICE_CONFIGS[tone]) {
      return NextResponse.json({ error: 'invalid_tone' }, { status: 400 });
    }

    const calendlyLink = process.env.CALENDLY_LINK || process.env.CALENDLY_URL || '';
    if (tone === 'luis' && !calendlyLink) {
      logger.error('AI content generate missing Calendly link', { requestId, tone });
      return NextResponse.json({ error: 'missing_calendly_link' }, { status: 500 });
    }

    const contentContext: ContentContext = {
      prospectName: context.prospectName,
      companyName: context.companyName,
      title: context.title,
      goal: goal,
      tone,
    };

    const { prompt, promptVersion } = buildPrompt(contentContext);

    // Use unified provider with automatic fallback
    const result = await generateContent(prompt, {
      temperature: 0.3,
      maxTokens: 300,
    });

    let generated = parseModelJson(result.content);
    const providerUsed = result.provider;
    const fallbackUsed = result.fallbackUsed;

    let validationIssues: string[] = [];
    if (tone === 'luis' && calendlyLink) {
      const issues = validateLuisOutput(generated.content, calendlyLink);
      if (issues.length > 0) {
        const repairPrompt = buildLuisRepairPrompt(contentContext, calendlyLink);
        const repairResult = await generateContent(repairPrompt, {
          temperature: 0.2,
          maxTokens: 200,
        });
        generated = parseModelJson(repairResult.content);

        const enforced = enforceLuisConstraints(generated.content, calendlyLink);
        generated = { ...generated, content: enforced.content };
        validationIssues = enforced.issues;
      }
    }

    const latencyMs = Date.now() - startedAt;
    logger.info('AI content generate success', {
      requestId,
      tone,
      type: parsed.data.type,
      promptVersion,
      latencyMs,
      provider: providerUsed,
      fallbackUsed,
      validationIssues,
    });

    return NextResponse.json({
      subject: generated.subject,
      content: generated.content,
      provider: providerUsed,
      ...(fallbackUsed && { fallbackUsed: true }),
    });
  } catch (error: unknown) {
    const latencyMs = Date.now() - startedAt;
    
    // Check if it's a rate limit error
    const isRateLimited = error && typeof error === 'object' && 'isRateLimited' in error;
    const retryAfterSeconds = isRateLimited && 'retryAfterSeconds' in error 
      ? (error as { retryAfterSeconds: number }).retryAfterSeconds 
      : undefined;

    logger.error('AI content generate error', {
      requestId,
      latencyMs,
      error: error instanceof Error ? error.message : 'unknown_error',
      isRateLimited,
      retryAfterSeconds,
    });

    if (isRateLimited) {
      return NextResponse.json(
        { 
          error: 'rate_limited', 
          message: 'All AI providers are rate limited. Please try again later.',
          retryAfterSeconds,
        },
        { 
          status: 429,
          headers: retryAfterSeconds 
            ? { 'Retry-After': String(retryAfterSeconds) }
            : {},
        }
      );
    }

    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
