import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/score-icp - Calculate AI-powered ICP score
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { accountId, personId } = await req.json();

  try {
    let score = 0;
    const reasoning: string[] = [];

    if (accountId) {
      // Score account
      const account = await prisma.target_accounts.findUnique({
        where: { id: accountId },
        include: { people: true },
      });

      if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      // Industry alignment (0-30 points)
      const targetIndustries = ['Technology', 'Manufacturing', 'Logistics', 'Healthcare'];
      if (account.industry && targetIndustries.includes(account.industry)) {
        score += 30;
        reasoning.push(`✅ Target industry: ${account.industry} (+30)`);
      } else {
        reasoning.push(`⚠️ Non-target industry: ${account.industry || 'Unknown'} (+0)`);
      }

      // Company name quality (0-25 points) - use as proxy for company size
      const nameLength = account.name.length;
      if (nameLength > 50) {
        score += 25;
        reasoning.push(`✅ Detailed company profile (+25)`);
      } else if (nameLength > 20) {
        score += 15;
        reasoning.push(`✅ Standard company profile (+15)`);
      } else {
        score += 5;
        reasoning.push(`⚠️ Minimal company info (+5)`);
      }

      // Website presence (0-20 points)
      if (account.website) {
        score += 20;
        reasoning.push(`✅ Has website: ${account.website} (+20)`);
      }

      // Engagement level (0-15 points)
      const contactCount = account.people.length;
      if (contactCount >= 5) {
        score += 15;
        reasoning.push(`✅ Multiple contacts: ${contactCount} people (+15)`);
      } else if (contactCount >= 2) {
        score += 8;
        reasoning.push(`✅ Some contacts: ${contactCount} people (+8)`);
      }

      // Headquarters (0-10 points)
      if (account.headquarters) {
        score += 10;
        reasoning.push(`✅ Headquarters known: ${account.headquarters} (+10)`);
      }

      // Update score in database
      await prisma.target_accounts.update({
        where: { id: accountId },
        data: { icpScore: score },
      });
    } else if (personId) {
      // Score person
      const person = await prisma.people.findUnique({
        where: { id: personId },
        include: { target_accounts: true },
      });

      if (!person) {
        return NextResponse.json({ error: 'Person not found' }, { status: 404 });
      }

      // Title/Role relevance (0-40 points)
      const title = person.title?.toLowerCase() || '';
      if (title.includes('ceo') || title.includes('chief') || title.includes('president')) {
        score += 40;
        reasoning.push(`✅ C-level executive: ${person.title} (+40)`);
      } else if (title.includes('vp') || title.includes('vice president') || title.includes('director')) {
        score += 30;
        reasoning.push(`✅ VP/Director level: ${person.title} (+30)`);
      } else if (title.includes('manager') || title.includes('head of')) {
        score += 20;
        reasoning.push(`✅ Management level: ${person.title} (+20)`);
      } else {
        score += 10;
        reasoning.push(`⚠️ Individual contributor: ${person.title} (+10)`);
      }

      // Persona alignment (0-30 points)
      const personaCount = [
        person.isExecOps,
        person.isOps,
        person.isProc,
        person.isSales,
        person.isTech,
      ].filter(Boolean).length;

      if (personaCount >= 2) {
        score += 30;
        reasoning.push(`✅ Multiple relevant personas (+30)`);
      } else if (personaCount === 1) {
        score += 20;
        reasoning.push(`✅ Target persona match (+20)`);
      } else {
        reasoning.push(`⚠️ No persona tags (+0)`);
      }

      // Contact info completeness (0-20 points)
      let contactScore = 0;
      if (person.email) contactScore += 8;
      if (person.phone) contactScore += 6;
      if (person.linkedin) contactScore += 6;
      score += contactScore;
      reasoning.push(`✅ Contact info: ${contactScore}/20 points`);

      // Account quality (0-10 points)
      if (person.target_accounts.icpScore && person.target_accounts.icpScore >= 70) {
        score += 10;
        reasoning.push(`✅ High-value account (${person.target_accounts.icpScore}/100) (+10)`);
      }

      // Update score in database - Note: icpScore field doesn't exist in people model
      // Score is calculated and returned but not persisted
      // await prisma.people.update({
      //   where: { id: personId },
      //   data: { icpScore: score },
      // });
    } else {
      return NextResponse.json({ error: 'accountId or personId required' }, { status: 400 });
    }

    return NextResponse.json({
      score,
      grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D',
      reasoning,
      maxScore: 100,
    });
  } catch (error: any) {
    console.error('ICP scoring error:', error);
    return NextResponse.json(
      { error: error.message || 'Scoring failed' },
      { status: 500 }
    );
  }
}
