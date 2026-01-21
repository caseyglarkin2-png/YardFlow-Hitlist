import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

// Classify operational scale and competitive positioning
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

    const analysisPrompt = `Analyze the operational scale and competitive positioning of "${company.account.name}".

Company Context:
${company.industryContext || 'Not available'}

Facility Count: ${company.facilityCount || 'Unknown'}

Provide comprehensive analysis:

1. OPERATIONAL SCALE TIER:
   - Micro (1-2 locations, local)
   - Small (3-10 locations, regional)
   - Medium (11-50 locations, multi-regional)
   - Large (51-200 locations, national)
   - Enterprise (201+ locations, international)

2. COMPETITIVE POSITIONING:
   - Market position (Niche player, Regional leader, National player, Industry leader)
   - Key differentiators
   - Likely competitors
   - Strategic advantages

3. TECHNOLOGY SOPHISTICATION:
   - Current tech stack indicators
   - Digital maturity level (Low/Medium/High)
   - Likely pain points for yard management

4. GROWTH TRAJECTORY:
   - Recent expansion indicators
   - Growth stage (Startup, Growth, Mature, Consolidating)
   - M&A activity signals

Format as JSON:
{
  "scaleTier": "Micro" | "Small" | "Medium" | "Large" | "Enterprise",
  "marketPosition": string,
  "competitors": [string],
  "differentiators": [string],
  "techSophistication": "Low" | "Medium" | "High",
  "painPoints": [string],
  "growthStage": "Startup" | "Growth" | "Mature" | "Consolidating",
  "maActivity": string,
  "targetingRecommendation": string
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
            content: 'You are a competitive intelligence analyst specializing in logistics, supply chain, and yard management industries.',
          },
          {
            role: 'user',
            content: analysisPrompt,
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
    const analysis = JSON.parse(openaiData.choices[0].message.content);

    // Update company dossier with competitive intel
    const updatedCompany = await prisma.companyDossier.update({
      where: { id: companyId },
      data: {},
    });

    return NextResponse.json({
      company: updatedCompany,
      analysis,
      message: 'Competitive analysis completed',
    });
  } catch (error) {
    console.error('Error analyzing company:', error);
    return NextResponse.json({ error: 'Failed to analyze company' }, { status: 500 });
  }
}
