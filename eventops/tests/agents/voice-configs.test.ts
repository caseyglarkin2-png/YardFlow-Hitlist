import { describe, it, expect } from 'vitest';
import { VOICE_CONFIGS } from '@/lib/ai/voiceConfigs';
import { sanitizeFreightRollContent } from '@/lib/ai/content-generator';

describe('VOICE_CONFIGS', () => {
  it('exposes expected tones', () => {
    expect(Object.keys(VOICE_CONFIGS).sort()).toEqual([
      'challenger',
      'freightroll',
      'professional',
    ]);
  });

  it('matches snapshots for prompts', () => {
    expect(VOICE_CONFIGS.freightroll.prompt).toMatchSnapshot('freightroll');
    expect(VOICE_CONFIGS.professional.prompt).toMatchSnapshot('professional');
    expect(VOICE_CONFIGS.challenger.prompt).toMatchSnapshot('challenger');
  });

  describe('FreightRoll Branding Enforcement', () => {
    it.each(['freightroll', 'professional', 'challenger'] as const)(
      '%s voice config instructs AI to use FreightRoll',
      (tone) => {
        const config = VOICE_CONFIGS[tone];
        expect(config.prompt.toLowerCase()).toContain('freightroll');
      }
    );

    it.each(['freightroll', 'professional', 'challenger'] as const)(
      '%s voice config warns against YardFlow',
      (tone) => {
        const config = VOICE_CONFIGS[tone];
        // Should have instruction not to use YardFlow
        expect(config.prompt.toLowerCase()).toContain('never mention');
        expect(config.prompt.toLowerCase()).toContain('yardflow');
      }
    );
  });
});

describe('sanitizeFreightRollContent', () => {
  it('replaces YardFlow with FreightRoll', () => {
    const input = 'Hello from YardFlow team!';
    const result = sanitizeFreightRollContent(input);
    expect(result.content).toBe('Hello from FreightRoll team!');
    expect(result.wasModified).toBe(true);
  });

  it('handles case-insensitive replacement', () => {
    const input = 'YARDFLOW, yardflow, YardFlow, yARdFlOw';
    const result = sanitizeFreightRollContent(input);
    expect(result.content).toBe('FreightRoll, FreightRoll, FreightRoll, FreightRoll');
    expect(result.wasModified).toBe(true);
  });

  it('returns unmodified content when no YardFlow present', () => {
    const input = 'Hello from FreightRoll!';
    const result = sanitizeFreightRollContent(input);
    expect(result.content).toBe('Hello from FreightRoll!');
    expect(result.wasModified).toBe(false);
  });

  it('handles empty string', () => {
    const result = sanitizeFreightRollContent('');
    expect(result.content).toBe('');
    expect(result.wasModified).toBe(false);
  });

  it('handles multiple replacements in complex content', () => {
    const input = `Subject: YardFlow Update
    
Hi there,

This is from YardFlow. We at YardFlow appreciate your business.

Best,
The YardFlow Team`;
    
    const result = sanitizeFreightRollContent(input);
    expect(result.content).not.toContain('YardFlow');
    expect(result.content.match(/FreightRoll/g)!.length).toBe(4);
    expect(result.wasModified).toBe(true);
  });
});
