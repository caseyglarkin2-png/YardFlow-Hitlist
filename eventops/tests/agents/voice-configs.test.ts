import { describe, it, expect } from 'vitest';
import { VOICE_CONFIGS } from '@/lib/ai/voiceConfigs';

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
});
