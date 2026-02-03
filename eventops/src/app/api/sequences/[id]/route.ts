import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkCanSpamCompliance } from '@/lib/outreach/compliance';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sequence = await prisma.outreachSequence.findFirst({
      where: {
        id,
        createdBy: session.user.id,
      },
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
    logger.error('Error fetching sequence', { error });
    return NextResponse.json({ error: 'Failed to fetch sequence' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, steps, status } = body;

    const existingSequence = await prisma.outreachSequence.findFirst({
      where: {
        id,
        createdBy: session.user.id,
      },
    });

    if (!existingSequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    if (steps) {
      if (!Array.isArray(steps) || steps.length === 0) {
        return NextResponse.json({ error: 'At least one step is required' }, { status: 400 });
      }

      const errors: string[] = [];
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        if (!step.subject || !step.subject.trim()) {
          errors.push(`Step ${i + 1}: Subject is required`);
        }

        if (!step.emailBody || !step.emailBody.trim()) {
          errors.push(`Step ${i + 1}: Email body is required`);
        }

        if (step.delayHours === undefined || step.delayHours < 0) {
          errors.push(`Step ${i + 1}: Delay must be >= 0`);
        }

        const complianceResult = await checkCanSpamCompliance({
          subject: step.subject || '',
          body: step.emailBody || '',
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
    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (steps) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateData.steps = steps.map((step: any, index: number) => ({
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
    logger.error('Error updating sequence', { id, error });
    return NextResponse.json({ error: 'Failed to update sequence' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First check if sequence exists and belongs to user
    const sequence = await prisma.outreachSequence.findFirst({
      where: {
        id,
        createdBy: session.user.id,
      },
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
    logger.error('Error deleting sequence', { id, error });
    return NextResponse.json({ error: 'Failed to delete sequence' }, { status: 500 });
  }
}
