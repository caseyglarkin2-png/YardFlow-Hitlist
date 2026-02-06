import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authServiceOrSession } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { parseBody } from '@/lib/validation';
import { checkCanSpamCompliance } from '@/lib/outreach/compliance';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

const SequenceStepSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  emailBody: z.string().min(1, 'Email body is required'),
  delayHours: z.number().min(0, 'Delay must be >= 0'),
});

const UpdateSequenceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  steps: z.array(SequenceStepSchema).min(1).optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find sequence without createdBy filter - team members should access all sequences
    const sequence = await prisma.outreachSequence.findUnique({
      where: { id },
      include: {
        enrollments: {
          take: 10,
          orderBy: { startedAt: 'desc' },
          include: {
            person: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    return NextResponse.json({ sequence });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/sequences/[id]',
      method: 'GET',
    });
    logger.error('Error fetching sequence', { error });
    return NextResponse.json({ error: 'Failed to fetch sequence' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = await parseBody(req, UpdateSequenceSchema);
    if (!parsed.success) return parsed.response;
    const { name, description, steps, status } = parsed.data;

    // Find sequence without createdBy filter
    const existingSequence = await prisma.outreachSequence.findUnique({
      where: { id },
    });

    if (!existingSequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    if (steps) {
      const errors: string[] = [];
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        const complianceResult = await checkCanSpamCompliance({
          subject: step.subject,
          body: step.emailBody,
        });

        if (!complianceResult.compliant) {
          complianceResult.errors.forEach((e) => {
            errors.push(`Step ${i + 1}: ${e.message}`);
          });
        }
      }

      if (errors.length > 0) {
        return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (steps) {
      updateData.steps = steps.map((step, index: number) => ({
        stepNumber: index,
        delayHours: step.delayHours,
        subject: step.subject.trim(),
        emailBody: step.emailBody.trim(),
      }));
    }

    if (status !== undefined) {
      updateData.status = status;
    }

    const sequence = await prisma.outreachSequence.update({
      where: { id },
      data: updateData,
    });

    logger.info('Sequence updated', { sequenceId: sequence.id });

    return NextResponse.json({ sequence });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/sequences/[id]',
      method: 'PUT',
    });
    logger.error('Error updating sequence', { id, error });
    return NextResponse.json({ error: 'Failed to update sequence' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find sequence without createdBy filter
    const sequence = await prisma.outreachSequence.findUnique({
      where: { id },
    });

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    // Separate count query for active enrollments (Prisma doesn't support where in _count)
    const activeEnrollments = await prisma.sequenceEnrollment.count({
      where: {
        sequenceId: id,
        status: { in: ['active', 'paused'] },
      },
    });

    if (activeEnrollments > 0) {
      return NextResponse.json(
        { error: 'Cannot delete sequence with active enrollments' },
        { status: 400 }
      );
    }

    await prisma.outreachSequence.delete({
      where: { id },
    });

    logger.info('Sequence deleted', { sequenceId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/sequences/[id]',
      method: 'DELETE',
    });
    logger.error('Error deleting sequence', { id, error });
    return NextResponse.json({ error: 'Failed to delete sequence' }, { status: 500 });
  }
}
