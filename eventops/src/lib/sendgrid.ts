import sgMail from '@sendgrid/mail';
import { injectTrackingPixel, wrapLinksWithTracking } from './email-tracking';

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@eventops.io';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'EventOps';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  outreachId?: string; // For tracking
  replyTo?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  if (!SENDGRID_API_KEY) {
    console.error('SendGrid API key not configured');
    return {
      success: false,
      error: 'Email service not configured',
    };
  }

  try {
    let htmlBody = options.htmlBody;
    
    // Add tracking if outreachId provided
    if (options.outreachId) {
      htmlBody = injectTrackingPixel(htmlBody, options.outreachId);
      htmlBody = wrapLinksWithTracking(htmlBody, options.outreachId);
    }

    const msg = {
      to: {
        email: options.to,
        name: options.toName,
      },
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: options.subject,
      html: htmlBody,
      text: options.textBody || stripHtml(htmlBody),
      replyTo: options.replyTo,
      trackingSettings: {
        clickTracking: {
          enable: false, // We handle our own tracking
        },
        openTracking: {
          enable: false, // We handle our own tracking
        },
      },
    };

    const [response] = await sgMail.send(msg);

    return {
      success: true,
      messageId: response.headers['x-message-id'] as string,
    };
  } catch (error: any) {
    console.error('SendGrid error:', error.response?.body || error.message);
    return {
      success: false,
      error: error.response?.body?.errors?.[0]?.message || error.message,
    };
  }
}

/**
 * Send bulk emails (uses SendGrid's batch sending)
 */
export async function sendBulkEmails(
  emails: SendEmailOptions[]
): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}> {
  if (!SENDGRID_API_KEY) {
    return {
      success: false,
      sent: 0,
      failed: emails.length,
      errors: ['Email service not configured'],
    };
  }

  const results = {
    success: true,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Send in batches of 100 (SendGrid limit)
  const batchSize = 100;
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    
    try {
      const messages = batch.map(options => {
        let htmlBody = options.htmlBody;
        
        if (options.outreachId) {
          htmlBody = injectTrackingPixel(htmlBody, options.outreachId);
          htmlBody = wrapLinksWithTracking(htmlBody, options.outreachId);
        }

        return {
          to: {
            email: options.to,
            name: options.toName,
          },
          from: {
            email: FROM_EMAIL,
            name: FROM_NAME,
          },
          subject: options.subject,
          html: htmlBody,
          text: options.textBody || stripHtml(htmlBody),
          replyTo: options.replyTo,
          trackingSettings: {
            clickTracking: { enable: false },
            openTracking: { enable: false },
          },
        };
      });

      await sgMail.send(messages);
      results.sent += batch.length;
    } catch (error: any) {
      console.error('Batch send error:', error.response?.body || error.message);
      results.failed += batch.length;
      results.errors.push(
        error.response?.body?.errors?.[0]?.message || error.message
      );
    }
  }

  results.success = results.failed === 0;
  return results;
}

/**
 * Strip HTML tags for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s\s+/g, ' ')
    .trim();
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Template variable substitution
 */
export function renderTemplate(template: string, variables: Record<string, any>): string {
  let rendered = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(regex, value?.toString() || '');
  });
  
  return rendered;
}
