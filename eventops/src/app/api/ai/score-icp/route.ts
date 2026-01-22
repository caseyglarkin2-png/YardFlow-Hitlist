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
    let reasoning: string[] = [];

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

      // Company size (0-25 points)
      const employees = account.employeeCount || 0;
      if (employees >= 500) {
        score += 25;
        reasoning.push(`✅ Enterprise size: ${employees} employees (+25)`);
      } else if (employees >= 100) {
        score += 15;
        reasoning.push(`✅ Mid-market size: ${employees} employees (+15)`);
      } else {
        score += 5;
        reasoning.push(`⚠️ Small company: ${employees} employees (+5)`);
      }

      // Revenue (0-20 points)
      const revenue = account.revenue || 0;
      if (revenue >= 50_000_000) {
        score += 20;
        reasoning.push(`✅ High revenue: $${(revenue / 1_000_000).toFixed(1)}M (+20)`);
      } else if (revenue >= 10_000_000) {
        score += 10;
        reasoning.push(`✅ Medium revenue: $${(revenue / 1_000_000).toFixed(1)}M (+10)`);
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

      // Location (0-10 points)
      const preferredLocations = ['United States', 'Canada', 'United Kingdom', 'Germany'];
      if (account.location && preferredLocations.some(loc => account.location?.includes(loc))) {
        score += 10;
        reasoning.push(`✅ Target location: ${account.location} (+10)`);
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
        include: { account: true },
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
        person.isSupplyChain,
        person.isITTech,
        person.isProcurement,
        person.isFacilities,
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
      if (person.account.icpScore && person.account.icpScore >= 70) {
        score += 10;
        reasoning.push(`✅ High-value account (${person.account.icpScore}/100) (+10)`);
      }

      // Update score in database
      await prisma.people.update({
        where: { id: personId },
        data: { icpScore: score },
      });
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
