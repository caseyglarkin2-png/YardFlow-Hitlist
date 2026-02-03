import { describe, it, expect } from 'vitest';
import { VOICE_CONFIGS } from '@/lib/ai/voiceConfigs';

describe('VOICE_CONFIGS', () => {
  it('exposes expected tones', () => {
    expect(Object.keys(VOICE_CONFIGS).sort()).toEqual(['challenger', 'luis', 'professional']);
  });

  it('matches snapshots for prompts', () => {
    expect(VOICE_CONFIGS.luis.prompt).toMatchSnapshot('luis');
    expect(VOICE_CONFIGS.professional.prompt).toMatchSnapshot('professional');
    expect(VOICE_CONFIGS.challenger.prompt).toMatchSnapshot('challenger');
  });
});
