/**
 * Template CRUD API - R3
 * GET /api/templates/[id] - Get single template
 * PATCH /api/templates/[id] - Update template
 * DELETE /api/templates/[id] - Delete template
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authServiceOrSession } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { TemplateTone, OutreachChannel } from '@prisma/client';

export const dynamic = 'force-dynamic';

const ToneSchema = z.enum(['LUIS', 'PROFESSIONAL', 'CHALLENGER']);
const ChannelSchema = z.enum(['EMAIL', 'LINKEDIN', 'PHONE']);

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  channel: ChannelSchema.optional(),
  tone: ToneSchema.optional().nullable(),
  subject: z.string().max(200).optional().nullable(),
  template: z.string().min(1).max(5000).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(), // Note: requires migration 20260203000000
});

// GET /api/templates/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  const { id } = await params;

  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const template = await prisma.message_templates.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Template fetch failed', { requestId, id, error: message });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// PATCH /api/templates/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  const { id } = await params;

  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = UpdateTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, channel, tone, subject, template, isActive, isDefault } =
      parsed.data;

    // Check template exists
    const existing = await prisma.message_templates.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // If setting as default for a tone, unset other defaults
    const effectiveTone = tone !== undefined ? tone : existing.tone;
    if (isDefault && effectiveTone) {
      await prisma.message_templates.updateMany({
        where: {
          tone: effectiveTone as TemplateTone,
          isDefault: true,
          NOT: { id },
        },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.message_templates.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(channel !== undefined && { channel: channel as OutreachChannel }),
        ...(tone !== undefined && { tone: tone ? (tone as TemplateTone) : null }),
        ...(subject !== undefined && { subject }),
        ...(template !== undefined && { template }),
        ...(isActive !== undefined && { isActive }),
        ...(isDefault !== undefined && { isDefault }),
        updatedAt: new Date(),
      },
    });

    logger.info('Template updated', {
      requestId,
      templateId: id,
      updatedBy: authResult.userId,
    });

    return NextResponse.json({ template: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Template update failed', { requestId, id, error: message });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// DELETE /api/templates/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  const { id } = await params;

  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const existing = await prisma.message_templates.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    await prisma.message_templates.delete({
      where: { id },
    });

    logger.info('Template deleted', {
      requestId,
      templateId: id,
      deletedBy: authResult.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Template delete failed', { requestId, id, error: message });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
