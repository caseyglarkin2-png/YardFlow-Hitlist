import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Cron job to process email sequences automatically
 * Should be called by Vercel Cron or external scheduler
 * 
 * Authentication via cron secret to prevent abuse
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production';
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    processed: 0,
    sent: 0,
    errors: 0,
    sequences: [] as any[],
  };

  try {
    // Find active sequences with pending steps
    const sequences = await prisma.sequences.findMany({
      where: {
        isActive: true,
        status: 'ACTIVE',
      },
      include: {
        people: {
          include: {
            target_accounts: true,
          },
        },
      },
    });

    results.processed = sequences.length;

    for (const sequence of sequences) {
      try {
        const steps = sequence.steps ? JSON.parse(sequence.steps as string) : [];
        const currentStepIndex = sequence.currentStep || 0;

        if (currentStepIndex >= steps.length) {
          // Sequence completed
          await prisma.sequences.update({
            where: { id: sequence.id },
            data: {
              status: 'COMPLETED',
              updatedAt: new Date(),
            },
          });
          results.sequences.push({
            id: sequence.id,
            status: 'completed',
          });
          continue;
        }

        const currentStep = steps[currentStepIndex];
        const lastStepDate = sequence.lastStepDate || sequence.createdAt;
        const daysSinceLastStep = Math.floor(
          (Date.now() - new Date(lastStepDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check if it's time to execute this step
        const delayDays = currentStep.delayDays || 0;
        if (daysSinceLastStep >= delayDays) {
          // Generate outreach for this step
          const template = currentStep.template || currentStep.subject;
          
          const outreach = await prisma.outreach.create({
            data: {
              id: `out-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              personId: sequence.personId,
              eventId: sequence.people.eventId,
              type: 'EMAIL',
              subject: currentStep.subject || `Follow-up ${currentStepIndex + 1}`,
              body: template,
              scheduledFor: new Date(),
              status: 'SENT', // Auto-send
              sentAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          // Log activity
          await prisma.activities.create({
            data: {
              id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              personId: sequence.personId,
              type: 'EMAIL_SENT',
              timestamp: new Date(),
              metadata: JSON.stringify({
                sequenceId: sequence.id,
                stepIndex: currentStepIndex,
                outreachId: outreach.id,
              }),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          // Update sequence to next step
          await prisma.sequences.update({
            where: { id: sequence.id },
            data: {
              currentStep: currentStepIndex + 1,
              lastStepDate: new Date(),
              updatedAt: new Date(),
            },
          });

          results.sent++;
          results.sequences.push({
            id: sequence.id,
            personId: sequence.personId,
            step: currentStepIndex,
            outreachId: outreach.id,
            status: 'sent',
          });
        } else {
          results.sequences.push({
            id: sequence.id,
            status: 'waiting',
            daysRemaining: delayDays - daysSinceLastStep,
          });
        }
      } catch (error) {
        console.error(`Error processing sequence ${sequence.id}:`, error);
        results.errors++;
        results.sequences.push({
          id: sequence.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...results,
      },
      { status: 500 }
    );
  }
}
