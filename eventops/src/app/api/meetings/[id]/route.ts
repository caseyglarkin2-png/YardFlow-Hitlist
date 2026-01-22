import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const dynamic = 'force-dynamic';

/**
 * Get meeting details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const meeting = await prisma.meeting.findUnique({
    where: { id: params.id },
    include: {
      people: {
        include: {
          target_accounts: {
            include: {
              dossier: true,
            },
          },
          insights: true,
        },
      },
    },
  });

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }

  return NextResponse.json(meeting);
}

/**
 * Update meeting
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await req.json();

  const meeting = await prisma.meeting.update({
    where: { id: params.id },
    data,
    include: {
      people: {
        include: {
          target_accounts: true,
        },
      },
    },
  });

  return NextResponse.json(meeting);
}

/**
 * Delete meeting
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.meeting.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}

/**
 * Generate meeting prep document
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action } = await req.json();

  if (action !== 'generate-prep') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const meeting = await prisma.meeting.findUnique({
    where: { id: params.id },
    include: {
      people: {
        include: {
          target_accounts: {
            include: {
              dossier: true,
              roiCalculations: {
                orderBy: { calculatedAt: 'desc' },
                take: 1,
              },
            },
          },
          insights: true,
        },
      },
    },
  });

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }

  // Generate prep document using AI
  const prompt = `Generate a concise meeting preparation document for the following meeting:

Contact: ${meeting.people.name}
Title: ${meeting.people.title || 'Unknown'}
Company: ${meeting.people.target_accounts.name}
Industry: ${meeting.people.target_accounts.industry || 'Unknown'}

${meeting.people.target_accounts.dossier ? `
Company Context:
${meeting.people.target_accounts.dossier.companyOverview}

Key Pain Points:
${meeting.people.target_accounts.dossier.keyPainPoints}

Operational Scale:
${meeting.people.target_accounts.dossier.operationalScale}
` : ''}

${meeting.people.insights ? `
Contact Insights:
- Role Context: ${meeting.people.insights.roleContext}
- Pain Points: ${meeting.people.insights.likelyPainPoints}
- Suggested Approach: ${meeting.people.insights.suggestedApproach}
- ROI Opportunity: ${meeting.people.insights.roiOpportunity}
` : ''}

${meeting.people.target_accounts.roiCalculations?.[0] ? `
ROI Estimate:
- Annual Savings: $${meeting.people.target_accounts.roiCalculations[0].annualSavings?.toLocaleString()}
- Payback Period: ${meeting.people.target_accounts.roiCalculations[0].paybackPeriod} months
- Facilities: ${meeting.people.target_accounts.roiCalculations[0].facilityCount}
` : ''}

Generate a 1-page meeting prep document with:
1. Quick Facts (2-3 key points about company)
2. Key Talking Points (3-4 bullet points)
3. ROI Pitch (1-2 sentences)
4. Questions to Ask (3-4 discovery questions)

Keep it concise and actionable.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a sales meeting preparation assistant. Generate concise, actionable prep documents.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const prepDoc = completion.choices[0].message.content;

    return NextResponse.json({
      prepDocument: prepDoc,
      meeting,
    });
  } catch (error: any) {
    console.error('Error generating prep doc:', error);
    return NextResponse.json(
      { error: 'Failed to generate prep document', details: error.message },
      { status: 500 }
    );
  }
}
