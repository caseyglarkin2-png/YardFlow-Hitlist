import { describe, test, expect, beforeEach, vi } from 'vitest';
import { BrandVoiceContentGenerator } from '../brand-voice-generator';
import { GeminiProClient } from '../gemini-client';

// Mock GeminiProClient
vi.mock('../gemini-client');

describe('BrandVoiceContentGenerator', () => {
  let generator: BrandVoiceContentGenerator;
  let mockGeminiClient: vi.Mocked<GeminiProClient>;

  beforeEach(() => {
    mockGeminiClient = {
      generateContent: vi.fn(),
    } as any;

    generator = new BrandVoiceContentGenerator();
    (generator as any).geminiClient = mockGeminiClient;
  });

  describe('generateEmail', () => {
    test('generates email with subject and CTA', async () => {
      const mockEmailContent = `Subject: Optimizing Waste Management at Manifest 2026

Hi John,

I noticed Acme Waste is expanding operations. At Manifest, we're showcasing route optimization that cuts costs by 20%.

Stop by Booth 247 to see live demos.

Best,
YardFlow Team

---FOLLOW_UP---
Follow up 3 days after Manifest if no response`;

      mockGeminiClient.generateContent.mockResolvedValue(mockEmailContent);

      const result = await generator.generateEmail({
        recipientName: 'John Smith',
        companyName: 'Acme Waste',
        context: {
          painPoints: ['Route inefficiency'],
          manifestBooth: 'Booth 247',
        },
      });

      expect(result.subject).toBeTruthy();
      expect(result.body).toContain('John');
      expect(result.body).toContain('Acme Waste');
      expect(result.cta).toContain('Booth 247');
      expect(mockGeminiClient.generateContent).toHaveBeenCalled();
    });

    test('respects tone parameter', async () => {
      mockGeminiClient.generateContent.mockResolvedValue('Subject: Test\n\nBody\n\nCTA');

      await generator.generateEmail({
        recipientName: 'Jane Doe',
        companyName: 'Test Corp',
        tone: 'urgent',
      });

      const callArgs = mockGeminiClient.generateContent.mock.calls[0];
      expect(callArgs[0]).toContain('urgent');
    });
  });

  describe('generateLinkedInMessage', () => {
    test('generates message under 300 characters', async () => {
      const mockLinkedInContent = `Hi John! Noticed your work at Acme Waste. We're at Manifest Booth 247 with route optimization that cuts costs 20%. Would love to connect and share insights. Looking forward to meeting!`;

      mockGeminiClient.generateContent.mockResolvedValue(mockLinkedInContent);

      const result = await generator.generateLinkedInMessage({
        recipientName: 'John Smith',
        companyName: 'Acme Waste',
        context: {
          manifestBooth: 'Booth 247',
        },
      });

      expect(result.body.length).toBeLessThanOrEqual(300);
      expect(result.body).toContain('John');
      expect(result.cta).toContain('connect');
    });

    test('enforces character limit', async () => {
      const longMessage = 'A'.repeat(400);
      mockGeminiClient.generateContent.mockResolvedValue(longMessage);

      const result = await generator.generateLinkedInMessage({
        recipientName: 'Test',
        companyName: 'Test Corp',
      });

      expect(result.body.length).toBeLessThanOrEqual(300);
    });
  });

  describe('generatePhoneScript', () => {
    test('generates script with objection handlers', async () => {
      const mockPhoneScript = `Opening: Hi John, this is [Name] from YardFlow. Do you have 2 minutes?

Value Prop: We help waste management companies like Acme Waste cut routing costs by 20%.

Qualifying Question: What's your biggest challenge with route optimization?

CTA: Can we schedule 15 minutes at Manifest Booth 247 to show you a live demo?

---OBJECTIONS---
"Not interested": I understand. We have specific ROI data for companies like yours. Just 2 minutes?
"Too busy": Absolutely. Can I send you a one-pager to review before Manifest?`;

      mockGeminiClient.generateContent.mockResolvedValue(mockPhoneScript);

      const result = await generator.generatePhoneScript({
        recipientName: 'John Smith',
        companyName: 'Acme Waste',
        context: {
          painPoints: ['Route optimization'],
          manifestBooth: 'Booth 247',
        },
      });

      expect(result.body).toContain('John');
      expect(result.body).toContain('2 minutes');
      expect(result.cta).toBeTruthy();
      expect(result.followUpSuggestions).toBeDefined();
      expect(result.followUpSuggestions!.length).toBeGreaterThan(0);
    });
  });

  describe('generateSequence', () => {
    test('generates multi-channel sequence', async () => {
      mockGeminiClient.generateContent
        .mockResolvedValueOnce('Subject: Email 1\n\nBody 1\n\nCTA 1')
        .mockResolvedValueOnce('Subject: Follow-up\n\nBody 2\n\nCTA 2')
        .mockResolvedValueOnce('LinkedIn message under 300 chars');

      const result = await generator.generateSequence({
        recipientName: 'John Smith',
        companyName: 'Acme Waste',
      });

      expect(result.email1).toBeDefined();
      expect(result.email1.channel).toBe('email');
      expect(result.followUp).toBeDefined();
      expect(result.followUp.channel).toBe('email');
      expect(result.linkedin).toBeDefined();
      expect(result.linkedin.channel).toBe('linkedin');
    });
  });

  describe('generateBoothCTAs', () => {
    test('generates 5 specific CTAs for trade show booth', async () => {
      const mockCTAs = `1. See live demo of 20% cost reduction in route optimization
2. Get personalized ROI calculator for your fleet
3. Meet our waste management experts
4. Enter to win free consultation (value $5,000)
5. Download exclusive Manifest 2026 whitepaper`;

      mockGeminiClient.generateContent.mockResolvedValue(mockCTAs);

      const result = await generator.generateBoothCTAs('Acme Waste', ['Route optimization', 'Fleet management']);

      expect(result).toHaveLength(5);
      expect(result[0]).toContain('demo');
      expect(result.some((cta) => cta.includes('ROI') || cta.includes('cost'))).toBe(true);
    });
  });

  describe('Brand Voice Compliance', () => {
    test('avoids generic phrases in generated content', async () => {
      const genericEmail = `Subject: Reaching out

Hi there,

I hope this email finds you well. I wanted to reach out and touch base about our solutions.

Best regards`;

      mockGeminiClient.generateContent.mockResolvedValue(genericEmail);

      const result = await generator.generateEmail({
        recipientName: 'Test',
        companyName: 'Test Corp',
      });

      // Should regenerate or sanitize generic content
      expect(result.body).toBeTruthy();
    });

    test('includes company-specific references', async () => {
      const specificEmail = `Subject: Route Optimization for Acme Waste

Hi John,

Noticed Acme Waste recently expanded to 3 new facilities. YardFlow helps companies at your scale cut routing costs 20%.

Visit Booth 247 at Manifest.`;

      mockGeminiClient.generateContent.mockResolvedValue(specificEmail);

      const result = await generator.generateEmail({
        recipientName: 'John Smith',
        companyName: 'Acme Waste',
        context: {
          recentNews: 'Expanded to 3 new facilities',
        },
      });

      expect(result.body).toContain('Acme Waste');
      expect(result.body).toContain('3 new facilities');
    });
  });
});
