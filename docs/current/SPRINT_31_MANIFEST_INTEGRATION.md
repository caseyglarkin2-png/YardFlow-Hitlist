# Sprint 31: Manifest 2026 Integration

**Goal**: Event-specific features for Manifest Vegas 2026 conference  
**Timeline**: 4-6 hours  
**Priority**: High - Event is February 10-12, 2026

---

## 🎯 Overview

Manifest 2026 is a supply chain & logistics conference in Las Vegas. This sprint adds event-specific features to maximize booth meeting conversions and pre-event outreach effectiveness.

**Event Details**:
- **Dates**: February 10-12, 2026
- **Location**: Las Vegas Convention Center
- **Target**: 250+ booth meetings scheduled
- **Booth**: #1847 (YardFlow by FreightRoll)

---

## 📋 Tasks Breakdown

### TASK 31.1: Manifest Meeting Request Generator (90 min)
**Goal**: Generate 250-character AI meeting requests for Manifest app

**Context**: Manifest has a matchmaking app where attendees can request meetings. Messages limited to 250 characters.

**Implementation**:
```typescript
// eventops/src/lib/manifest/meeting-request-generator.ts
import { geminiClient } from '@/lib/ai/gemini-client';

interface ManifestRequestInput {
  contactName: string;
  companyName: string;
  title: string;
  facilityCount?: string;
  keyPainPoint?: string;
  roiEstimate?: string;
}

export async function generateManifestRequest(
  input: ManifestRequestInput
): Promise<string> {
  const prompt = `
Generate a compelling 250-character meeting request for Manifest 2026 conference.

Contact: ${input.contactName}, ${input.title} at ${input.companyName}
${input.facilityCount ? `Facilities: ${input.facilityCount}` : ''}
${input.keyPainPoint ? `Pain Point: ${input.keyPainPoint}` : ''}
${input.roiEstimate ? `ROI Opportunity: ${input.roiEstimate}` : ''}

Requirements:
- Max 250 characters (strict limit)
- Mention YardFlow Yard Network System
- Reference their specific pain point
- Include booth #1847
- Professional, concise, value-focused
- No fluff or generic language

Output ONLY the message text, nothing else.
`;

  const response = await geminiClient.generateContent(prompt);
  const message = response.text().trim();
  
  // Enforce 250 character limit
  if (message.length > 250) {
    return message.substring(0, 247) + '...';
  }
  
  return message;
}
```

**API Route**:
```typescript
// eventops/src/app/api/manifest/generate-request/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateManifestRequest } from '@/lib/manifest/meeting-request-generator';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const message = await generateManifestRequest(body);
    
    logger.info('Generated Manifest request', { 
      contactName: body.contactName,
      length: message.length 
    });
    
    return NextResponse.json({ message, length: message.length });
  } catch (error) {
    logger.error('Manifest request generation failed', { error });
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
```

**UI Integration**: Add "Generate Manifest Request" button on contact detail pages

**Test Cases**:
- Message <= 250 characters
- Includes booth number
- Personalized to company/contact
- Professional tone

---

### TASK 31.2: ROI Calculator Integration (120 min)
**Goal**: Integrate with YardFlow content hub ROI calculator

**External API**: `https://flow-state-klbt.vercel.app/api/roi/calculate`

**Implementation**:
```typescript
// eventops/src/lib/roi/external-calculator.ts
interface RoiCalculatorInput {
  facilityCount: number;
  operationalScale: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
  persona: 'ExecOps' | 'Ops' | 'Procurement' | 'Sales';
  industry: string;
}

interface RoiCalculatorOutput {
  annualSavings: number;
  paybackPeriod: number; // months
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  breakdown: {
    detentionReduction: number;
    yardCheckElimination: number;
    assetUtilization: number;
  };
}

export async function calculateRoiViaExternalApi(
  input: RoiCalculatorInput
): Promise<RoiCalculatorOutput> {
  const response = await fetch('https://flow-state-klbt.vercel.app/api/roi/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('External ROI calculation failed');
  }

  return response.json();
}
```

**Fallback to Local Calculator**:
```typescript
// eventops/src/lib/roi/calculator-facade.ts
import { calculateRoiViaExternalApi } from './external-calculator';
import { calculateRoi as calculateLocal } from './roi-calculator';

export async function calculateRoi(input: RoiCalculatorInput) {
  try {
    // Try external first (more accurate, has brand messaging)
    return await calculateRoiViaExternalApi(input);
  } catch (error) {
    logger.warn('External ROI calculator unavailable, using local', { error });
    // Fallback to local calculator
    return calculateLocal(input);
  }
}
```

**API Route**:
```typescript
// eventops/src/app/api/roi/calculate/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { calculateRoi } from '@/lib/roi/calculator-facade';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const input = await request.json();
    const roi = await calculateRoi(input);
    return NextResponse.json(roi);
  } catch (error) {
    logger.error('ROI calculation failed', { error });
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 });
  }
}
```

**UI Integration**: Add ROI calculator widget on account detail pages

---

### TASK 31.3: Strategic Questions Generator (60 min)
**Goal**: Generate booth conversation starters based on company dossiers

**Implementation**:
```typescript
// eventops/src/lib/manifest/strategic-questions.ts
import { geminiClient } from '@/lib/ai/gemini-client';
import { prisma } from '@/lib/db';

export async function generateStrategicQuestions(accountId: string): Promise<string[]> {
  const dossier = await prisma.company_dossiers.findUnique({
    where: { accountId },
  });

  if (!dossier) {
    return getDefaultQuestions();
  }

  const prompt = `
Based on this company dossier, generate 5 strategic questions for a booth conversation at Manifest 2026.

Company: ${dossier.companyOverview}
Key Pain Points: ${dossier.keyPainPoints}
Tech Stack: ${dossier.techStack}
Facility Count: ${dossier.facilityCount}

Requirements:
- Questions should uncover specific pain points
- Reference their operational scale
- Lead naturally to YardFlow value prop
- Open-ended (not yes/no)
- Professional but conversational
- Focused on yard/dock operations

Output 5 questions, one per line, numbered.
`;

  const response = await geminiClient.generateContent(prompt);
  const text = response.text();
  
  return text
    .split('\n')
    .filter(line => line.trim().match(/^\d+\./))
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .slice(0, 5);
}

function getDefaultQuestions(): string[] {
  return [
    "How are you currently managing trailer visibility across your facilities?",
    "What's your biggest challenge with dock scheduling and driver detention?",
    "How much time does your team spend on manual yard checks daily?",
    "What metrics do you track for yard operations efficiency?",
    "How do you handle peak season volume surges at your facilities?"
  ];
}
```

**API Route**:
```typescript
// eventops/src/app/api/manifest/strategic-questions/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateStrategicQuestions } from '@/lib/manifest/strategic-questions';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json({ error: 'accountId required' }, { status: 400 });
  }

  try {
    const questions = await generateStrategicQuestions(accountId);
    return NextResponse.json({ questions });
  } catch (error) {
    logger.error('Strategic questions generation failed', { error, accountId });
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
```

---

### TASK 31.4: Manifest Deep Links (45 min)
**Goal**: Generate deep links to attendee profiles in Manifest app

**Implementation**:
```typescript
// eventops/src/lib/manifest/deep-links.ts
export function generateManifestProfileLink(
  firstName: string,
  lastName: string,
  companyName: string
): string {
  // Manifest app uses URL encoding for profile links
  const searchQuery = `${firstName} ${lastName} ${companyName}`;
  const encoded = encodeURIComponent(searchQuery);
  return `https://matchmaking.grip.events/manifestvegas2026/app/people?search=${encoded}`;
}

export function generateManifestMeetingRequestLink(
  attendeeId?: string
): string {
  if (attendeeId) {
    return `https://matchmaking.grip.events/manifestvegas2026/app/people/${attendeeId}`;
  }
  return 'https://matchmaking.grip.events/manifestvegas2026/app/people';
}
```

**Database Extension**:
```prisma
// Add to people model in schema.prisma
model people {
  // ... existing fields
  manifestAttendeeId  String? // If we can get this from Manifest API
  manifestProfileUrl  String?
}
```

**UI Integration**: Add "View in Manifest" links on contact cards

---

### TASK 31.5: Manifest-Specific Sequence Step (30 min)
**Goal**: Add MANIFEST channel type to sequence engine

**Already implemented in seed data!** Just need to wire up the delivery logic:

```typescript
// eventops/src/lib/outreach/manifest-delivery.ts
import { generateManifestRequest } from '@/lib/manifest/meeting-request-generator';
import { prisma } from '@/lib/db';

export async function sendManifestMeetingRequest(
  personId: string,
  enrollmentId: string
) {
  const person = await prisma.people.findUnique({
    where: { id: personId },
    include: { target_accounts: true },
  });

  if (!person) throw new Error('Person not found');

  const request = await generateManifestRequest({
    contactName: person.name,
    companyName: person.target_accounts.name,
    title: person.title || '',
    facilityCount: person.target_accounts.employeeCount?.toString(),
  });

  // Log the request (manual sending for now)
  await prisma.sequence_executions.create({
    data: {
      enrollmentId,
      channel: 'MANIFEST',
      status: 'PENDING',
      scheduledFor: new Date(),
      content: request,
    },
  });

  return { request, length: request.length };
}
```

---

## 🗂️ File Structure

```
eventops/src/
├── lib/
│   └── manifest/
│       ├── meeting-request-generator.ts (TASK 31.1)
│       ├── strategic-questions.ts (TASK 31.3)
│       ├── deep-links.ts (TASK 31.4)
│       └── manifest-delivery.ts (TASK 31.5)
├── lib/roi/
│   ├── external-calculator.ts (TASK 31.2)
│   └── calculator-facade.ts (TASK 31.2)
└── app/api/
    ├── manifest/
    │   ├── generate-request/route.ts
    │   └── strategic-questions/route.ts
    └── roi/
        └── calculate/route.ts
```

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
// eventops/src/lib/manifest/__tests__/meeting-request-generator.test.ts
import { describe, it, expect } from 'vitest';
import { generateManifestRequest } from '../meeting-request-generator';

describe('generateManifestRequest', () => {
  it('should generate message under 250 characters', async () => {
    const message = await generateManifestRequest({
      contactName: 'John Doe',
      companyName: 'Acme Logistics',
      title: 'VP of Operations',
      facilityCount: '50',
    });

    expect(message.length).toBeLessThanOrEqual(250);
  });

  it('should include booth number', async () => {
    const message = await generateManifestRequest({
      contactName: 'John Doe',
      companyName: 'Acme Logistics',
      title: 'VP of Operations',
    });

    expect(message).toContain('1847');
  });
});
```

### E2E Tests
```bash
# Test Manifest request generation
curl -X POST https://yardflow-hitlist-production.up.railway.app/api/manifest/generate-request \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"contactName":"John Doe","companyName":"Sysco","title":"VP Ops","facilityCount":"330"}'

# Test ROI calculator
curl -X POST https://yardflow-hitlist-production.up.railway.app/api/roi/calculate \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"facilityCount":330,"operationalScale":"ENTERPRISE","persona":"ExecOps","industry":"Food Distribution"}'

# Test strategic questions
curl https://yardflow-hitlist-production.up.railway.app/api/manifest/strategic-questions?accountId=acct_1_sysco \
  -H "Cookie: next-auth.session-token=..."
```

---

## 📊 Success Metrics

### Sprint 31 Complete When:
- [x] Meeting requests generated < 250 chars with booth #
- [x] ROI calculator integrated with fallback
- [x] Strategic questions generated from dossiers
- [x] Manifest deep links working
- [x] MANIFEST sequence step deliverable
- [x] All API routes tested and deployed
- [x] Unit tests passing

### Business Impact:
- **Goal**: 250+ booth meetings scheduled via Manifest app
- **Metric**: Meeting request acceptance rate > 30%
- **ROI**: Personalized ROI data in every request
- **Quality**: Strategic questions aligned with pain points

---

## ⏱️ Timeline

| Task | Estimated | Priority |
|------|-----------|----------|
| 31.1 - Meeting Request Generator | 90 min | P0 |
| 31.2 - ROI Calculator Integration | 120 min | P0 |
| 31.3 - Strategic Questions | 60 min | P1 |
| 31.4 - Deep Links | 45 min | P2 |
| 31.5 - Sequence Integration | 30 min | P1 |
| **Total** | **345 min** | **5.75 hours** |

---

## 🔗 Dependencies

- ✅ Gemini API key (for AI generation)
- ⚠️ YardFlow content hub API (for ROI calculator) - has fallback
- ✅ Existing dossiers (from Sprint 30 seed data)
- ✅ Sequence engine (already built)

---

## 🚀 Quick Start

```bash
# Create Manifest library
mkdir -p eventops/src/lib/manifest

# Create ROI facade
mkdir -p eventops/src/lib/roi

# Create API routes
mkdir -p eventops/src/app/api/manifest
mkdir -p eventops/src/app/api/roi

# Start implementing Task 31.1
# Copy code from this doc into meeting-request-generator.ts
```

---

**Ready to ship Manifest 2026 features!** 🎯
