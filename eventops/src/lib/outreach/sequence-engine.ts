import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkCompliance } from './compliance';
import { sendEmail, createEmailActivity, EmailRecipient } from './email-sender';
import { addSequenceJob } from '@/lib/queue/queues';

export interface SequenceStep {
  stepNumber: number;
  delayHours: number;
  subject: string;
  emailBody: string;
}

/**
 * Enroll a contact in a sequence
 */
export async function enrollContact(
  sequenceId: string,
  personId: string
): Promise<{ success: boolean; enrollmentId?: string; error?: string }> {
  try {
    // Get sequence details
    const sequence = await prisma.outreachSequence.findUnique({
      where: { id: sequenceId },
    });

    if (!sequence) {
      return { success: false, error: 'Sequence not found' };
    }

    if (sequence.status !== 'active') {
      return { success: false, error: 'Sequence is not active' };
    }

    // Get person details
    const person = await prisma.people.findUnique({
      where: { id: personId },
      select: {
        id: true,
        email: true,
        name: true,
        accountId: true,
        gdprConsent: true,
        unsubscribed: true,
        emailStatus: true,
      },
    });

    if (!person) {
      return { success: false, error: 'Person not found' };
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.sequenceEnrollment.findFirst({
      where: {
        sequenceId,
        personId,
        status: { in: ['active', 'paused'] },
      },
    });

    if (existingEnrollment) {
      return { success: false, error: 'Contact already enrolled in this sequence' };
    }

    // Get first step for compliance check
    const steps = sequence.steps as unknown as SequenceStep[];
    if (!steps || steps.length === 0) {
      return { success: false, error: 'Sequence has no steps' };
    }

    const firstStep = steps[0];

    // Check compliance
    const complianceResult = await checkCompliance(personId, {
      subject: firstStep.subject,
      body: firstStep.emailBody,
    });

    if (!complianceResult.compliant) {
      const errorMessages = complianceResult.errors.map(e => e.message).join(', ');
      return { success: false, error: `Compliance check failed: ${errorMessages}` };
    }

    // Create enrollment
    const enrollment = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId,
        personId,
        accountId: person.accountId || undefined,
        currentStep: 0,
        status: 'active',
      },
    });

    // Update sequence metrics
    await prisma.outreachSequence.update({
      where: { id: sequenceId },
      data: {
        totalEnrolled: { increment: 1 },
        totalActive: { increment: 1 },
      },
    });

    // Schedule first step immediately
    await addSequenceJob({
      enrollmentId: enrollment.id,
      stepNumber: 0,
    }, 0); // No delay for first step

    logger.info('Contact enrolled in sequence', {
      sequenceId,
      personId,
      enrollmentId: enrollment.id,
    });

    return { success: true, enrollmentId: enrollment.id };
  } catch (error: any) {
    logger.error('Error enrolling contact', { sequenceId, personId, error });
    return { success: false, error: error.message };
  }
}

/**
 * Process a sequence step (send email)
 */
export async function processStep(enrollmentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get enrollment with related data
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId },
    });

    // Get related data separately
    if (!enrollment) {
      return { success: false, error: 'Enrollment not found' };
    }

    const sequence = await prisma.outreachSequence.findUnique({
      where: { id: enrollment.sequenceId },
    });

    const person = enrollment.personId 
      ? await prisma.people.findUnique({
          where: { id: enrollment.personId },
          include: { target_accounts: true },
        })
      : null;

    if (enrollment.status !== 'active') {
      return { success: false, error: `Enrollment is ${enrollment.status}` };
    }

    if (!person) {
      return { success: false, error: 'Person not found' };
    }

    if (!sequence) {
      return { success: false, error: 'Sequence not found' };
    }

    // Get current step
    const steps = sequence.steps as unknown as SequenceStep[];
    const currentStep = steps[enrollment.currentStep];

    if (!currentStep) {
      // No more steps, complete the enrollment
      await completeEnrollment(enrollmentId);
      return { success: true };
    }

    // Check compliance before sending
    const complianceResult = await checkCompliance(person.id, {
      subject: currentStep.subject,
      body: currentStep.emailBody,
    });

    if (!complianceResult.compliant) {
      // Pause enrollment due to compliance failure
      await pauseEnrollment(enrollmentId, 'compliance_failed');
      
      const errorMessages = complianceResult.errors.map(e => e.message).join(', ');
      logger.warn('Enrollment paused due to compliance failure', {
        enrollmentId,
        errors: errorMessages,
      });
      
      return { success: false, error: `Compliance check failed: ${errorMessages}` };
    }

    // Split name into first and last
    const nameParts = (person.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Prepare recipient data
    const recipient: EmailRecipient = {
      email: person.email || '',
      firstName,
      lastName,
      company: person.target_accounts?.name || '',
    };

    // Send email
    const sendResult = await sendEmail(
      recipient,
      {
        subject: currentStep.subject,
        body: currentStep.emailBody,
      },
      enrollmentId,
      currentStep.stepNumber
    );

    // Create email activity record
    await createEmailActivity(
      enrollmentId,
      currentStep.stepNumber,
      {
        subject: currentStep.subject,
        body: currentStep.emailBody,
      },
      sendResult
    );

    if (!sendResult.success) {
      // Pause enrollment on send failure
      await pauseEnrollment(enrollmentId, 'send_failed');
      return { success: false, error: sendResult.error };
    }

    // Advance to next step
    await advanceEnrollment(enrollmentId);

    return { success: true };
  } catch (error: any) {
    logger.error('Error processing sequence step', { enrollmentId, error });
    return { success: false, error: error.message };
  }
}

/**
 * Advance enrollment to next step
 */
export async function advanceEnrollment(enrollmentId: string): Promise<void> {
  try {
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    const sequence = await prisma.outreachSequence.findUnique({
      where: { id: enrollment.sequenceId },
    });

    if (!sequence) {
      throw new Error('Sequence not found');
    }

    const steps = sequence.steps as unknown as SequenceStep[];
    const nextStepNumber = enrollment.currentStep + 1;

    if (nextStepNumber >= steps.length) {
      // No more steps, complete the enrollment
      await completeEnrollment(enrollmentId);
      return;
    }

    // Update current step
    await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        currentStep: nextStepNumber,
      },
    });

    // Schedule next step with delay
    const nextStep = steps[nextStepNumber];
    const delayMs = nextStep.delayHours * 60 * 60 * 1000; // Convert hours to milliseconds

    await addSequenceJob({
      enrollmentId,
      stepNumber: nextStepNumber,
    }, delayMs);

    logger.info('Enrollment advanced to next step', {
      enrollmentId,
      nextStepNumber,
      delayHours: nextStep.delayHours,
    });
  } catch (error) {
    logger.error('Error advancing enrollment', { enrollmentId, error });
    throw error;
  }
}

/**
 * Pause an enrollment
 */
export async function pauseEnrollment(enrollmentId: string, reason: string): Promise<void> {
  try {
    await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'paused',
        pauseReason: reason,
      },
    });

    // Update sequence metrics
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId },
      select: { sequenceId: true },
    });

    if (enrollment) {
      await prisma.outreachSequence.update({
        where: { id: enrollment.sequenceId },
        data: {
          totalActive: { decrement: 1 },
        },
      });
    }

    logger.info('Enrollment paused', { enrollmentId, reason });
  } catch (error) {
    logger.error('Error pausing enrollment', { enrollmentId, error });
    throw error;
  }
}

/**
 * Complete an enrollment
 */
export async function completeEnrollment(enrollmentId: string): Promise<void> {
  try {
    await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    // Update sequence metrics
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId },
      select: { sequenceId: true },
    });

    if (enrollment) {
      await prisma.outreachSequence.update({
        where: { id: enrollment.sequenceId },
        data: {
          totalActive: { decrement: 1 },
          totalCompleted: { increment: 1 },
        },
      });
    }

    logger.info('Enrollment completed', { enrollmentId });
  } catch (error) {
    logger.error('Error completing enrollment', { enrollmentId, error });
    throw error;
  }
}

/**
 * Resume a paused enrollment
 */
export async function resumeEnrollment(enrollmentId: string): Promise<void> {
  try {
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.status !== 'paused') {
      throw new Error('Enrollment is not paused');
    }

    await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'active',
        pauseReason: null,
      },
    });

    // Update sequence metrics
    await prisma.outreachSequence.update({
      where: { id: enrollment.sequenceId },
      data: {
        totalActive: { increment: 1 },
      },
    });

    // Resume from current step
    await addSequenceJob({
      enrollmentId,
      stepNumber: enrollment.currentStep,
    }, 0);

    logger.info('Enrollment resumed', { enrollmentId });
  } catch (error) {
    logger.error('Error resuming enrollment', { enrollmentId, error });
    throw error;
  }
}
