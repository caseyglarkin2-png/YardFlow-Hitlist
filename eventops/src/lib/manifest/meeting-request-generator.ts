import { geminiClient } from '@/lib/ai/gemini-client';
import { logger } from '@/lib/logger';

export interface ManifestRequestInput {
  contactName: string;
  companyName: string;
  title: string;
  facilityCount?: string;
  keyPainPoint?: string;
  roiEstimate?: string;
}

/**
 * Generates a compelling 250-character meeting request for Manifest 2026 conference.
 *
 * Manifest app has a 250-character limit for meeting requests.
 * This function uses AI to create personalized, value-focused messages.
 *
 * @param input - Contact and company context for personalization
 * @returns Meeting request message (max 250 characters)
 */
export async function generateManifestRequest(input: ManifestRequestInput): Promise<string> {
  logger.info('Generating Manifest meeting request', {
    contactName: input.contactName,
    companyName: input.companyName,
  });

  const prompt = `
Generate a compelling meeting request message for Manifest 2026 conference matchmaking app.

Contact: ${input.contactName}, ${input.title} at ${input.companyName}
${input.facilityCount ? `Facilities: ${input.facilityCount}` : ''}
${input.keyPainPoint ? `Pain Point: ${input.keyPainPoint}` : ''}
${input.roiEstimate ? `ROI Opportunity: ${input.roiEstimate}` : ''}

Requirements:
- MAXIMUM 250 characters (strict limit, critical!)
- Mention "YardFlow Yard Network System" or "YardFlow"
- Reference their specific pain point if available
- Include "Booth #1847" or "#1847"
- Professional, concise, value-focused tone
- No fluff, pleasantries, or generic language
- Get straight to the point
- Focus on business value

Output ONLY the message text with no additional commentary, explanation, or formatting.
`;

  try {
    const response = await geminiClient.generateContent(prompt);
    // Response is already a string from geminiClient
    const message = response.trim();

    // Remove any quotes that AI might add
    const cleanMessage = message.replace(/^["']|["']$/g, '');

    // Enforce 250 character limit with truncation
    if (cleanMessage.length > 250) {
      logger.warn('Generated message exceeded 250 chars, truncating', {
        originalLength: cleanMessage.length,
      });
      return cleanMessage.substring(0, 247) + '...';
    }

    logger.info('Manifest request generated successfully', {
      length: cleanMessage.length,
    });

    return cleanMessage;
  } catch (error) {
    logger.error('Failed to generate Manifest request', { error, input });

    // Fallback to template-based message if AI fails
    return generateFallbackMessage(input);
  }
}

/**
 * Generates a fallback message if AI generation fails.
 * Uses simple templating to ensure we always have a valid message.
 */
function generateFallbackMessage(input: ManifestRequestInput): string {
  const facilityMention = input.facilityCount ? ` with ${input.facilityCount} facilities` : '';

  const painPointMention = input.keyPainPoint ? ` re: ${input.keyPainPoint}` : '';

  let message = `${input.contactName}, I'd love to discuss how YardFlow's Yard Network System can help ${input.companyName}${facilityMention}${painPointMention}. Visit booth #1847 at Manifest!`;

  // Ensure under 250 characters
  if (message.length > 250) {
    message = `${input.contactName}, let's discuss YardFlow for ${input.companyName}${facilityMention}. Booth #1847 at Manifest!`;
  }

  // Final safety check
  if (message.length > 250) {
    message = `${input.contactName}, YardFlow demo at Manifest booth #1847? ${input.companyName} could benefit.`;
  }

  logger.info('Generated fallback Manifest message', { length: message.length });

  return message.substring(0, 250);
}

/**
 * Validates a Manifest meeting request message.
 *
 * @param message - The message to validate
 * @returns Validation result with any errors
 */
export function validateManifestRequest(message: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Critical validations
  if (message.length === 0) {
    errors.push('Message cannot be empty');
  }

  if (message.length > 250) {
    errors.push(`Message exceeds 250 characters (${message.length} chars)`);
  }

  // Recommended validations
  if (!message.toLowerCase().includes('booth') && !message.includes('#1847')) {
    warnings.push('Message should include booth number (#1847)');
  }

  if (!message.toLowerCase().includes('yardflow')) {
    warnings.push('Message should mention YardFlow');
  }

  if (message.length < 50) {
    warnings.push('Message is very short, may lack context');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
