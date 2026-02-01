import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import sgMail from '@sendgrid/mail';

// Configure SendGrid (Lazy check or ensure env is loaded)
const getSendGrid = () => {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (apiKey) {
    sgMail.setApiKey(apiKey);
    return sgMail;
  }
  return null;
};

export type AlertType = 'VIP_CHECKIN' | 'MEETING_COMPLETED' | 'SYSTEM_ERROR';

export interface AlertPayload {
  type: AlertType;
  message: string;
  metadata?: Record<string, unknown>;
  level?: 'INFO' | 'WARNING' | 'CRITICAL';
  [key: string]: unknown; // Index signature for LogContext compatibility
}

class AlertManagerService {
  private slackWebhookUrl: string | undefined;

  constructor() {
    this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  }

  /**
   * Dispatch an alert to all configured channels
   */
  async sendAlert(payload: AlertPayload): Promise<void> {
    logger.info(`[AlertManager] Dispatching alert: ${payload.type}`, {
      alertType: payload.type,
      message: payload.message,
      level: payload.level,
    });

    const promises: Promise<void>[] = [];

    // 1. Send to Slack (if configured)
    if (this.slackWebhookUrl) {
      promises.push(this.sendSlackAlert(payload));
    }

    // 2. Send to Email (Critical alerts only, via SendGrid)
    if (payload.level === 'CRITICAL') {
      promises.push(this.sendEmailAlert(payload));
    }

    // Await all efficiently
    const results = await Promise.allSettled(promises);

    // Log failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error(`[AlertManager] Failed to send to channel index ${index}`, {
          error: result.reason,
        });
      }
    });
  }

  private async sendSlackAlert(payload: AlertPayload): Promise<void> {
    if (!this.slackWebhookUrl) return;

    const colorMap = {
      INFO: '#36a64f', // Green
      WARNING: '#ecb22e', // Yellow
      CRITICAL: '#ff0000', // Red
    };

    const block = {
      text: `*${payload.type}*\n${payload.message}`,
      attachments: [
        {
          color: colorMap[payload.level || 'INFO'],
          fields: payload.metadata
            ? Object.entries(payload.metadata).map(([k, v]) => ({
                title: k,
                value: String(v),
                short: true,
              }))
            : [],
        },
      ],
    };

    try {
      const response = await fetch(this.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('[AlertManager] Slack send failed', { error });
      throw error;
    }
  }

  private async sendEmailAlert(payload: AlertPayload): Promise<void> {
    const mailer = getSendGrid();
    if (!mailer) return;

    const msg = {
      to: 'alerts@eventops.com', // TODO: Make configurable or use env
      from: 'system@yardflow.com',
      subject: `[${payload.level || 'INFO'}] Alert: ${payload.type}`,
      text: `${payload.message}\n\nMetadata:\n${JSON.stringify(payload.metadata, null, 2)}`,
      html: `
        <h2>${payload.type}</h2>
        <p>${payload.message}</p>
        <pre>${JSON.stringify(payload.metadata, null, 2)}</pre>
      `,
    };

    try {
      await mailer.send(msg);
    } catch (error) {
      logger.error('[AlertManager] Email send failed', { error });
      throw error;
    }
  }
}

export const AlertManager = new AlertManagerService();
