import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ManifestRequestData {
  message: string;
  characterCount: number;
}

const MANIFEST_CHAR_LIMIT = 250;

export async function generateManifestMeetingRequest(
  personName: string,
  personTitle: string | null,
  companyName: string,
  persona: string,
  companyDossier?: any,
  roiOpportunity?: string
): Promise<ManifestRequestData> {
  const prompt = `Write a concise meeting request for the Manifest 2026 app (250 character MAXIMUM):

Contact: ${personName}, ${personTitle || 'Professional'} at ${companyName}
Persona: ${persona}
${roiOpportunity ? `Value Prop: ${roiOpportunity}` : ''}
${companyDossier?.operationalScale ? `Company Scale: ${companyDossier.operationalScale}` : ''}

Requirements:
- MAXIMUM 250 characters (critical requirement)
- Compelling reason to meet at Manifest 2026
- Reference their role or company context if possible
- Professional but conversational
- Clear value proposition
- Include soft CTA (e.g., "grab coffee at booth X")

Return JSON with:
- message: the meeting request (MUST be under 250 characters)

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at writing ultra-concise, compelling meeting requests for event networking apps. Every message MUST be under 250 characters.',
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

    const result = JSON.parse(content);
    
    // Enforce character limit
    if (result.message.length > MANIFEST_CHAR_LIMIT) {
      // Truncate intelligently at last complete sentence within limit
      let truncated = result.message.substring(0, MANIFEST_CHAR_LIMIT);
      const lastPeriod = truncated.lastIndexOf('.');
      const lastQuestion = truncated.lastIndexOf('?');
      const lastExclamation = truncated.lastIndexOf('!');
      
      const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);
      if (lastSentenceEnd > 100) { // Only truncate at sentence if it's not too short
        truncated = truncated.substring(0, lastSentenceEnd + 1);
      } else {
        // Otherwise just add ellipsis
        truncated = truncated.substring(0, MANIFEST_CHAR_LIMIT - 3) + '...';
      }
      
      result.message = truncated;
    }

    return {
      message: result.message,
      characterCount: result.message.length,
    };
  } catch (error) {
    console.error('Error generating Manifest meeting request:', error);
    throw error;
  }
}

/**
 * Generate a simple fallback meeting request without AI
 */
export function generateSimpleManifestRequest(
  personName: string,
  companyName: string,
  persona: string
): ManifestRequestData {
  const firstName = personName.split(' ')[0];
  
  let message = '';
  
  if (persona.includes('Procurement')) {
    message = `Hi ${firstName}! Would love to chat about supply chain optimization at Manifest. We've helped similar companies like ${companyName} save 15-20% on logistics. Coffee at our booth?`;
  } else if (persona.includes('Operations')) {
    message = `${firstName}, let's discuss how to streamline your ops at Manifest! We're helping companies like ${companyName} improve fulfillment speed. Quick chat at the event?`;
  } else if (persona.includes('Executive')) {
    message = `${firstName}, would love to connect at Manifest to discuss strategic ops improvements for ${companyName}. We've helped similar companies scale efficiently. Coffee?`;
  } else {
    message = `Hi ${firstName}! Excited to meet at Manifest 2026. Would love to chat about how we're helping companies like ${companyName} optimize their logistics operations. Quick coffee?`;
  }

  // Ensure under limit
  if (message.length > MANIFEST_CHAR_LIMIT) {
    message = message.substring(0, MANIFEST_CHAR_LIMIT - 3) + '...';
  }

  return {
    message,
    characterCount: message.length,
  };
}
