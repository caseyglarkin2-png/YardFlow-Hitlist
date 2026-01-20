import { prisma } from './db';

export type ScoreFactors = {
  personaMatch: number; // 0-40 points based on persona types
  executiveCount: number; // 0-20 points based on exec-level contacts
  totalContacts: number; // 0-20 points based on number of contacts
  dataCompleteness: number; // 0-20 points based on filled fields
};

export type ScoreBreakdown = ScoreFactors & {
  total: number;
  reason: string;
};

/**
 * Calculate ICP score for an account based on various factors
 */
export async function calculateICPScore(accountId: string): Promise<ScoreBreakdown> {
  const account = await prisma.targetAccount.findUnique({
    where: { id: accountId },
    include: {
      people: true,
    },
  });

  if (!account) {
    throw new Error('Account not found');
  }

  const factors: ScoreFactors = {
    personaMatch: 0,
    executiveCount: 0,
    totalContacts: 0,
    dataCompleteness: 0,
  };

  // 1. Persona Match (0-40 points)
  // Higher value personas get more points
  const personaCounts = {
    execOps: account.people.filter((p) => p.isExecOps).length,
    ops: account.people.filter((p) => p.isOps).length,
    proc: account.people.filter((p) => p.isProc).length,
    sales: account.people.filter((p) => p.isSales).length,
    tech: account.people.filter((p) => p.isTech).length,
  };

  factors.personaMatch += Math.min(personaCounts.execOps * 10, 20); // Up to 20 points for exec ops
  factors.personaMatch += Math.min(personaCounts.ops * 5, 10); // Up to 10 points for ops
  factors.personaMatch += Math.min(personaCounts.proc * 3, 6); // Up to 6 points for procurement
  factors.personaMatch += Math.min(personaCounts.sales * 2, 4); // Up to 4 points for sales

  // 2. Executive Count (0-20 points)
  const execCount = personaCounts.execOps;
  if (execCount >= 5) {
    factors.executiveCount = 20;
  } else if (execCount >= 3) {
    factors.executiveCount = 15;
  } else if (execCount >= 2) {
    factors.executiveCount = 10;
  } else if (execCount >= 1) {
    factors.executiveCount = 5;
  }

  // 3. Total Contacts (0-20 points)
  const contactCount = account.people.length;
  if (contactCount >= 10) {
    factors.totalContacts = 20;
  } else if (contactCount >= 7) {
    factors.totalContacts = 15;
  } else if (contactCount >= 5) {
    factors.totalContacts = 10;
  } else if (contactCount >= 3) {
    factors.totalContacts = 5;
  }

  // 4. Data Completeness (0-20 points)
  let filledFields = 0;
  const totalFields = 5;

  if (account.name) filledFields++;
  if (account.website) filledFields++;
  if (account.industry) filledFields++;
  if (account.headquarters) filledFields++;
  if (account.notes) filledFields++;

  factors.dataCompleteness = Math.round((filledFields / totalFields) * 20);

  // Calculate total
  const total = Math.min(
    factors.personaMatch +
      factors.executiveCount +
      factors.totalContacts +
      factors.dataCompleteness,
    100
  );

  return {
    ...factors,
    total,
    reason: 'auto_calculated',
  };
}

/**
 * Update account score and log to history
 */
export async function updateAccountScore(
  accountId: string,
  newScore: number,
  reason: 'manual_override' | 'auto_calculated' | 'csv_import',
  changedBy?: string,
  notes?: string
): Promise<void> {
  const account = await prisma.targetAccount.findUnique({
    where: { id: accountId },
    select: { icpScore: true },
  });

  if (!account) {
    throw new Error('Account not found');
  }

  // Update account score
  await prisma.targetAccount.update({
    where: { id: accountId },
    data: { icpScore: newScore },
  });

  // Log to history
  await prisma.scoreHistory.create({
    data: {
      accountId,
      oldScore: account.icpScore,
      newScore,
      reason,
      changedBy,
      notes,
    },
  });
}
