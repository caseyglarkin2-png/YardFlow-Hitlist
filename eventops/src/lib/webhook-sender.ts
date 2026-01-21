import crypto from 'crypto';
import { prisma } from '@/lib/db';

interface WebhookPayload {
  event: string;
  data: unknown;
  timestamp: string;
  [key: string]: unknown; // Add index signature for Prisma JSON compatibility
}

export async function sendWebhook(event: string, data: unknown) {
  try {
    // Get active webhooks for this event
    const webhooks = await prisma.webhook.findMany({
      where: {
        active: true,
        events: {
          has: event,
        },
      },
    });

    const timestamp = new Date().toISOString();

    // Send to each webhook
    const results = await Promise.allSettled(
      webhooks.map(async (webhook) => {
        const payload: WebhookPayload = {
          event,
          data,
          timestamp,
        };

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          'X-Webhook-Timestamp': timestamp,
        };

        // Add signature if secret is configured
        if (webhook.secret) {
          const signature = crypto
            .createHmac('sha256', webhook.secret)
            .update(JSON.stringify(payload))
            .digest('hex');
          headers['X-Webhook-Signature'] = signature;
        }

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        // Log the delivery
        await prisma.webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            event,
            payload: payload as any,
            statusCode: response.status,
            success: response.ok,
            responseBody: response.ok ? null : await response.text(),
          },
        });

        if (!response.ok) {
          throw new Error(`Webhook failed: ${response.status}`);
        }

        return { webhookId: webhook.id, success: true };
      })
    );

    return results;
  } catch (error) {
    console.error('Error sending webhooks:', error);
    return [];
  }
}
