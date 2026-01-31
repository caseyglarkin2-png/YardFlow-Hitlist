/**
 * Mock Account Fixtures for Agent Testing
 * 
 * These fixtures provide consistent test data across all agent tests.
 */

export const mockEvent = {
  id: 'evt-test-manifest-2026',
  name: 'Manifest 2026',
  location: 'Las Vegas, NV',
  startDate: new Date('2026-02-10'),
  endDate: new Date('2026-02-12'),
  status: 'ACTIVE' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockAccount = {
  id: 'acc-test-acme-logistics',
  eventId: mockEvent.id,
  name: 'Acme Logistics',
  website: 'https://acme-logistics.com',
  industry: 'Logistics & Transportation',
  headquarters: 'Chicago, IL',
  icpScore: 85,
  notes: 'High-value target, large yard operations',
  assignedTo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockContact = {
  id: 'person-test-john-smith',
  accountId: mockAccount.id,
  name: 'John Smith',
  title: 'VP Operations',
  email: 'john.smith@acme-logistics.com',
  phone: '+1-555-0123',
  linkedin: 'https://linkedin.com/in/johnsmith',
  notes: 'Decision maker for yard tech',
  isExecOps: true,
  isOps: true,
  isProc: false,
  isSales: false,
  isTech: false,
  isNonOps: false,
  assignedTo: null,
  emailStatus: 'valid',
  unsubscribed: false,
  gdprConsent: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockSecondContact = {
  id: 'person-test-jane-doe',
  accountId: mockAccount.id,
  name: 'Jane Doe',
  title: 'Director of Technology',
  email: 'jane.doe@acme-logistics.com',
  phone: '+1-555-0124',
  linkedin: 'https://linkedin.com/in/janedoe',
  notes: 'Technical evaluator',
  isExecOps: false,
  isOps: false,
  isProc: false,
  isSales: false,
  isTech: true,
  isNonOps: false,
  assignedTo: null,
  emailStatus: 'valid',
  unsubscribed: false,
  gdprConsent: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockDossier = {
  id: 'dossier-test-acme',
  accountId: mockAccount.id,
  companyOverview: 'Acme Logistics is a mid-size 3PL operating 12 distribution centers across the Midwest. Founded in 1998, they specialize in last-mile delivery and warehousing.',
  recentNews: 'Recently announced expansion to 5 new facilities in Q1 2026. CEO quoted about "operational efficiency challenges" in industry press.',
  industryContext: 'The 3PL industry is facing driver shortages and increasing pressure to reduce dwell times. Yard management is a key bottleneck.',
  keyPainPoints: JSON.stringify([
    'Manual yard scheduling causing 2-3 hour average dwell times',
    'No visibility into trailer locations across facilities',
    'Dock scheduling conflicts during peak hours',
    'High detention fees from carriers'
  ]),
  techStack: JSON.stringify({
    tms: 'Oracle TMS',
    wms: 'Manhattan WMS',
    erp: 'SAP',
    yms: 'None - Manual processes'
  }),
  companySize: '500-1000 employees',
  socialPresence: JSON.stringify({
    linkedin: 'Active, posts 2x/week',
    twitter: 'Inactive'
  }),
  rawData: null,
  researchedAt: new Date(),
  researchedBy: 'research-agent',
  facilityCount: '12',
  locations: 'Chicago, Detroit, Indianapolis, Columbus, Milwaukee, St. Louis',
  operationalScale: 'Medium-Large',
};

export const mockCampaign = {
  id: 'campaign-test-manifest-outreach',
  eventId: mockEvent.id,
  name: 'Manifest 2026 Outreach',
  description: 'Pre-event outreach to high-value accounts',
  targetPersonas: 'VP Operations, Director of Technology',
  minIcpScore: 70,
  startDate: new Date('2026-01-15'),
  endDate: new Date('2026-02-09'),
  status: 'ACTIVE' as const,
  goals: 'Book 20 meetings at Manifest',
  createdBy: 'user-test-admin',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockSequence = {
  id: 'seq-test-manifest',
  campaignId: mockCampaign.id,
  name: 'Manifest Pre-Event Sequence',
  description: '5-step sequence leading up to Manifest 2026',
  steps: JSON.stringify([
    { step: 1, channel: 'EMAIL', delay: 0, template: 'intro' },
    { step: 2, channel: 'LINKEDIN', delay: 2, template: 'connect' },
    { step: 3, channel: 'EMAIL', delay: 4, template: 'value-prop' },
    { step: 4, channel: 'EMAIL', delay: 7, template: 'case-study' },
    { step: 5, channel: 'EMAIL', delay: 10, template: 'meeting-ask' },
  ]),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockAgentTask = {
  id: 'task-test-workflow-1',
  agentType: 'orchestrator',
  status: 'in_progress',
  inputData: {
    accountId: mockAccount.id,
    campaignId: mockCampaign.id,
  },
  outputData: null,
  errorMessage: null,
  accountId: mockAccount.id,
  contactId: null,
  parentTaskId: null,
  retryCount: 0,
  maxRetries: 3,
  createdAt: new Date(),
  updatedAt: new Date(),
  startedAt: new Date(),
  completedAt: null,
};

export const mockChildTasks = [
  {
    id: 'task-test-step-1',
    agentType: 'prospecting',
    status: 'completed',
    inputData: { accountId: mockAccount.id },
    outputData: { contactsFound: 2 },
    errorMessage: null,
    accountId: mockAccount.id,
    contactId: null,
    parentTaskId: mockAgentTask.id,
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    startedAt: new Date(),
    completedAt: new Date(),
  },
  {
    id: 'task-test-step-2',
    agentType: 'research',
    status: 'completed',
    inputData: { accountId: mockAccount.id },
    outputData: { dossierId: mockDossier.id },
    errorMessage: null,
    accountId: mockAccount.id,
    contactId: null,
    parentTaskId: mockAgentTask.id,
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    startedAt: new Date(),
    completedAt: new Date(),
  },
  {
    id: 'task-test-step-3',
    agentType: 'sequence',
    status: 'in_progress',
    inputData: { accountId: mockAccount.id, dossierId: mockDossier.id },
    outputData: null,
    errorMessage: null,
    accountId: mockAccount.id,
    contactId: null,
    parentTaskId: mockAgentTask.id,
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    startedAt: new Date(),
    completedAt: null,
  },
];

// Helper functions
export function createMockAccount(overrides: Partial<typeof mockAccount> = {}) {
  return {
    ...mockAccount,
    id: `acc-test-${Date.now()}`,
    ...overrides,
  };
}

export function createMockContact(overrides: Partial<typeof mockContact> = {}) {
  return {
    ...mockContact,
    id: `person-test-${Date.now()}`,
    ...overrides,
  };
}

export function createMockAgentTask(overrides: Partial<typeof mockAgentTask> = {}) {
  return {
    ...mockAgentTask,
    id: `task-test-${Date.now()}`,
    ...overrides,
  };
}
