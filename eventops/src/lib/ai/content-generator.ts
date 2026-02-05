import { PROMPT_VERSION, VOICE_CONFIGS, type VoiceTone } from '@/lib/ai/voiceConfigs';
import { logger } from '@/lib/logger';

/**
 * Sanitize content to ensure FreightRoll branding is always used.
 * Replaces any occurrence of "YardFlow" (case-insensitive, with optional space/hyphen)
 * with "FreightRoll". Handles possessive forms ("YardFlow's" -> "FreightRoll's").
 * Logs when replacement happens for monitoring.
 */
export function sanitizeFreightRollContent(content: string): {
  content: string;
  wasModified: boolean;
} {
  // Match YardFlow with optional space/hyphen and optional possessive
  const sanitized = content.replace(/yard[\s-]?flow('s)?/gi, (match) => {
    return match.toLowerCase().endsWith("'s") ? "FreightRoll's" : 'FreightRoll';
  });
  
  const wasModified = sanitized !== content;
  
  if (wasModified) {
    logger.warn('[content-generator] YardFlow found in generated content - sanitizing', {
      originalLength: content.length,
    });
  }
  
  return { content: sanitized, wasModified };
}

export type ContentContext = {
  prospectName: string;
  companyName: string;
  title?: string;
  goal?: string;
  tone: VoiceTone;
};

export type GeneratedContent = {
  subject: string;
  content: string;
};

export type FreightRollValidationIssue =
  | 'missing_calendly_link'
  | 'missing_metric'
  | 'missing_question'
  | 'too_many_questions'
  | 'too_long';

const METRIC_TOKEN_REGEX =
  /(\$\d+[kKmMbB]?|\d+(?:\.\d+)?%|\d+\s+(?:facilities|yards|sites|locations|dc|dcs|warehouses))/;

function compactLines(lines: string[]): string {
  return lines.filter((line) => line.trim().length > 0).join('\n');
}

export function buildPrompt(context: ContentContext): { prompt: string; promptVersion: string } {
  const voice = VOICE_CONFIGS[context.tone];
  const instruction = compactLines([
    'Return JSON only with keys: subject, content.',
    `Prospect: ${context.prospectName}`,
    `Company: ${context.companyName}`,
    context.title ? `Title: ${context.title}` : '',
    context.goal ? `Goal: ${context.goal}` : '',
    `Tone: ${context.tone}`,
  ]);

  const prompt = compactLines([
    voice.prompt,
    instruction,
    'Output JSON only. No markdown. No code fences.',
  ]);

  return { prompt, promptVersion: PROMPT_VERSION };
}

export function parseModelJson(text: string): GeneratedContent {
  const jsonMatch = text.match(/```json[\n\r]?([\s\S]*?)[\n\r]?```/) || text.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
  const parsed = JSON.parse(jsonText.trim()) as Partial<GeneratedContent>;

  const subject = typeof parsed.subject === 'string' ? parsed.subject.trim() : '';
  const content = typeof parsed.content === 'string' ? parsed.content.trim() : '';

  if (!subject || !content) {
    throw new Error('Invalid model response: missing subject or content');
  }

  // Sanitize YardFlow references to FreightRoll
  const subjectSanitized = sanitizeFreightRollContent(subject);
  const contentSanitized = sanitizeFreightRollContent(content);
  
  return { 
    subject: subjectSanitized.content, 
    content: contentSanitized.content 
  };
}

export function validateFreightRollOutput(
  content: string,
  calendlyLink: string
): FreightRollValidationIssue[] {
  const issues: FreightRollValidationIssue[] = [];

  if (!content.includes(calendlyLink)) {
    issues.push('missing_calendly_link');
  }

  if (!METRIC_TOKEN_REGEX.test(content)) {
    issues.push('missing_metric');
  }

  const questionCount = (content.match(/\?/g) || []).length;
  if (questionCount === 0) {
    issues.push('missing_question');
  } else if (questionCount > 1) {
    issues.push('too_many_questions');
  }

  if (content.length > 250) {
    issues.push('too_long');
  }

  return issues;
}

function clampContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, Math.max(0, maxLength - 1)).trimEnd();
}

function ensureSingleQuestion(content: string): string {
  const firstQuestionIndex = content.indexOf('?');
  if (firstQuestionIndex === -1) {
    return `${content.replace(/\s+$/, '')} Interested in a quick 15-min chat?`;
  }

  const before = content.slice(0, firstQuestionIndex + 1);
  const after = content
    .slice(firstQuestionIndex + 1)
    .replace(/\?/g, '')
    .trim();
  return after ? `${before} ${after}` : before;
}

function ensureMetric(content: string): string {
  if (METRIC_TOKEN_REGEX.test(content)) return content;
  return `${content.replace(/\s+$/, '')} We typically drive $1M+ savings.`;
}

function ensureCalendly(content: string, calendlyLink: string): string {
  if (content.includes(calendlyLink)) return content;
  return `${content.replace(/\s+$/, '')} ${calendlyLink}`;
}

export function enforceFreightRollConstraints(
  content: string,
  calendlyLink: string
): { content: string; issues: FreightRollValidationIssue[] } {
  let adjusted = content.trim();

  adjusted = ensureMetric(adjusted);
  adjusted = ensureCalendly(adjusted, calendlyLink);
  adjusted = ensureSingleQuestion(adjusted);
  adjusted = clampContent(adjusted, 250);

  const issues = validateFreightRollOutput(adjusted, calendlyLink);
  return { content: adjusted, issues };
}

export function buildFreightRollRepairPrompt(
  context: ContentContext,
  calendlyLink: string
): string {
  const base = buildPrompt(context).prompt;
  return compactLines([
    base,
    'STRICT CONSTRAINTS FOR FREIGHTROLL TONE:',
    '- Content <= 250 characters.',
    '- Include Calendly link exactly as provided.',
    '- Include at least one metric token like "$1M", "4%", or "25 facilities".',
    '- Exactly one question mark in the content.',
    '- Sign off as FreightRoll or The FreightRoll Team.',
    `Calendly link: ${calendlyLink}`,
  ]);
}
