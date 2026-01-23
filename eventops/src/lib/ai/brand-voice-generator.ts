/**
 * Brand Voice Content Generator
 * Generates multi-channel content using Gemini Pro trained on brand voice
 */

import { GeminiProClient } from './gemini-client';

export interface ContentGenerationRequest {
  recipientName: string;
  companyName: string;
  channel: 'email' | 'linkedin' | 'phone';
  context?: {
    painPoints?: string[];
    recentNews?: string;
    manifestBooth?: string;
    productFocus?: string;
  };
  tone?: 'professional' | 'casual' | 'urgent' | 'friendly';
}

export interface GeneratedContent {
  channel: string;
  subject?: string;
  body: string;
  cta: string;
  followUpSuggestions?: string[];
}

export class BrandVoiceContentGenerator {
  private gemini: GeminiProClient;
  private brandVoice: string;

  constructor(apiKey?: string) {
    this.gemini = new GeminiProClient(apiKey);
    this.brandVoice = this.getYardFlowBrandVoice();
  }

  /**
   * Get YardFlow brand voice guidelines
   */
  private getYardFlowBrandVoice(): string {
    return `YardFlow Brand Voice Guidelines:

TONE: Professional yet approachable. We're industry experts who speak plainly.

STYLE:
- Direct and value-focused
- No corporate jargon or buzzwords
- Concrete examples over abstract concepts
- Data-driven when possible
- Respectful of their time

MESSAGING FRAMEWORK:
- Lead with the problem they're facing
- Show we understand their specific challenges
- Offer actionable insights or value
- Clear, specific call-to-action
- Make it easy to say yes

MANIFEST CONTEXT:
- Trade show is our home turf - we're here to help
- Focus on practical conversations, not sales pitches
- Offer specific ROI data for their industry
- Invite to see live demos at our booth
- Follow-up is always promised and delivered

AVOID:
- Generic "touching base" or "circling back"
- Overpromising or hype
- Long-winded intros
- Asking for meetings without context
- Multiple CTAs (pick one clear next step)

EMAIL STRUCTURE:
- Subject: Specific, value-focused (not "Quick question")
- Opening: Reference their company specifically
- Body: 2-3 short paragraphs max
- CTA: Single, clear, easy action
- Signature: Professional with Manifest booth info`;
  }

  /**
   * Generate email content
   */
  async generateEmail(request: ContentGenerationRequest): Promise<GeneratedContent> {
    const prompt = `${this.brandVoice}

Generate a sales outreach email for:
- Recipient: ${request.recipientName} at ${request.companyName}
- Context: ${JSON.stringify(request.context || {})}
- Tone: ${request.tone || 'professional'}

The email is for Manifest 2026 trade show outreach. Generate JSON with:
{
  "subject": "compelling subject line",
  "body": "email body text (2-3 paragraphs)",
  "cta": "clear call-to-action",
  "followUpSuggestions": ["follow-up 1", "follow-up 2"]
}

Make it specific to their company. Reference Manifest booth. Keep it under 150 words.`;

    const content = await this.gemini.generateJSON<{
      subject: string;
      body: string;
      cta: string;
      followUpSuggestions: string[];
    }>(prompt);

    return {
      channel: 'email',
      ...content,
    };
  }

  /**
   * Generate LinkedIn message
   */
  async generateLinkedInMessage(request: ContentGenerationRequest): Promise<GeneratedContent> {
    const prompt = `${this.brandVoice}

Generate a LinkedIn connection request or message for:
- Recipient: ${request.recipientName} at ${request.companyName}
- Context: ${JSON.stringify(request.context || {})}

LinkedIn messages must be:
- Under 300 characters for connection requests
- Personalized and professional
- Clear reason for connecting
- Manifest 2026 context

Generate JSON with:
{
  "body": "message text",
  "cta": "clear next step"
}`;

    const content = await this.gemini.generateJSON<{
      body: string;
      cta: string;
    }>(prompt);

    return {
      channel: 'linkedin',
      ...content,
    };
  }

  /**
   * Generate phone script
   */
  async generatePhoneScript(request: ContentGenerationRequest): Promise<GeneratedContent> {
    const prompt = `${this.brandVoice}

Generate a phone conversation opener for:
- Recipient: ${request.recipientName} at ${request.companyName}
- Context: ${JSON.stringify(request.context || {})}

Phone scripts should:
- Respect their time (ask if they have 2 minutes)
- State purpose immediately
- Reference Manifest or specific value prop
- Ask qualifying question
- Suggest next step

Generate JSON with:
{
  "body": "phone script with clear structure",
  "cta": "proposed next step",
  "followUpSuggestions": ["objection handler 1", "objection handler 2"]
}`;

    const content = await this.gemini.generateJSON<{
      body: string;
      cta: string;
      followUpSuggestions: string[];
    }>(prompt);

    return {
      channel: 'phone',
      ...content,
    };
  }

  /**
   * Generate multi-channel sequence
   */
  async generateSequence(request: ContentGenerationRequest): Promise<{
    email1: GeneratedContent;
    followUp: GeneratedContent;
    linkedin: GeneratedContent;
  }> {
    const [email1, followUp, linkedin] = await Promise.all([
      this.generateEmail(request),
      this.generateEmail({
        ...request,
        context: {
          ...request.context,
          isFollowUp: true,
        } as any,
      }),
      this.generateLinkedInMessage(request),
    ]);

    return { email1, followUp, linkedin };
  }

  /**
   * Generate trade show booth CTAs
   */
  async generateBoothCTAs(companyName: string, painPoints?: string[]): Promise<string[]> {
    const prompt = `Generate 5 specific, value-focused CTAs for inviting ${companyName} to our Manifest 2026 booth.

${painPoints ? `Their pain points: ${painPoints.join(', ')}` : ''}

CTAs should:
- Be specific to their challenges
- Mention live demo or ROI calculator
- Include booth number or time slot
- Be action-oriented
- Offer immediate value

Return JSON array of 5 CTAs.`;

    const ctas = await this.gemini.generateJSON<string[]>(prompt);
    return ctas;
  }
}
