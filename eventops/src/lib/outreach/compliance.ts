import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface ComplianceError {
  code: string;
  message: string;
  field?: string;
}

export interface ComplianceResult {
  compliant: boolean;
  errors: ComplianceError[];
}

export interface EmailContent {
  subject: string;
  body: string;
}

/**
 * CAN-SPAM Compliance Checker
 * Ensures emails comply with CAN-SPAM Act requirements
 */
export async function checkCanSpamCompliance(
  emailContent: EmailContent
): Promise<ComplianceResult> {
  const errors: ComplianceError[] = [];

  // 1. Check for unsubscribe link
  const unsubscribeLinkPattern = /\{\{unsubscribeLink\}\}|href=["'].*unsubscribe.*["']/i;
  if (!unsubscribeLinkPattern.test(emailContent.body)) {
    errors.push({
      code: 'MISSING_UNSUBSCRIBE_LINK',
      message: 'Email must contain an unsubscribe link ({{unsubscribeLink}} template variable or unsubscribe href)',
      field: 'body',
    });
  }

  // 2. Check for physical address
  const addressPattern = /\{\{companyAddress\}\}|physical.*address/i;
  if (!addressPattern.test(emailContent.body)) {
    errors.push({
      code: 'MISSING_PHYSICAL_ADDRESS',
      message: 'Email must contain company physical address ({{companyAddress}} template variable)',
      field: 'body',
    });
  }

  // 3. Subject line must not be deceptive (basic check)
  if (emailContent.subject.toLowerCase().includes('re:') || 
      emailContent.subject.toLowerCase().includes('fwd:')) {
    errors.push({
      code: 'DECEPTIVE_SUBJECT',
      message: 'Subject line should not use "Re:" or "Fwd:" unless it is an actual reply/forward',
      field: 'subject',
    });
  }

  // 4. Subject must not be empty
  if (!emailContent.subject || emailContent.subject.trim().length === 0) {
    errors.push({
      code: 'EMPTY_SUBJECT',
      message: 'Subject line cannot be empty',
      field: 'subject',
    });
  }

  return {
    compliant: errors.length === 0,
    errors,
  };
}

/**
 * GDPR Consent Verification
 * Checks if contact has given consent for email communication
 */
export async function checkGdprConsent(personId: string): Promise<ComplianceResult> {
  const errors: ComplianceError[] = [];

  try {
    const person = await prisma.people.findUnique({
      where: { id: personId },
      select: {
        gdprConsent: true,
        email: true,
      },
    });

    if (!person) {
      errors.push({
        code: 'PERSON_NOT_FOUND',
        message: `Person with ID ${personId} not found`,
      });
      return { compliant: false, errors };
    }

    if (!person.gdprConsent) {
      errors.push({
        code: 'NO_GDPR_CONSENT',
        message: `Contact has not given GDPR consent for email communication`,
      });
    }

    if (!person.email) {
      errors.push({
        code: 'NO_EMAIL_ADDRESS',
        message: `Contact does not have an email address`,
      });
    }
  } catch (error) {
    logger.error('Error checking GDPR consent', { personId, error });
    errors.push({
      code: 'DATABASE_ERROR',
      message: 'Failed to verify GDPR consent',
    });
  }

  return {
    compliant: errors.length === 0,
    errors,
  };
}

/**
 * Email Status Verification
 * Checks if contact's email is valid (not bounced, not complained)
 */
export async function checkEmailStatus(personId: string): Promise<ComplianceResult> {
  const errors: ComplianceError[] = [];

  try {
    const person = await prisma.people.findUnique({
      where: { id: personId },
      select: {
        emailStatus: true,
        unsubscribed: true,
        email: true,
      },
    });

    if (!person) {
      errors.push({
        code: 'PERSON_NOT_FOUND',
        message: `Person with ID ${personId} not found`,
      });
      return { compliant: false, errors };
    }

    // Check if unsubscribed
    if (person.unsubscribed) {
      errors.push({
        code: 'UNSUBSCRIBED',
        message: 'Contact has unsubscribed from emails',
      });
    }

    // Check email status
    if (person.emailStatus === 'bounced') {
      errors.push({
        code: 'EMAIL_BOUNCED',
        message: 'Email address has previously bounced',
      });
    }

    if (person.emailStatus === 'complained') {
      errors.push({
        code: 'SPAM_COMPLAINT',
        message: 'Contact has marked previous emails as spam',
      });
    }

    if (!person.email || person.email.trim().length === 0) {
      errors.push({
        code: 'NO_EMAIL_ADDRESS',
        message: 'Contact does not have a valid email address',
      });
    }
  } catch (error) {
    logger.error('Error checking email status', { personId, error });
    errors.push({
      code: 'DATABASE_ERROR',
      message: 'Failed to verify email status',
    });
  }

  return {
    compliant: errors.length === 0,
    errors,
  };
}

/**
 * Comprehensive Compliance Check
 * Runs all compliance checks before sending an email
 */
export async function checkCompliance(
  personId: string,
  emailContent: EmailContent
): Promise<ComplianceResult> {
  const allErrors: ComplianceError[] = [];

  // Check CAN-SPAM compliance
  const canSpamResult = await checkCanSpamCompliance(emailContent);
  allErrors.push(...canSpamResult.errors);

  // Check GDPR consent
  const gdprResult = await checkGdprConsent(personId);
  allErrors.push(...gdprResult.errors);

  // Check email status
  const statusResult = await checkEmailStatus(personId);
  allErrors.push(...statusResult.errors);

  return {
    compliant: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Mark contact as unsubscribed
 */
export async function handleUnsubscribe(personId: string, reason?: string): Promise<void> {
  try {
    await prisma.people.update({
      where: { id: personId },
      data: {
        unsubscribed: true,
        updatedAt: new Date(),
      },
    });

    // Pause all active enrollments for this person
    await prisma.sequenceEnrollment.updateMany({
      where: {
        personId,
        status: 'active',
      },
      data: {
        status: 'paused',
        pauseReason: 'unsubscribed',
      },
    });

    logger.info('Contact unsubscribed', { personId, reason });
  } catch (error) {
    logger.error('Error handling unsubscribe', { personId, error });
    throw error;
  }
}

/**
 * Mark contact email as bounced
 */
export async function handleBounce(personId: string, bounceType: 'hard' | 'soft'): Promise<void> {
  try {
    // Only mark as bounced for hard bounces
    if (bounceType === 'hard') {
      await prisma.people.update({
        where: { id: personId },
        data: {
          emailStatus: 'bounced',
          updatedAt: new Date(),
        },
      });

      // Pause all active enrollments for this person
      await prisma.sequenceEnrollment.updateMany({
        where: {
          personId,
          status: 'active',
        },
        data: {
          status: 'paused',
          pauseReason: 'bounced',
        },
      });
    }

    logger.info('Email bounced', { personId, bounceType });
  } catch (error) {
    logger.error('Error handling bounce', { personId, error });
    throw error;
  }
}

/**
 * Mark contact as spam complainer
 */
export async function handleSpamComplaint(personId: string): Promise<void> {
  try {
    await prisma.people.update({
      where: { id: personId },
      data: {
        emailStatus: 'complained',
        unsubscribed: true, // Auto-unsubscribe spam complainers
        updatedAt: new Date(),
      },
    });

    // Pause all active enrollments for this person
    await prisma.sequenceEnrollment.updateMany({
      where: {
        personId,
        status: 'active',
      },
      data: {
        status: 'paused',
        pauseReason: 'spam_complaint',
      },
    });

    logger.warn('Spam complaint received', { personId });
  } catch (error) {
    logger.error('Error handling spam complaint', { personId, error });
    throw error;
  }
}
