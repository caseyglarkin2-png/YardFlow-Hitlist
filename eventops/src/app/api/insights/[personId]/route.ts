import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(
  request: NextRequest,
  { params }: { params: { personId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const insights = await prisma.contact_insights.findUnique({
    where: { personId: params.personId },
  });

  return NextResponse.json(insights);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { personId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get person with account and company dossier
  const person = await prisma.people.findUnique({
    where: { id: params.personId },
    include: {
      target_accounts: {
        include: {
          company_dossiers: true,
        },
      },
    },
  });

  if (!person) {
    return NextResponse.json({ error: 'Person not found' }, { status: 404 });
  }

  // Determine persona
  const personas = [];
  if (person.isExecOps) personas.push('Executive Operations');
  if (person.isOps) personas.push('Operations Manager');
  if (person.isProc) personas.push('Procurement/Supply Chain');
  if (person.isSales) personas.push('Sales/Business Development');
  if (person.isTech) personas.push('Technology/IT');
  if (person.isNonOps) personas.push('Non-Operations');
  const primaryPersona = personas[0] || 'General Business';

  // Generate insights using AI
  const prompt = `Generate contact-specific insights for outreach planning:

Contact: ${person.name}
Title: ${person.title || 'Unknown'}
Persona: ${primaryPersona}
Company: ${person.target_accounts.name}
Industry: ${person.target_accounts.industry || 'Unknown'}

${person.target_accounts.company_dossiers ? `
Company Context:
- Overview: ${person.target_accounts.company_dossiers.companyOverview || 'Unknown'}
- Facility Count: ${person.target_accounts.company_dossiers.facilityCount || 'Unknown'}
- Operational Scale: ${person.target_accounts.company_dossiers.operationalScale || 'Unknown'}
- Key Pain Points: ${person.target_accounts.company_dossiers.keyPainPoints || 'Unknown'}
` : 'No company research available.'}

Provide insights in JSON format:
{
  "roleContext": "Brief description of their role and responsibilities (2-3 sentences)",
  "likelyPainPoints": ["Pain point 1", "Pain point 2", "Pain point 3"],
  "suggestedApproach": "How to approach this persona with YardFlow pitch (3-4 sentences)",
  "roiOpportunity": "Specific ROI/value prop for this role (2-3 sentences)",
  "confidence": "HIGH|MEDIUM|LOW (based on available data)"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'You are a B2B sales intelligence assistant. Generate contact-specific insights for warehouse/logistics software outreach.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const insightsData = JSON.parse(
      completion.choices[0].message.content || '{}'
    );

    // Save insights to database
    const insights = await prisma.contact_insights.upsert({
      where: { personId: params.personId },
      create: {
        id: crypto.randomUUID(),
        personId: params.personId,
        roleContext: insightsData.roleContext,
        likelyPainPoints: JSON.stringify(insightsData.likelyPainPoints),
        suggestedApproach: insightsData.suggestedApproach,
        roiOpportunity: insightsData.roiOpportunity,
        confidence: insightsData.confidence,
        generatedBy: session.user.id,
      },
      update: {
        roleContext: insightsData.roleContext,
        likelyPainPoints: JSON.stringify(insightsData.likelyPainPoints),
        suggestedApproach: insightsData.suggestedApproach,
        roiOpportunity: insightsData.roiOpportunity,
        confidence: insightsData.confidence,
        generatedAt: new Date(),
        generatedBy: session.user.id,
      },
    });

    return NextResponse.json(insights);
  } catch (error: any) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights', details: error.message },
      { status: 500 }
    );
  }
}
