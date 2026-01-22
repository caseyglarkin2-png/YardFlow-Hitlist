// LinkedIn automation helpers for Phantom Buster integration

export interface LinkedInMessage {
  recipientLinkedInUrl: string;
  message: string;
  connectionNote?: string;
}

export interface LinkedInProfile {
  name: string;
  title: string;
  company: string;
  linkedInUrl: string;
  connected: boolean;
}

/**
 * Generate LinkedIn connection request message (max 300 chars)
 */
export function generateConnectionNote(people: {
  name: string;
  title?: string | null;
  target_accounts: { name: string };
}): string {
  const note = `Hi ${person.name.split(' ')[0]}, I'm with YardFlow and would love to connect about optimizing waste management at ${person.target_accounts.name}. Looking forward to connecting!`;
  
  return note.substring(0, 300); // LinkedIn limit
}

/**
 * Generate LinkedIn InMail message (max 1900 chars)
 */
export function generateInMailMessage(people: {
  name: string;
  title?: string | null;
  target_accounts: { name: string };
}, insights?: string): string {
  const firstName = person.name.split(' ')[0];
  
  let message = `Hi ${firstName},\n\n`;
  message += `I noticed ${person.target_accounts.name} could benefit from YardFlow's waste management platform. `;
  
  if (insights) {
    message += `${insights}\n\n`;
  } else {
    message += `We help companies like yours reduce waste costs by 25% through optimized pickup scheduling and route management.\n\n`;
  }
  
  message += `Would you be open to a quick 15-minute call to discuss how we can help ${person.target_accounts.name}?\n\n`;
  message += `Best regards,\nCasey\nYardFlow`;
  
  return message.substring(0, 1900); // LinkedIn InMail limit
}

/**
 * Track LinkedIn connection status
 */
export async function trackLinkedInConnection(
  personId: string,
  status: 'PENDING' | 'CONNECTED' | 'DECLINED'
) {
  try {
    await fetch('/api/linkedin/track-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId, status }),
    });
  } catch (error) {
    console.error('Failed to track LinkedIn connection:', error);
  }
}

/**
 * Export LinkedIn message batch for manual or Phantom Buster use
 */
export function exportLinkedInBatch(
  people: Array<{
    id: string;
    name: string;
    title?: string | null;
    linkedin?: string | null;
    target_accounts: { name: string };
  }>
): string {
  const csv = [
    ['LinkedIn URL', 'Name', 'Company', 'Message'],
    ...people
      .filter((p) => p.linkedin)
      .map((p) => [
        p.linkedin!,
        p.name,
        p.target_accounts.name,
        generateConnectionNote(p),
      ]),
  ];

  return csv.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}

/**
 * Rate limiting for LinkedIn (20 connection requests per day recommended)
 */
export const LINKEDIN_DAILY_LIMIT = 20;
export const LINKEDIN_WEEKLY_LIMIT = 100;

export function checkLinkedInRateLimit(sentToday: number, sentThisWeek: number): {
  canSend: boolean;
  reason?: string;
} {
  if (sentToday >= LINKEDIN_DAILY_LIMIT) {
    return { canSend: false, reason: 'Daily limit reached (20 connections)' };
  }
  if (sentThisWeek >= LINKEDIN_WEEKLY_LIMIT) {
    return { canSend: false, reason: 'Weekly limit reached (100 connections)' };
  }
  return { canSend: true };
}
