import { google } from 'googleapis';
import { getGoogleClient } from './auth';
import { prisma } from '@/lib/db';
import { logGoogleAPICall } from './telemetry';
import pLimit from 'p-limit';

const MAX_MESSAGES_PER_THREAD = 10;

export async function checkEmailReplies(userId: string): Promise<{
  checked: number;
  updated: number;
  details: Array<{ outreachId: string; personName: string; respondedAt: Date }>;
}> {
  const auth = await getGoogleClient(userId);
  const gmail = google.gmail({ version: 'v1', auth });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const outreachToCheck = await prisma.outreach.findMany({
    where: {
      status: 'SENT',
      sentAt: { gte: thirtyDaysAgo },
      gmailThreadId: { not: null },
      OR: [
        { lastChecked: null },
        { lastChecked: { lt: new Date(Date.now() - 3600000) } },
      ],
    },
    include: {
      people: {
        select: { email: true, name: true },
      },
    },
    take: 50,
  });

  if (outreachToCheck.length === 0) {
    return { checked: 0, updated: 0, details: [] };
  }

  const limit = pLimit(5);
  const updated: Array<{ outreachId: string; personName: string; respondedAt: Date }> = [];

  await Promise.all(
    outreachToCheck.map(outreach =>
      limit(async () => {
        if (!outreach.gmailThreadId) return;

        try {
          const thread = await gmail.users.threads.get({
            userId: 'me',
            id: outreach.gmailThreadId,
            format: 'metadata',
            metadataHeaders: ['From', 'Date'],
          });

          await logGoogleAPICall(userId, 'gmail', 'threads.get', {
            threadId: outreach.gmailThreadId,
            messageCount: thread.data.messages?.length || 0,
          });

          const messages = thread.data.messages || [];
          const recentMessages = messages.slice(-MAX_MESSAGES_PER_THREAD);

          for (const message of recentMessages) {
            const headers = message.payload?.headers || [];
            const fromHeader = headers.find(h => h.name === 'From');
            const dateHeader = headers.find(h => h.name === 'Date');

            if (!fromHeader?.value) continue;

            const emailMatch = fromHeader.value.match(/<([^>]+)>/);
            const fromEmail = emailMatch ? emailMatch[1] : fromHeader.value;

            if (
              outreach.people.email &&
              fromEmail.toLowerCase().includes(outreach.people.email.toLowerCase())
            ) {
              const respondedAt = dateHeader?.value 
                ? new Date(dateHeader.value)
                : new Date(parseInt(message.internalDate || '0'));

              await prisma.outreach.update({
                where: { id: outreach.id },
                data: {
                  status: 'RESPONDED',
                  lastChecked: new Date(),
                  updatedAt: new Date(),
                },
              });

              await prisma.activities.create({
                data: {
                  id: crypto.randomUUID(),
                  userId: userId,
                  entityType: 'outreach',
                  entityId: outreach.id,
                  action: 'email_replied',
                  metadata: {
                    personName: outreach.people.name,
                    respondedAt: respondedAt.toISOString(),
                    threadId: outreach.gmailThreadId,
                  },
                },
              });

              updated.push({
                outreachId: outreach.id,
                personName: outreach.people.name || 'Unknown',
                respondedAt,
              });

              break;
            }
          }

          if (!updated.find(u => u.outreachId === outreach.id)) {
            await prisma.outreach.update({
              where: { id: outreach.id },
              data: { lastChecked: new Date() },
            });
          }
        } catch (error: any) {
          console.error(`Error checking thread ${outreach.gmailThreadId}:`, error);

          await logGoogleAPICall(userId, 'gmail', 'threads.get', {
            threadId: outreach.gmailThreadId,
            error: error.message,
          }, false);

          await prisma.outreach.update({
            where: { id: outreach.id },
            data: { lastChecked: new Date() },
          }).catch(() => {});
        }
      })
    )
  );

  return {
    checked: outreachToCheck.length,
    updated: updated.length,
    details: updated,
  };
}
