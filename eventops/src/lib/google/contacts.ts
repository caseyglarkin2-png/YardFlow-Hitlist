import { google } from 'googleapis';
import { getGoogleClient } from './auth';
import { prisma } from '@/lib/db';
import { logGoogleAPICall } from './telemetry';

export async function importGoogleContacts(
  userId: string,
  eventId: string,
  options: { dryRun?: boolean } = {}
): Promise<{
  dryRun: boolean;
  total: number;
  imported: number;
  skipped: number;
  details: {
    imported: Array<{ name: string; email: string; company: string; dryRun?: boolean; accountAction?: string }>;
    skipped: Array<{ email?: string; reason: string }>;
  };
}> {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { googleSyncPaused: true, googleSyncDryRun: true },
  });

  if (user?.googleSyncPaused) {
    throw new Error('Google sync is paused');
  }

  const isDryRun = options.dryRun ?? user?.googleSyncDryRun ?? false;

  const auth = await getGoogleClient(userId);
  const people = google.people({ version: 'v1', auth });

  let pageToken: string | undefined;
  const allConnections = [];

  do {
    const response = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      pageToken,
      personFields: 'names,emailAddresses,organizations,phoneNumbers',
    });

    await logGoogleAPICall(userId, 'contacts', 'connections.list', {
      pageToken: !!pageToken,
      count: response.data.connections?.length || 0,
    });

    allConnections.push(...(response.data.connections || []));
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  const imported = [];
  const skipped = [];

  for (const contact of allConnections) {
    const name = contact.names?.[0]?.displayName;
    const email = contact.emailAddresses?.[0]?.value;
    const company = contact.organizations?.[0]?.name;
    const title = contact.organizations?.[0]?.title;
    const phone = contact.phoneNumbers?.[0]?.value;

    if (!name || !email) {
      skipped.push({ email: email || undefined, reason: 'Missing name or email' });
      continue;
    }

    if (!company) {
      skipped.push({ email: email || undefined, reason: 'No company information' });
      continue;
    }

    const existing = await prisma.people.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
      },
    });

    if (existing) {
      skipped.push({ email: email || undefined, reason: 'Person already exists' });
      continue;
    }

    let accountId = null;
    
    let account = await prisma.target_accounts.findFirst({
      where: {
        eventId,
        name: { equals: company, mode: 'insensitive' },
      },
    });

    if (!account) {
      account = await prisma.target_accounts.findFirst({
        where: {
          eventId,
          name: { contains: company, mode: 'insensitive' },
        },
      });
    }

    if (account) {
      accountId = account.id;
    } else if (!isDryRun) {
      const newAccount = await prisma.target_accounts.create({
        data: {
          id: crypto.randomUUID(),
          eventId,
          name: company,
          updatedAt: new Date(),
        },
      });
      accountId = newAccount.id;
    }

    if (!accountId && isDryRun) {
      imported.push({
        dryRun: true,
        name,
        email,
        company,
        accountAction: 'would_create',
      });
      continue;
    }

    if (!accountId) {
      skipped.push({ email: email || undefined, reason: 'Failed to create account' });
      continue;
    }

    if (isDryRun) {
      imported.push({
        dryRun: true,
        name,
        email,
        company,
        accountAction: account ? 'matched_existing' : 'would_create',
      });
      continue;
    }

    await prisma.people.create({
      data: {
        id: crypto.randomUUID(),
        accountId,
        name,
        email,
        title: title || null,
        phone: phone || null,
        updatedAt: new Date(),
      },
    });

    imported.push({ name, email, company });
  }

  await logGoogleAPICall(userId, 'contacts', 'import_complete', {
    dryRun: isDryRun,
    total: allConnections.length,
    imported: imported.length,
    skipped: skipped.length,
  });

  return {
    dryRun: isDryRun,
    total: allConnections.length,
    imported: imported.length,
    skipped: skipped.length,
    details: { imported, skipped },
  };
}
