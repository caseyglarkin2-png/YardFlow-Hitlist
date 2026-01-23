import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkCanSpamCompliance } from '@/lib/outreach/compliance';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sequence = await prisma.outreachSequence.findFirst({
      where: {
        id: params.id,
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
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!sequence) {
      return NextResponse.json(
        { error: 'Sequence not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ sequence });
  } catch (error: any) {
    logger.error('Error fetching sequence', { id: params.id, error });
    return NextResponse.json(
      { error: 'Failed to fetch sequence' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, steps, status } = body;

    const existingSequence = await prisma.outreachSequence.findFirst({
      where: {
        id: params.id,
        createdBy: session.user.id,
      },
    });

    if (!existingSequence) {
      return NextResponse.json(
        { error: 'Sequence not found' },
        { status: 404 }
      );
    }

    if (steps) {
      if (!Array.isArray(steps) || steps.length === 0) {
        return NextResponse.json(
          { error: 'At least one step is required' },
          { status: 400 }
        );
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
          complianceResult.errors.forEach(e => {
            errors.push(`Step ${i + 1}: ${e.message}`);
          });
        }
      }

      if (errors.length > 0) {
        return NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }
    
    if (steps) {
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
      where: { id: params.id },
      data: updateData,
    });

    logger.info('Sequence updated', { sequenceId: sequence.id });

    return NextResponse.json({ sequence });
  } catch (error: any) {
    logger.error('Error updating sequence', { id: params.id, error });
    return NextResponse.json(
      { error: 'Failed to update sequence' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sequence = await prisma.outreachSequence.findFirst({
      where: {
        id: params.id,
        createdBy: session.user.id,
      },
      include: {
        _count: {
          select: {
            enrollments: {
              where: {
                status: { in: ['active', 'paused'] },
              },
            },
          },
        },
      },
    });

    if (!sequence) {
      return NextResponse.json(
        { error: 'Sequence not found' },
        { status: 404 }
      );
    }

    if (sequence._count.enrollments > 0) {
      return NextResponse.json(
        { error: 'Cannot delete sequence with active enrollments' },
        { status: 400 }
      );
    }

    await prisma.outreachSequence.delete({
      where: { id: params.id },
    });

    logger.info('Sequence deleted', { sequenceId: params.id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Error deleting sequence', { id: params.id, error });
    return NextResponse.json(
      { error: 'Failed to delete sequence' },
      { status: 500 }
    );
  }
}
