import sgMail from '@sendgrid/mail';
import { marked } from 'marked';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'outreach@yardflow.com';
const FROM_NAME = process.env.FROM_NAME || 'YardFlow Outreach';
const COMPANY_ADDRESS = process.env.COMPANY_ADDRESS || '123 Main St, Suite 100, San Francisco, CA 94105';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface EmailRecipient {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  [key: string]: any;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Substitute template variables in text
 */
function substituteVariables(
  template: string,
  variables: Record<string, any>
): string {
  let result = template;

  // Add system variables
  const allVariables = {
    ...variables,
    unsubscribeLink: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.yardflow.com'}/unsubscribe?token={{unsubscribeToken}}`,
    companyAddress: COMPANY_ADDRESS,
  };

  // Replace {{variable}} patterns
  for (const [key, value] of Object.entries(allVariables)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(pattern, String(value || ''));
  }

  return result;
}

/**
 * Add tracking pixel to email HTML
 */
function addTrackingPixel(html: string, trackingId: string): string {
  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.yardflow.com'}/api/tracking/open?id=${trackingId}`;
  const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:none" />`;
  
  // Insert before closing body tag
  return html.replace('</body>', `${trackingPixel}</body>`);
}

/**
 * Rewrite links for click tracking
 */
function rewriteLinksForTracking(html: string, trackingId: string): string {
  const trackingBase = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.yardflow.com'}/api/tracking/click?id=${trackingId}&url=`;
  
  // Replace href attributes
  return html.replace(/href=["']([^"']+)["']/g, (match, url) => {
    // Don't track unsubscribe links or anchors
    if (url.startsWith('#') || url.includes('unsubscribe')) {
      return match;
    }
    const encodedUrl = encodeURIComponent(url);
    return `href="${trackingBase}${encodedUrl}"`;
  });
}

/**
 * Convert markdown to HTML with tracking
 */
function renderEmailHtml(
  body: string,
  variables: Record<string, any>,
  trackingId: string
): string {
  // Substitute variables first
  const substituted = substituteVariables(body, variables);
  
  // Convert markdown to HTML
  let html = marked(substituted) as string;
  
  // Wrap in basic HTML template
  html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  ${html}
  <div class="footer">
    <p>{{companyAddress}}</p>
    <p><a href="{{unsubscribeLink}}">Unsubscribe from these emails</a></p>
  </div>
</body>
</html>
  `;
  
  // Add final variable substitution for footer
  html = substituteVariables(html, variables);
  
  // Add tracking pixel
  html = addTrackingPixel(html, trackingId);
  
  // Rewrite links for click tracking
  html = rewriteLinksForTracking(html, trackingId);
  
  return html;
}

/**
 * Send email with retry logic
 */
async function sendWithRetry(
  msg: sgMail.MailDataRequired,
  maxRetries: number = 3
): Promise<EmailSendResult> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const [response] = await sgMail.send(msg);
      
      // Extract message ID from headers
      const messageId = response.headers['x-message-id'] || '';
      
      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on permanent failures
      if (error.code === 400 || error.code === 401 || error.code === 403) {
        break;
      }
      
      // Wait with exponential backoff before retry
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed
  const errorMessage = lastError?.response?.body?.errors?.[0]?.message || lastError?.message || 'Unknown error';
  
  return {
    success: false,
    error: errorMessage,
  };
}

/**
 * Send email to recipient
 */
export async function sendEmail(
  recipient: EmailRecipient,
  template: EmailTemplate,
  enrollmentId: string,
  stepNumber: number
): Promise<EmailSendResult> {
  if (!SENDGRID_API_KEY) {
    logger.error('SendGrid API key not configured');
    return {
      success: false,
      error: 'SendGrid API key not configured',
    };
  }

  try {
    // Generate tracking ID
    const trackingId = `${enrollmentId}_${stepNumber}`;
    
    // Prepare variables
    const variables = {
      firstName: recipient.firstName || '',
      lastName: recipient.lastName || '',
      fullName: `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim(),
      company: recipient.company || '',
      email: recipient.email,
      ...recipient,
    };
    
    // Substitute variables in subject
    const subject = substituteVariables(template.subject, variables);
    
    // Render HTML body
    const html = renderEmailHtml(template.body, variables, trackingId);
    
    // Prepare email
    const msg: sgMail.MailDataRequired = {
      to: recipient.email,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject,
      html,
      customArgs: {
        enrollmentId,
        stepNumber: stepNumber.toString(),
        trackingId,
      },
      trackingSettings: {
        clickTracking: {
          enable: true,
        },
        openTracking: {
          enable: true,
        },
      },
    };
    
    // Send email with retry
    const result = await sendWithRetry(msg);
    
    // Log the send
    logger.info('Email sent', {
      enrollmentId,
      stepNumber,
      recipient: recipient.email,
      success: result.success,
      messageId: result.messageId,
    });
    
    return result;
  } catch (error: any) {
    logger.error('Error sending email', {
      enrollmentId,
      stepNumber,
      recipient: recipient.email,
      error,
    });
    
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Create email activity record
 */
export async function createEmailActivity(
  enrollmentId: string,
  stepNumber: number,
  template: EmailTemplate,
  result: EmailSendResult
): Promise<void> {
  try {
    await prisma.emailActivity.create({
      data: {
        enrollmentId,
        stepNumber,
        subject: template.subject,
        body: template.body,
        status: result.success ? 'sent' : 'failed',
        messageId: result.messageId,
        errorMessage: result.error,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error creating email activity record', {
      enrollmentId,
      stepNumber,
      error,
    });
  }
}
