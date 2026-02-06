/**
 * API Response Type Contracts — Sprint 52
 *
 * Canonical TypeScript interfaces for all API responses consumed by GTM-YardFlow.
 * These types define the exact JSON shape each endpoint returns.
 *
 * Pagination Conventions:
 *   - Cursor-based: { data, nextCursor, hasMore, total? }
 *   - Offset-based: { <entity>, pagination: { limit, skip, total, hasMore } }
 *   - Unpaginated: { <entity>: [] }
 *
 * Error Convention:
 *   { error: string, details?: unknown }
 */

// ─── Standard Error ────────────────────────────────────────────────────

export interface APIError {
  error: string;
  details?: unknown;
  code?: string;
  statusCode?: number;
}

// ─── Pagination ────────────────────────────────────────────────────────

export interface CursorPagination {
  hasMore: boolean;
  nextCursor: string | null;
  total?: number;
}

export interface OffsetPagination {
  limit: number;
  skip: number;
  total: number;
  hasMore: boolean;
}

// ─── Accounts ──────────────────────────────────────────────────────────

export interface AccountSummary {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  headquarters: string | null;
  icpScore: number | null;
  notes: string | null;
  eventId: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    people: number;
  };
}

/** GET /api/accounts */
export interface AccountsResponse {
  data: AccountSummary[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

// ─── People ────────────────────────────────────────────────────────────

export interface PersonSummary {
  id: string;
  accountId: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  isExecOps: boolean;
  isOps: boolean;
  isProc: boolean;
  isSales: boolean;
  isTech: boolean;
  isNonOps: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /api/people */
export interface PeopleResponse {
  people: PersonSummary[];
  pagination: OffsetPagination;
}

// ─── Campaigns ─────────────────────────────────────────────────────────

export interface CampaignSummary {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  targetPersonas: string | null;
  minIcpScore: number | null;
  startDate: string | null;
  endDate: string | null;
  goals: string | null;
  createdBy: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
  _count: {
    outreach: number;
    sequences: number;
  };
}

/** GET /api/campaigns */
export interface CampaignsResponse {
  campaigns: CampaignSummary[];
}

// ─── Sequences ─────────────────────────────────────────────────────────

export interface SequenceStep {
  stepNumber: number;
  delayHours: number;
  subject: string;
  emailBody: string;
}

export interface SequenceSummary {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'paused' | 'completed';
  steps: SequenceStep[];
  totalEnrolled: number;
  totalCompleted: number;
  totalActive: number;
  createdAt: string;
  updatedAt: string;
}

/** GET /api/sequences */
export interface SequencesResponse {
  sequences: SequenceSummary[];
}

// ─── Enrollments ───────────────────────────────────────────────────────

export interface EnrollmentMetrics {
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  repliesReceived: number;
}

export interface EnrollmentRecord {
  id: string;
  prospectId: string;
  sequenceId: string;
  status: 'active' | 'completed' | 'exited' | 'paused';
  currentStep: number;
  totalSteps: number;
  startedAt: string;
  lastStepAt?: string;
  pausedAt?: string;
  pauseReason?: string;
  completedAt?: string;
  stoppedAt?: string;
  stopReason?: string;
  metrics: EnrollmentMetrics;
  sequence: { id: string; name: string };
  prospect: { id: string; name: string; email: string | null };
}

/** GET /api/enrollments */
export interface EnrollmentsResponse {
  data: EnrollmentRecord[];
  pagination: CursorPagination;
}

// ─── Outreach ──────────────────────────────────────────────────────────

export type OutreachChannel = 'EMAIL' | 'LINKEDIN' | 'PHONE';
export type OutreachStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'SENT'
  | 'OPENED'
  | 'CLICKED'
  | 'RESPONDED'
  | 'BOUNCED';

export interface OutreachRecord {
  id: string;
  personId: string;
  channel: OutreachChannel;
  subject: string | null;
  message: string;
  templateId: string | null;
  status: OutreachStatus;
  sentBy: string;
  sentAt: string | null;
  openedAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  people: {
    id: string;
    name: string;
    email: string | null;
  };
}

/** GET /api/outreach */
export interface OutreachResponse {
  data: OutreachRecord[];
  pagination: OffsetPagination;
}

// ─── Dashboard Stats ───────────────────────────────────────────────────

export interface CampaignStat {
  name: string;
  sent: number;
  opened: number;
  replied: number;
}

export interface DayValue {
  name: string;
  value: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user: string;
}

/** GET /api/dashboards/stats */
export interface DashboardStatsResponse {
  accounts: number;
  people: number;
  campaigns: number;
  meetings: number;
  outreachSent: number;
  responseRate: number;
  accountsChange: number;
  meetingsChange: number;
  recentCampaigns: CampaignStat[];
  meetingsByDay: DayValue[];
  recentActivity: ActivityItem[];
}

// ─── Email Dashboard ───────────────────────────────────────────────────

export interface DailyEmailStats {
  date: string;
  sent: number;
  opened: number;
  responded: number;
  bounced: number;
}

export interface TopAccountEmail {
  accountName: string;
  emailCount: number;
}

/** GET /api/dashboards/email */
export interface EmailDashboardResponse {
  period: string;
  summary: {
    sent: number;
    opened: number;
    responded: number;
    bounced: number;
    pendingDrafts: number;
  };
  rates: {
    openRate: string;
    responseRate: string;
    bounceRate: string;
  };
  dailyStats: DailyEmailStats[];
  topAccounts: TopAccountEmail[];
  generatedAt: string;
}

// ─── AI Chat (Brain) ───────────────────────────────────────────────────

export type BrainAction =
  | { type: 'navigate'; destination: string; tab?: string }
  | { type: 'filter'; tier?: string; hasEmail?: boolean; industry?: string; icpScoreMin?: number }
  | { type: 'search'; query: string }
  | { type: 'select'; itemIds: string[] }
  | { type: 'research'; companyName?: string; accountId?: string }
  | { type: 'email'; recipientIds?: string[]; templateType?: string }
  | { type: 'explain'; topic: string };

/** POST /api/ai/chat */
export interface BrainChatResponse {
  response: string;
  action?: BrainAction;
  confidence?: number;
  conversationId?: string;
  suggestions?: string[];
  metadata?: {
    provider?: string;
    fallbackUsed?: boolean;
  };
}

/** GET /api/ai/chat (capabilities) */
export interface BrainCapabilitiesResponse {
  status: string;
  capabilities: string[];
  maxMessageLength: number;
  maxHistoryMessages: number;
  providers: string[];
  actions: string[];
}
