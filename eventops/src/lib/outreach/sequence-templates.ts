/**
 * Sequence Channel Types
 * 
 * Defines all communication channels supported by outreach sequences.
 */

export type SequenceStepChannel = 
  | 'EMAIL' 
  | 'LINKEDIN' 
  | 'MANIFEST' 
  | 'PHONE';

export interface SequenceStep {
  stepNumber: number;
  delayHours: number;
  channel: SequenceStepChannel;
  templateType?: string;
  personalizationLevel?: 'low' | 'medium' | 'high';
  subject?: string; // For EMAIL
  body?: string; // For EMAIL
  message?: string; // For LINKEDIN, MANIFEST
  callScript?: string; // For PHONE
}

export interface SequenceBlueprint {
  name: string;
  description: string;
  targetPersona?: string;
  minIcpScore?: number;
  steps: SequenceStep[];
}

/**
 * Pre-built sequence templates optimized for Manifest 2026.
 */

export const MANIFEST_PRE_EVENT_SEQUENCE: SequenceBlueprint = {
  name: 'Manifest 2026 - Pre-Event Outreach',
  description: 'Multi-channel sequence for booth meeting requests',
  minIcpScore: 60,
  steps: [
    {
      stepNumber: 1,
      delayHours: 0,
      channel: 'EMAIL',
      templateType: 'manifest_intro',
      personalizationLevel: 'high',
      subject: 'Quick question before Manifest 2026',
    },
    {
      stepNumber: 2,
      delayHours: 48, // 2 days
      channel: 'LINKEDIN',
      templateType: 'connection_request',
      personalizationLevel: 'medium',
    },
    {
      stepNumber: 3,
      delayHours: 72, // 3 days  after email
      channel: 'EMAIL',
      templateType: 'manifest_roi',
      personalizationLevel: 'high',
      subject: 'ROI insights for {{company_name}}',
    },
    {
      stepNumber: 4,
      delayHours: 120, // 5 days
      channel: 'MANIFEST',
      templateType: 'meeting_request',
      personalizationLevel: 'high',
    },
    {
      stepNumber: 5,
      delayHours: 168, // 7 days
      channel: 'EMAIL',
      templateType: 'booth_reminder',
      personalizationLevel: 'medium',
      subject: 'See you at booth #1847?',
    },
  ],
};

export const COLD_OUTREACH_EXEC_SEQUENCE: SequenceBlueprint = {
  name: 'Cold Outreach - Executive',
  description: 'Executive-focused sequence with ROI emphasis',
  targetPersona: 'ExecOps',
  minIcpScore: 70,
  steps: [
    {
      stepNumber: 1,
      delayHours: 0,
      channel: 'EMAIL',
      templateType: 'exec_intro',
      personalizationLevel: 'high',
      subject: 'ROI opportunity for {{company_name}}',
    },
    {
      stepNumber: 2,
      delayHours: 96, // 4 days (execs need more time)
      channel: 'LINKEDIN',
      templateType: 'exec_connection',
      personalizationLevel: 'high',
    },
    {
      stepNumber: 3,
      delayHours: 168, // 7 days
      channel: 'EMAIL',
      templateType: 'case_study',
      personalizationLevel: 'high',
      subject: 'How {{competitor}} reduced yard delays 20%',
    },
    {
      stepNumber: 4,
      delayHours: 240, // 10 days
      channel: 'EMAIL',
      templateType: 'strategic_question',
      personalizationLevel: 'high',
      subject: 'Quick question on {{company_name}} operations',
    },
    {
      stepNumber: 5,
      delayHours: 312, // 13 days
      channel: 'PHONE',
      templateType: 'exec_call',
      personalizationLevel: 'high',
      callScript: 'Reference ROI calculations and case study',
    },
  ],
};

export const WARM_INTRODUCTION_SEQUENCE: SequenceBlueprint = {
  name: 'Warm Introduction',
  description: 'Shorter sequence for mutual connections',
  steps: [
    {
      stepNumber: 1,
      delayHours: 0,
      channel: 'EMAIL',
      templateType: 'warm_intro',
      personalizationLevel: 'high',
      subject: '{{mutual_connection}} suggested we connect',
    },
    {
      stepNumber: 2,
      delayHours: 48, // 2 days
      channel: 'LINKEDIN',
      templateType: 'warm_connection',
      personalizationLevel: 'high',
    },
    {
      stepNumber: 3,
      delayHours: 96, // 4 days
      channel: 'EMAIL',
      templateType: 'demo_offer',
      personalizationLevel: 'medium',
      subject: 'Quick demo for {{company_name}}?',
    },
  ],
};

export const POST_EVENT_FOLLOWUP_SEQUENCE: SequenceBlueprint = {
  name: 'Manifest 2026 - Post-Event',
  description: 'Follow-up sequence after booth conversations',
  steps: [
    {
      stepNumber: 1,
      delayHours: 24, // Next day
      channel: 'EMAIL',
      templateType: 'post_event_thanks',
      personalizationLevel: 'high',
      subject: 'Great meeting you at Manifest',
    },
    {
      stepNumber: 2,
      delayHours: 72, // 3 days
      channel: 'EMAIL',
      templateType: 'demo_scheduling',
      personalizationLevel: 'high',
      subject: 'Next steps for {{company_name}}',
    },
  ],
};

/**
 * Get sequence template by name.
 */
export function getSequenceTemplate(name: string): SequenceBlueprint | null {
  const templates: Record<string, SequenceBlueprint> = {
    'manifest_pre_event': MANIFEST_PRE_EVENT_SEQUENCE,
    'cold_outreach_exec': COLD_OUTREACH_EXEC_SEQUENCE,
    'warm_introduction': WARM_INTRODUCTION_SEQUENCE,
    'post_event_followup': POST_EVENT_FOLLOWUP_SEQUENCE,
  };

  return templates[name] || null;
}

/**
 * Get all available sequence templates.
 */
export function getAllSequenceTemplates(): SequenceBlueprint[] {
  return [
    MANIFEST_PRE_EVENT_SEQUENCE,
    COLD_OUTREACH_EXEC_SEQUENCE,
    WARM_INTRODUCTION_SEQUENCE,
    POST_EVENT_FOLLOWUP_SEQUENCE,
  ];
}
