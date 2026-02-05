/**
 * Template CRUD API - R3
 * GET /api/templates - List templates with optional filters
 * POST /api/templates - Create a new template
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authServiceOrSession } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { TemplateTone, OutreachChannel } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Accept both FREIGHTROLL (preferred) and LUIS (legacy) - stored as LUIS in DB
const ToneSchema = z.enum(['FREIGHTROLL', 'LUIS', 'PROFESSIONAL', 'CHALLENGER']);
const ChannelSchema = z.enum(['EMAIL', 'LINKEDIN', 'PHONE']);

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  channel: ChannelSchema.default('EMAIL'),
  tone: ToneSchema.optional(),
  subject: z.string().max(200).optional(),
  template: z.string().min(1).max(5000),
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
});

const QuerySchema = z.object({
  tone: ToneSchema.optional(),
  channel: ChannelSchema.optional(),
  isActive: z.enum(['true', 'false']).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
});

// GET /api/templates
export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const queryParsed = QuerySchema.safeParse({
      tone: searchParams.get('tone') ?? undefined,
      channel: searchParams.get('channel') ?? undefined,
      isActive: searchParams.get('isActive') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });

    if (!queryParsed.success) {
      return NextResponse.json(
        { error: 'invalid_query', details: queryParsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tone, channel, isActive, limit, offset } = queryParsed.data;

    const where: {
      tone?: TemplateTone;
      channel?: OutreachChannel;
      isActive?: boolean;
    } = {};

    if (tone) where.tone = tone as TemplateTone;
    if (channel) where.channel = channel as OutreachChannel;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const templates = await prisma.message_templates.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
      skip: offset ? parseInt(offset, 10) : 0,
    });

    const total = await prisma.message_templates.count({ where });

    logger.info('Templates listed', {
      requestId,
      count: templates.length,
      total,
      filters: { tone, channel, isActive },
    });

    return NextResponse.json({
      templates,
      total,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Template list failed', { requestId, error: message });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// POST /api/templates
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CreateTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, channel, tone, subject, template, isActive, isDefault } =
      parsed.data;

    // If setting as default for a tone, unset other defaults
    if (isDefault && tone) {
      await prisma.message_templates.updateMany({
        where: { tone: tone as TemplateTone, isDefault: true },
        data: { isDefault: false },
      });
    }

    const newTemplate = await prisma.message_templates.create({
      data: {
        id: crypto.randomUUID(),
        name,
        description: description ?? null,
        channel: channel as OutreachChannel,
        tone: tone ? (tone as TemplateTone) : null,
        subject: subject ?? null,
        template,
        isActive,
        isDefault,
        createdBy: authResult.userId ?? null,
        updatedAt: new Date(),
      },
    });

    logger.info('Template created', {
      requestId,
      templateId: newTemplate.id,
      tone,
      channel,
      createdBy: authResult.userId,
    });

    return NextResponse.json({ template: newTemplate }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Template creation failed', { requestId, error: message });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
