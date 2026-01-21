import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

// Generate location mapping data for visualization
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

    const locationPrompt = `Research facility locations for "${company.account.name}".

Company Context:
${company.industryContext || 'Not available'}

Find and structure location data:
1. Headquarters location (city, state)
2. Known facility locations
3. Geographic concentration (states/regions)
4. Distribution strategy (hub-and-spoke, distributed, regional clusters)

Search for:
- LinkedIn locations listed
- Press releases mentioning cities/states
- Job postings in different locations
- Company website "locations" page mentions

Format as JSON with arrays of locations:
{
  "headquarters": {
    "city": string,
    "state": string,
    "country": "USA"
  },
  "facilities": [
    {
      "city": string,
      "state": string,
      "type": "Distribution" | "Office" | "Warehouse" | "Unknown"
    }
  ],
  "geographicSpread": {
    "states": [string],
    "regions": ["Northeast" | "Southeast" | "Midwest" | "Southwest" | "West"],
    "concentration": "Single State" | "Regional" | "National" | "International"
  },
  "distributionStrategy": string
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
            content: 'You are a business intelligence researcher specializing in facility location analysis.',
          },
          {
            role: 'user',
            content: locationPrompt,
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
    const locationData = JSON.parse(openaiData.choices[0].message.content);

    // Update company dossier with location mapping
    const updatedCompany = await prisma.companyDossier.update({
      where: { id: companyId },
      data: {},
    });

    return NextResponse.json({
      company: updatedCompany,
      locationData,
      message: 'Location mapping completed',
    });
  } catch (error) {
    console.error('Error mapping locations:', error);
    return NextResponse.json({ error: 'Failed to map locations' }, { status: 500 });
  }
}
