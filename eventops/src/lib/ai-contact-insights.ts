import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ContactInsightData {
  roleContext: string;
  likelyPainPoints: string[];
  suggestedApproach: string;
  roiOpportunity: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export async function generateContactInsights(
  personName: string,
  personTitle: string | null,
  persona: string,
  companyDossier: any
): Promise<ContactInsightData> {
  const prompt = `Analyze this contact and generate persona-specific insights:

Contact: ${personName}
Title: ${personTitle || 'Not specified'}
Persona: ${persona}

Company Context:
${JSON.stringify(companyDossier, null, 2)}

Generate contact-specific insights in JSON format:
1. roleContext: A 1-2 sentence description of their likely responsibilities based on title and persona
2. likelyPainPoints: Array of 3-5 pain points specific to this role at this company (considering company size, facility count, operational scale)
3. suggestedApproach: 2-3 sentences on the best way to approach this person (tone, channel preference, key topics)
4. roiOpportunity: Specific ROI opportunity for this role (e.g., "20% reduction in carrier costs" for Procurement, "15% improvement in fulfillment speed" for Operations)
5. confidence: Rate your confidence in these insights (LOW/MEDIUM/HIGH) based on available data

Be specific to this person's role, not generic. Reference the company's facility count, operational scale, or industry context.

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert B2B sales strategist who creates highly personalized contact insights for supply chain and logistics professionals. Your insights are specific, actionable, and grounded in the contact\'s role and company context.',
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
    console.error('Error generating contact insights:', error);
    throw error;
  }
}

export function getPersonaLabel(person: any): string {
  if (person.isExecOps) return "Executive Operations Leader";
  if (person.isOps) return "Operations Professional";
  if (person.isProc) return "Procurement Specialist";
  if (person.isSales) return "Sales Leader";
  if (person.isTech) return "Technology Leader";
  if (person.isNonOps) return "Business Leader";
  return "Professional";
}
