export type VoiceTone = 'freightroll' | 'professional' | 'challenger';

export type VoiceConfig = {
  tone: VoiceTone;
  prompt: string;
};

export const PROMPT_VERSION = 'v1';

const MANIFEST_SEQUENCE_TEMPLATE = `Manifest Sequence Template:
- Opener: Specific company reference + quick relevance.
- Proof: Primo-style metrics (short, concrete).
- Ask: Single direct question.
- CTA: Include Calendly link.
- Length: Tight, skimmable, no fluff.`;

export const VOICE_CONFIGS: Record<VoiceTone, VoiceConfig> = {
  freightroll: {
    tone: 'freightroll',
    prompt: `Voice: FreightRoll (short, punchy, metrics-first)

Rules:
- Short opener. No fluff.
- Use concrete proof: include at least one hard metric token (examples: "$1M", "4%", "25 facilities").
- Ask exactly one direct question.
- Include Calendly link.
- Sign off as "The FreightRoll Team" or simply "FreightRoll".
- Avoid long paragraphs. Avoid emojis.
- Output must be usable for cold outreach.

${MANIFEST_SEQUENCE_TEMPLATE}
`,
  },
  professional: {
    tone: 'professional',
    prompt: `Voice: Professional (clear, confident, concise)

Rules:
- Respectful, direct, value-focused.
- One clear call-to-action.
- No buzzwords. No fluff.
- Keep it concise and skimmable.

${MANIFEST_SEQUENCE_TEMPLATE}
`,
  },
  challenger: {
    tone: 'challenger',
    prompt: `Voice: Challenger (insight-led, assertive, helpful)

Rules:
- Lead with a strong insight or gap.
- Short proof point.
- One direct question.
- Keep it concise and practical.

${MANIFEST_SEQUENCE_TEMPLATE}
`,
  },
};
