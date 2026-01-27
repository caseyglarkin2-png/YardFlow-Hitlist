import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { addSequenceJob } from '@/lib/queue/queues';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Cron job to process email sequences automatically
 * 
 * Finds active enrollments with pending steps and queues them for processing.
 * Should be called every 5-15 minutes by Railway cron or external service.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production';
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  let sequencesProcessed = 0;
  let stepsQueued = 0;
  const errors: string[] = [];

  try {
    // Find active enrollments that have pending steps
    // A step is due when: startedAt + delayHours <= now (or last email sent time)
    const activeEnrollments = await prisma.sequenceEnrollment.findMany({
      where: {
        status: 'active',
      },
      include: {
        sequence: true,
        emailActivities: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
      take: 100, // Process in batches
    });

    logger.info('Cron: Found active enrollments', { count: activeEnrollments.length });

    for (const enrollment of activeEnrollments) {
      try {
        const sequence = enrollment.sequence;
        if (!sequence) continue;

        const steps = sequence.steps as unknown as Array<{
          stepNumber: number;
          delayHours: number;
          subject: string;
          emailBody: string;
        }>;

        if (!steps || steps.length === 0) continue;

        // Get current step
        const currentStepIndex = enrollment.currentStep;
        if (currentStepIndex >= steps.length) {
          // All steps complete, mark enrollment as completed
          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: { status: 'completed', completedAt: new Date() },
          });
          continue;
        }

        const currentStep = steps[currentStepIndex];
        
        // Calculate if step is due based on last email sent or enrollment start
        const lastActivity = enrollment.emailActivities[0];
        const lastProcessed = lastActivity?.sentAt || enrollment.startedAt;
        const delayMs = (currentStep.delayHours || 0) * 60 * 60 * 1000;
        const dueTime = new Date(lastProcessed.getTime() + delayMs);
        
        if (new Date() >= dueTime) {
          // Step is due, queue it for processing
          await addSequenceJob({
            enrollmentId: enrollment.id,
            stepNumber: currentStepIndex,
          }, 0);

          stepsQueued++;
          logger.info('Cron: Queued sequence step', {
            enrollmentId: enrollment.id,
            stepNumber: currentStepIndex,
            sequenceId: sequence.id,
          });
        }

        sequencesProcessed++;
      } catch (error: any) {
        errors.push(`Enrollment ${enrollment.id}: ${error.message}`);
        logger.error('Cron: Error processing enrollment', {
          enrollmentId: enrollment.id,
          error: error.message,
        });
      }
    }

    const duration = Date.now() - startTime;

    logger.info('Cron: Sequence processing complete', {
      sequencesProcessed,
      stepsQueued,
      duration,
      errors: errors.length,
    });

    return NextResponse.json({
      success: true,
      sequences_processed: sequencesProcessed,
      steps_queued: stepsQueued,
      duration_ms: duration,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Cron: Sequence job failed', { error: error.message });
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
