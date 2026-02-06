import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authServiceOrSession } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { parseBody } from '@/lib/validation';
import { checkCanSpamCompliance } from '@/lib/outreach/compliance';
import { captureRouteError } from '@/lib/sentry-utils';

const SequenceStepSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  emailBody: z.string().min(1, 'Email body is required'),
  delayHours: z.number().min(0, 'Delay must be >= 0'),
});

const CreateSequenceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(2000).optional(),
  steps: z.array(SequenceStepSchema).min(1, 'At least one step is required'),
});

export async function GET(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    // For S2S calls, either require x-user-id or return all sequences
    const userId =
      authResult.type === 'session' ? authResult.userId : req.headers.get('x-user-id') || null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Only filter by userId if present (session users always have one)
    if (userId) {
      where.createdBy = userId;
    }

    if (status) {
      where.status = status;
    }

    const sequences = await prisma.outreachSequence.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        steps: true,
        totalEnrolled: true,
        totalCompleted: true,
        totalActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: sequences });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/sequences',
      method: 'GET',
    });
    logger.error('Error fetching sequences', { error });
    return NextResponse.json({ error: 'Failed to fetch sequences' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId =
      authResult.type === 'session'
        ? authResult.userId
        : req.headers.get('x-user-id') || authResult.userId;

    const parsed = await parseBody(req, CreateSequenceSchema);
    if (!parsed.success) return parsed.response;
    const { name, description, steps } = parsed.data;

    // CAN-SPAM compliance check (beyond structural validation)
    const errors: string[] = [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // Check CAN-SPAM compliance for each step
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

    // Normalize steps
    const normalizedSteps = steps.map((step, index) => ({
      stepNumber: index,
      delayHours: step.delayHours,
      subject: step.subject.trim(),
      emailBody: step.emailBody.trim(),
    }));

    // Create sequence
    const sequence = await prisma.outreachSequence.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        steps: normalizedSteps,
        status: 'draft',
        createdBy: userId,
      },
    });

    logger.info('Sequence created', {
      sequenceId: sequence.id,
      name: sequence.name,
      stepCount: normalizedSteps.length,
    });

    return NextResponse.json({ sequence }, { status: 201 });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/sequences',
      method: 'POST',
    });
    logger.error('Error creating sequence', { error });
    return NextResponse.json({ error: 'Failed to create sequence' }, { status: 500 });
  }
}
