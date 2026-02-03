/**
 * API Route: Generate Content (Brand Voice)
 * POST /api/ai/content/generate
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { authServiceOrSession } from '@/lib/auth-service';
import { logger } from '@/lib/logger';
import { getGeminiClient } from '@/lib/ai/gemini-client';
import {
  buildPrompt,
  buildLuisRepairPrompt,
  enforceLuisConstraints,
  parseModelJson,
  validateLuisOutput,
  type ContentContext,
} from '@/lib/ai/content-generator';
import { VOICE_CONFIGS, type VoiceTone } from '@/lib/ai/voiceConfigs';

export const dynamic = 'force-dynamic';

const ToneSchema = z.enum(['luis', 'professional', 'challenger']);

const RequestSchema = z.object({
  type: z.literal('email'),
  context: z.object({
    prospectName: z.string().min(1),
    companyName: z.string().min(1),
    title: z.string().optional(),
    tone: ToneSchema,
    goal: z.string().optional(),
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

    const { context } = parsed.data;
    const tone = context.tone as VoiceTone;

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
      goal: context.goal,
      tone,
    };

    const { prompt, promptVersion } = buildPrompt(contentContext);
    const gemini = getGeminiClient();

    const rawResponse = await gemini.generateContent(prompt, {
      temperature: 0.3,
      maxOutputTokens: 300,
    });

    let generated = parseModelJson(rawResponse);

    let validationIssues: string[] = [];
    if (tone === 'luis' && calendlyLink) {
      const issues = validateLuisOutput(generated.content, calendlyLink);
      if (issues.length > 0) {
        const repairPrompt = buildLuisRepairPrompt(contentContext, calendlyLink);
        const repairedResponse = await gemini.generateContent(repairPrompt, {
          temperature: 0.2,
          maxOutputTokens: 200,
        });
        generated = parseModelJson(repairedResponse);

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
      validationIssues,
    });

    return NextResponse.json({
      subject: generated.subject,
      content: generated.content,
    });
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    logger.error('AI content generate error', {
      requestId,
      latencyMs,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
