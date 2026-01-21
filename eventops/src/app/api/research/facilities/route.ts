import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

// Enhanced facility count research using AI
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    const company = await prisma.companyDossier.findUnique({
      where: { id: companyId },
      include: { account: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Use AI to research facility count with multiple data points
    const researchPrompt = `Research the company "${company.account.name}" and estimate their facility count.

Company Context:
${company.industryContext || 'Not available'}

Consider these factors:
1. Public company filings (10-K, annual reports)
2. LinkedIn company size and locations
3. Press releases about expansions or closures
4. Industry benchmarks for similar companies
5. Geographic presence (multi-state, regional, national)

Provide:
1. Estimated facility count (conservative)
2. Confidence level (Low/Medium/High)
3. Data sources found
4. Reasoning for estimate
5. Operational footprint type (Single location, Regional, National, International)

Format as JSON:
{
  "estimatedFacilities": number,
  "confidenceLevel": "Low" | "Medium" | "High",
  "dataSources": ["source1", "source2"],
  "reasoning": "explanation",
  "footprintType": "Single location" | "Regional" | "National" | "International",
  "scaleIndicators": ["indicator1", "indicator2"]
}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a business intelligence researcher specializing in facility and operational footprint analysis.',
          },
          {
            role: 'user',
            content: researchPrompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API request failed');
    }

    const openaiData = await openaiResponse.json();
    const researchData = JSON.parse(openaiData.choices[0].message.content);

    // Update company dossier with enhanced facility insights
    const updatedCompany = await prisma.companyDossier.update({
      where: { id: companyId },
      data: {
        facilityCount: researchData.estimatedFacilities,
      },
    });

    return NextResponse.json({
      company: updatedCompany,
      research: researchData,
      message: 'Facility research completed',
    });
  } catch (error) {
    console.error('Error researching facility count:', error);
    return NextResponse.json({ error: 'Failed to research facility count' }, { status: 500 });
  }
}
