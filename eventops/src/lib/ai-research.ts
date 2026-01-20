import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export async function generateCompanyResearch(companyName: string, website?: string) {
  const prompt = `Research and create a comprehensive business dossier for ${companyName}${website ? ` (${website})` : ''}.

Provide the following in a structured JSON format:
1. companyOverview: A 2-3 sentence summary of what the company does
2. recentNews: Any notable recent developments or announcements (if you know of any)
3. industryContext: Key trends in their industry that would be relevant for outreach
4. keyPainPoints: 3-5 common operational challenges companies like this face
5. companySize: Estimated employee count and revenue bracket (if known)
6. facilityCount: Estimated number of warehouses, distribution centers, or facilities in their network (if applicable)
7. locations: Key geographic markets or regions they operate in
8. operationalScale: Describe their supply chain footprint (e.g., "regional 3PL", "national retailer with 500+ stores", "global manufacturer")

Focus on logistics, supply chain, and operations context since this is for Manifest conference attendees.

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a B2B research analyst specializing in logistics and supply chain companies. Provide accurate, concise business intelligence.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');

    return JSON.parse(content);
  } catch (error) {
    console.error('Error generating company research:', error);
    throw error;
  }
}

export async function generatePersonalizedOutreach(
  personName: string,
  personTitle: string | null,
  companyName: string,
  persona: string,
  companyDossier: any,
  channel: 'EMAIL' | 'LINKEDIN' | 'PHONE',
  contactInsights?: any,
  roiData?: any
) {
  const eventName = 'Manifest 2026';
  
  let contextSection = `Company Context:
${JSON.stringify(companyDossier, null, 2)}`;

  if (contactInsights) {
    contextSection += `

Contact-Specific Insights:
- Role: ${contactInsights.roleContext}
- Pain Points: ${contactInsights.likelyPainPoints}
- ROI Opportunity: ${contactInsights.roiOpportunity}`;
  }

  if (roiData) {
    const savings = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(roiData.annualSavings);
    
    contextSection += `

ROI Calculation:
- Estimated Annual Savings: ${savings}
- Payback Period: ${roiData.paybackPeriod} months
- Based on: ${roiData.assumptions?.totalFacilities || 'N/A'} facilities`;
  }
  
  const prompt = `Write a highly personalized ${channel.toLowerCase()} outreach message for:

Person: ${personName}
Title: ${personTitle || 'Not specified'}
Company: ${companyName}
Role/Persona: ${persona}
Event: ${eventName}

${contextSection}

Requirements:
- Natural, conversational tone (not salesy)
- Reference specific company context or pain points
${roiData ? '- Subtly reference the ROI opportunity (don\'t quote exact numbers, but hint at the scale of value)' : ''}
${contactInsights ? '- Address their specific role context and pain points' : ''}
- Mention ${eventName} naturally
- Keep it concise (3-4 short paragraphs for email, 2-3 for LinkedIn)
- Include a soft call-to-action
- Sound like it's from a peer, not a vendor
${channel === 'EMAIL' ? '- Include a subject line' : ''}

Return JSON with:
${channel === 'EMAIL' ? '- subject: email subject line\n' : ''}- message: the outreach message body

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at writing authentic, personalized B2B outreach that builds genuine connections. You write like a human, not a marketing bot.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');

    return JSON.parse(content);
  } catch (error) {
    console.error('Error generating outreach:', error);
    throw error;
  }
}
