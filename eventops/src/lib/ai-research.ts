import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateCompanyResearch(companyName: string, website?: string) {
  const prompt = `Research and create a comprehensive business dossier for ${companyName}${website ? ` (${website})` : ''}.

Provide the following in a structured JSON format:
1. companyOverview: A 2-3 sentence summary of what the company does
2. recentNews: Any notable recent developments or announcements (if you know of any)
3. industryContext: Key trends in their industry that would be relevant for outreach
4. keyPainPoints: 3-5 common operational challenges companies like this face
5. companySize: Estimated employee count and revenue bracket (if known)

Focus on logistics, supply chain, and operations context since this is for Manifest conference attendees.

Return ONLY valid JSON, no markdown formatting.`;

  try {
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
  channel: 'EMAIL' | 'LINKEDIN' | 'PHONE'
) {
  const eventName = 'Manifest 2026';
  
  const prompt = `Write a highly personalized ${channel.toLowerCase()} outreach message for:

Person: ${personName}
Title: ${personTitle || 'Not specified'}
Company: ${companyName}
Role/Persona: ${persona}
Event: ${eventName}

Company Context:
${JSON.stringify(companyDossier, null, 2)}

Requirements:
- Natural, conversational tone (not salesy)
- Reference specific company context or pain points
- Mention ${eventName} naturally
- Keep it concise (3-4 short paragraphs for email, 2-3 for LinkedIn)
- Include a soft call-to-action
- Sound like it's from a peer, not a vendor
${channel === 'EMAIL' ? '- Include a subject line' : ''}

Return JSON with:
${channel === 'EMAIL' ? '- subject: email subject line\n' : ''}- message: the outreach message body

Return ONLY valid JSON, no markdown formatting.`;

  try {
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
