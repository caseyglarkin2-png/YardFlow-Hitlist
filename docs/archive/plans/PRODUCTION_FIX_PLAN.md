# Production Fix Plan - EventOps Sprint Breakdown

**Generated:** January 22, 2026  
**Status:** CRITICAL - Production app has 63+ TypeScript errors  
**Production URL:** https://yard-flow-hitlist.vercel.app  
**Critical Bug:** People detail page shows "Failed to load person details"

---

## Executive Summary

The EventOps application has multiple critical runtime and compilation errors preventing core functionality. The primary issue is a **schema mismatch** between the Prisma database schema and the TypeScript code using it. This analysis categorizes all 63+ errors into actionable fix groups with priorities, dependencies, and implementation strategies.

---

## Error Categories & Severity Analysis

### CATEGORY 1: SCHEMA RELATION MISMATCHES (BLOCKER)
**Severity:** BLOCKER  
**Impact:** Runtime crashes, API failures  
**Affected Files:** 15+ files  
**Root Cause:** Code references relations that don't exist in Prisma schema

#### Issues:
1. **`dossier` relation doesn't exist** ❌
   - Schema has: `company_dossiers` (relation name)
   - Code expects: `dossier` (doesn't exist)
   - Files affected:
     - `/src/lib/research-queue.ts` (lines 62, 76-77)
     - `/src/app/api/research/candidates/route.ts` (lines 39, 53-57, 65)
     - `/src/app/api/people/[id]/route.ts` (line 38)
     - `/src/app/api/enrichment/smart-guess/route.ts` (line 151)
     - `/src/app/api/research/refresh/route.ts` (line 29)

2. **`account` relation doesn't exist on `people` model** ❌
   - Schema has: `target_accounts` (relation name)
   - Code expects: `account` (doesn't exist)
   - Files affected:
     - `/src/app/api/export/full/route.ts` (lines 36, 46, 97, 110, 122)

3. **`insights` relation doesn't exist on `people` model** ❌
   - Schema has: `contact_insights` (relation name)
   - Code expects: `insights` (doesn't exist)
   - File affected:
     - `/src/app/api/people/[id]/route.ts` (line 41)

**Fix Approach:** UPDATE SCHEMA (Recommended)
- Rename relations in `schema.prisma` to match code expectations
- Alternative: Update all code to use correct relation names (50+ file changes)

**Complexity:** SIMPLE (schema changes) vs COMPLEX (code changes)

**Recommended Fix:**
```prisma
// In schema.prisma, update:

model company_dossiers {
  // ... existing fields
  target_accounts  target_accounts @relation("dossier", fields: [accountId], references: [id])
}

model target_accounts {
  // ... existing fields
  dossier company_dossiers? @relation("dossier")
}

model contact_insights {
  // ... existing fields
  people people @relation("insights", fields: [personId], references: [id])
}

model people {
  // ... existing fields
  insights contact_insights? @relation("insights")
  account  target_accounts @relation("person_account", fields: [accountId], references: [id])
}
```

---

### CATEGORY 2: MODEL NAME CASING ISSUES (BLOCKER)
**Severity:** BLOCKER  
**Impact:** Runtime Prisma errors  
**Affected Files:** 8+ files  
**Root Cause:** Inconsistent model naming convention in Prisma access

#### Issues:
1. **`Meeting` vs `meeting` model** ❌
   - Schema defines: `model Meeting { @@map("meetings") }`
   - Some code uses: `prisma.Meeting` ❌ (incorrect - uppercase)
   - Most code uses: `prisma.meeting` ✅ (correct - lowercase)
   - Files using WRONG casing:
     - `/src/app/api/reports/pdf/route.ts` (line 40)
     - `/src/app/api/export/full/route.ts` (lines 36, 50)

2. **`auditLog` model doesn't exist** ❌
   - Code expects: `prisma.auditLog`
   - Schema has: NO `auditLog` model defined
   - Files affected:
     - `/src/app/api/dashboards/stats/route.ts` (line 107)

**Fix Approach:** 
- Option A: Fix code to use lowercase `meeting` (SIMPLE)
- Option B: Remove auditLog feature or add missing model (MODERATE)

**Recommended Fix:**
```typescript
// Replace all instances:
prisma.Meeting → prisma.meeting
```

For `auditLog`: Use existing `activities` model or create new schema:
```prisma
model audit_logs {
  id          String   @id @default(cuid())
  userId      String?
  action      String
  entityType  String?
  entityId    String?
  description String?
  metadata    Json?
  createdAt   DateTime @default(now())
  
  @@index([createdAt])
  @@index([entityType, entityId])
  @@map("audit_log")
}
```

**Complexity:** SIMPLE (Meeting fix), MODERATE (auditLog)

---

### CATEGORY 3: MISSING FIELDS ON MODELS (HIGH)
**Severity:** HIGH  
**Impact:** Data export failures, feature incompleteness  
**Affected Files:** 10+ files  
**Root Cause:** Code expects fields not defined in schema

#### Issues:

##### A. Missing Account Fields
**Schema has (on `target_accounts`):**
- `id`, `eventId`, `name`, `website`, `industry`, `headquarters`, `icpScore`, `notes`, `assignedTo`, timestamps

**Code expects (but missing):**
- `tier` ❌
- `location` ❌ (note: `headquarters` exists, possibly same?)
- `revenue` ❌
- `employeeCount` ❌
- `status` ❌

**Files affected:**
- `/src/app/api/export/full/route.ts` (lines 83-87)

##### B. Missing People Fields
**Schema has (on `people`):**
- `isExecOps`, `isOps`, `isProc`, `isSales`, `isTech`, `isNonOps`

**Code expects (but missing):**
- `icpScore` ❌ (only on `target_accounts`)
- `isSupplyChain` ❌
- `isITTech` ❌ (schema has `isTech`)
- `isProcurement` ❌ (schema has `isProc`)
- `isFacilities` ❌

**Files affected:**
- `/src/app/api/export/full/route.ts` (lines 98, 101-104)

##### C. Missing Sequence Fields
**Schema has (on `sequences`):**
- `id`, `campaignId`, `name`, `description`, `steps`, `isActive`, timestamps

**Code expects (but missing):**
- `status` ❌ (uses `isActive` in schema)
- `currentStep` ❌
- `lastStepDate` ❌
- `personId` ❌ (sequences aren't linked to people in schema)
- `people` relation ❌

**Files affected:**
- `/src/app/api/cron/sequences/route.ts` (lines 31, 34, 47, 54, 66, 80-81)

##### D. Missing OutreachStatus Enum Value
**Schema defines:**
```prisma
enum OutreachStatus {
  DRAFT
  SENT
  RESPONDED
  BOUNCED
  NO_RESPONSE
  SCHEDULED
  OPENED
}
```

**Code expects (but missing):**
- `REPLIED` ❌ (code has `RESPONDED` in schema)

**Files affected:**
- `/src/app/api/outreach/activity/route.ts` (lines 35-36)

**Fix Approach:** ADD MISSING FIELDS TO SCHEMA

**Recommended Schema Updates:**
```prisma
// Add to target_accounts model:
model target_accounts {
  // ... existing fields
  tier          String?
  location      String?  // Or use headquarters
  revenue       Float?
  employeeCount Int?
  status        String?  // or enum AccountStatus
}

// Add to people model:
model people {
  // ... existing fields
  icpScore      Int?
  isSupplyChain Boolean @default(false)
  isFacilities  Boolean @default(false)
  // Rename existing:
  // isTech → keep as is
  // isProc → keep as is
}

// Update sequences model:
model sequences {
  // ... existing fields
  currentStep   Int?
  lastStepDate  DateTime?
  personId      String?
  people        people? @relation(fields: [personId], references: [id])
  
  @@index([personId])
}

// Update OutreachStatus enum:
enum OutreachStatus {
  DRAFT
  SENT
  RESPONDED
  REPLIED      // ADD THIS
  BOUNCED
  NO_RESPONSE
  SCHEDULED
  OPENED
}
```

**Complexity:** MODERATE (requires migration and data handling)

---

### CATEGORY 4: MISSING UI COMPONENTS (HIGH)
**Severity:** HIGH  
**Impact:** Build failures, missing UI elements  
**Affected Files:** 3+ files  

#### Issues:
1. **Missing `avatar` component** ❌
   - File: `/src/components/team/presence-indicator.tsx` (line 5)
   - Import: `@/components/ui/avatar`
   - Exists: NO

2. **Missing `tooltip` component** ❌
   - File: `/src/components/team/presence-indicator.tsx` (line 12)
   - Import: `@/components/ui/tooltip`
   - Exists: NO

3. **Missing `separator` component** ❌
   - File: `/src/app/dashboard/reports/builder/page.tsx` (line 7)
   - Import: `@/components/ui/separator`
   - Exists: NO

**Fix Approach:** ADD SHADCN UI COMPONENTS

**Recommended Fix:**
```bash
# Install missing shadcn/ui components
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add tooltip
npx shadcn-ui@latest add separator
```

**Complexity:** SIMPLE (automated installation)

---

### CATEGORY 5: QUERY SYNTAX ERRORS (MEDIUM)
**Severity:** MEDIUM  
**Impact:** API query failures  
**Affected Files:** 5+ files  

#### Issues:

1. **Wrong property in `where` clause** ❌
   - Code uses: `person: { ... }` in `outreach` where clause
   - Should use: `personId: "..."` or `people: { ... }`
   - Files affected:
     - `/src/app/api/analytics/heatmap/route.ts` (line 32)
     - `/src/app/api/reports/pdf/route.ts` (line 51)
     - `/src/app/api/export/full/route.ts` (line 41)

2. **Wrong property in `include` clause** ❌
   - Code uses: `include: { account: true }` on `people`
   - Should use: `include: { target_accounts: true }`
   - Files affected:
     - `/src/app/api/export/full/route.ts` (lines 36, 46)

3. **Accessing undefined nested properties** ❌
   - Code: `o.people.name` and `o.people.account.name`
   - Problem: `people` not included in outreach query
   - Files affected:
     - `/src/app/api/export/full/route.ts` (lines 109-110)

4. **Missing include for `personId` in activities** ❌
   - Code tries to create: `personId: outreach.personId`
   - Schema: `activities` model doesn't have `personId` field
   - Files affected:
     - `/src/app/api/outreach/track/route.ts` (line 46)
     - `/src/app/api/outreach/activity/route.ts` (line 54)

**Fix Approach:** FIX QUERIES TO MATCH SCHEMA

**Recommended Fixes:**
```typescript
// Fix 1: Update where clauses
outreach.findMany({
  where: {
    people: {  // Use relation name from schema
      // ... filters
    }
  }
})

// Fix 2: Update includes
people.findMany({
  include: {
    target_accounts: true  // Not "account"
  }
})

// Fix 3: Add proper includes
outreach.findMany({
  include: {
    people: {
      include: {
        target_accounts: true
      }
    }
  }
})

// Fix 4: Remove personId from activities or add to schema
// Either remove from create calls or update schema
```

**Complexity:** SIMPLE to MODERATE

---

### CATEGORY 6: TYPE SAFETY ISSUES (MEDIUM)
**Severity:** MEDIUM  
**Impact:** Compilation errors, potential runtime bugs  
**Affected Files:** 3+ files  

#### Issues:

1. **Incorrect arithmetic operations** ❌
   - Code: `o._count` used in arithmetic
   - Problem: `_count` is object or boolean, not number
   - Files affected:
     - `/src/app/api/reports/pdf/route.ts` (line 59)

2. **Implicit `any` type parameters** ❌
   - Code: Callback parameters without types
   - Files affected:
     - `/src/app/api/export/full/route.ts` (line 119)
     - `/src/app/api/dashboards/stats/route.ts` (line 120)

3. **Variable reference typo** ❌
   - Code: `data.people.accountId`
   - Should be: `data.person.accountId`
   - File affected:
     - `/src/app/dashboard/people/[id]/page.tsx` (line 43)

**Fix Approach:** ADD TYPE ANNOTATIONS AND FIX LOGIC

**Recommended Fixes:**
```typescript
// Fix 1: Correct _count usage
const totalSent = outreach.filter(o => o.status !== 'DRAFT').length;

// Fix 2: Add type annotations
meetings.map((m: Meeting) => ({ ... }))

// Fix 3: Fix variable name
const roiRes = await fetch(`/api/roi/calculate?accountId=${data.person.accountId}`);
```

**Complexity:** SIMPLE

---

### CATEGORY 7: INCOMPLETE/ORPHANED FEATURES (LOW)
**Severity:** LOW  
**Impact:** Features that don't work but aren't critical  
**Affected Features:** Research queue, audit logging, sequences automation  

#### Issues:
1. **Sequences automation not implemented** ❌
   - Missing schema fields
   - Cron job won't work
   - Impact: Automated email sequences don't run

2. **Audit logging not implemented** ❌
   - No `audit_log` table
   - Code tries to use it
   - Impact: Activity tracking doesn't work

3. **Research queue partially implemented** ❌
   - Missing proper error handling
   - Schema mismatches
   - Impact: Bulk research may fail silently

**Fix Approach:** COMPLETE FEATURES OR REMOVE CODE

**Recommended Action:** 
- Priority 1: Remove broken code to stabilize app
- Priority 2: Complete features in future sprints

**Complexity:** MODERATE to COMPLEX

---

## Dependencies Between Fixes

```
┌─────────────────────────────────────┐
│ 1. FIX SCHEMA RELATIONS (BLOCKER)  │ ← START HERE
│    - dossier, account, insights     │
└───────────┬─────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│ 2. FIX MODEL CASING (BLOCKER)      │
│    - Meeting → meeting              │
│    - Add/remove auditLog            │
└───────────┬─────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│ 3. ADD MISSING FIELDS (HIGH)       │ ← ENABLES EXPORTS
│    - Account: tier, revenue, etc    │
│    - People: icpScore, personas     │
│    - Sequences: personId, etc       │
└───────────┬─────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│ 4. FIX QUERIES (MEDIUM)            │ ← FIXES API ROUTES
│    - Update where/include clauses   │
│    - Fix nested property access     │
└───────────┬─────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│ 5. ADD UI COMPONENTS (HIGH)        │ ← PARALLEL TASK
│    - avatar, tooltip, separator     │
└───────────┬─────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│ 6. FIX TYPE ISSUES (MEDIUM)        │
│    - Add type annotations           │
│    - Fix arithmetic                 │
└───────────┬─────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│ 7. CLEAN UP ORPHANED CODE (LOW)   │ ← LAST
│    - Remove or complete features    │
└─────────────────────────────────────┘
```

---

## Recommended Sprint Structure

### SPRINT 0: EMERGENCY STABILIZATION (1-2 days)
**Goal:** Get production app working again  
**Focus:** Fix BLOCKER issues only

**Tasks:**
1. ✅ Fix schema relations (dossier, account, insights)
2. ✅ Fix Meeting/meeting casing
3. ✅ Remove or stub auditLog references
4. ✅ Fix critical people detail page bug
5. ✅ Deploy to production

**Success Criteria:**
- [ ] People detail page loads without errors
- [ ] No TypeScript compilation errors (blockers)
- [ ] App deploys successfully to Vercel
- [ ] Core CRUD operations work (view people, accounts, outreach)

**Files to Change (Priority Order):**
1. `prisma/schema.prisma` - Fix relations
2. `src/app/api/people/[id]/route.ts` - Fix includes
3. `src/app/api/reports/pdf/route.ts` - Fix Meeting casing
4. `src/app/api/export/full/route.ts` - Fix Meeting casing, account includes
5. `src/app/api/dashboards/stats/route.ts` - Remove auditLog or stub
6. `src/app/dashboard/people/[id]/page.tsx` - Fix data.people → data.person

**Testing:**
- [ ] Manual test: Load person detail page
- [ ] Manual test: View accounts list
- [ ] Manual test: Create new outreach
- [ ] Check Vercel build logs for errors

---

### SPRINT 1: DATA COMPLETENESS (2-3 days)
**Goal:** Enable full export functionality and complete data models  
**Focus:** Add missing fields to schema

**Tasks:**
1. ✅ Add missing fields to `target_accounts` (tier, revenue, employeeCount, location, status)
2. ✅ Add missing fields to `people` (icpScore, isSupplyChain, isFacilities)
3. ✅ Update `OutreachStatus` enum to include REPLIED
4. ✅ Fix all export/import API routes
5. ✅ Run database migration
6. ✅ Update seed data to include new fields

**Success Criteria:**
- [ ] Full export endpoint works without errors
- [ ] All data fields visible in UI
- [ ] Migrations run successfully
- [ ] No data loss during migration

**Files to Change:**
1. `prisma/schema.prisma` - Add fields
2. `src/app/api/export/full/route.ts` - Use new fields
3. Database migration scripts
4. Seed data files

**Testing:**
- [ ] Test export functionality
- [ ] Verify data integrity after migration
- [ ] Test filters using new fields

---

### SPRINT 2: QUERY FIXES & UI COMPONENTS (2 days)
**Goal:** Fix remaining API query issues and add missing UI components  
**Focus:** Medium priority fixes

**Tasks:**
1. ✅ Install missing shadcn/ui components (avatar, tooltip, separator)
2. ✅ Fix all Prisma query syntax errors
3. ✅ Update all where/include clauses to match schema
4. ✅ Fix nested property access issues
5. ✅ Add proper TypeScript types to all API routes

**Success Criteria:**
- [ ] No TypeScript compilation errors
- [ ] All UI components render correctly
- [ ] API queries execute without errors
- [ ] Response data structure matches expectations

**Files to Change:**
1. Add UI components (automated)
2. `src/app/api/analytics/heatmap/route.ts`
3. `src/app/api/export/full/route.ts`
4. `src/components/team/presence-indicator.tsx`
5. `src/app/dashboard/reports/builder/page.tsx`

**Testing:**
- [ ] Test all API endpoints that were modified
- [ ] Visual regression testing on UI components
- [ ] Type checking passes

---

### SPRINT 3: FEATURE COMPLETION (3-5 days)
**Goal:** Complete half-implemented features or remove them  
**Focus:** Sequences, audit logging, advanced features

**Decision Points:**
1. **Sequences Automation:**
   - Option A: Complete implementation (add missing fields, fix cron job)
   - Option B: Remove feature (stub it for future)
   - Recommendation: Complete if critical, otherwise remove

2. **Audit Logging:**
   - Option A: Use existing `activities` model
   - Option B: Create new `audit_log` table
   - Option C: Remove feature
   - Recommendation: Use activities model (repurpose)

3. **Research Queue:**
   - Option A: Fix all schema mismatches
   - Option B: Simplify implementation
   - Recommendation: Fix and improve error handling

**Tasks (if completing features):**
1. ✅ Add missing sequences schema fields
2. ✅ Implement or remove audit logging
3. ✅ Fix research queue schema issues
4. ✅ Complete cron job for sequences
5. ✅ Add comprehensive error handling

**Success Criteria:**
- [ ] Sequences automation works end-to-end OR is cleanly removed
- [ ] Activity/audit logging works consistently
- [ ] Research queue handles errors gracefully

---

## Batched Fix Groups

Based on dependencies and efficiency, here's how to batch fixes:

### BATCH 1: Schema Foundation (Do First)
**Files:** 1  
**Time:** 30 min  
**Risk:** High (requires migration)

```
✅ prisma/schema.prisma
  - Fix all relation names
  - Fix Meeting model casing
  - Add missing fields (Phase 1: critical only)
  - Run migration
```

### BATCH 2: Critical API Routes (Do Second)
**Files:** 6  
**Time:** 1-2 hours  
**Risk:** Medium

```
✅ src/app/api/people/[id]/route.ts
✅ src/app/api/export/full/route.ts
✅ src/app/api/reports/pdf/route.ts
✅ src/app/api/dashboards/stats/route.ts
✅ src/lib/research-queue.ts
✅ src/app/api/research/candidates/route.ts
```

### BATCH 3: UI Components (Parallel)
**Files:** Auto-generated + 2-3 consuming files  
**Time:** 30 min  
**Risk:** Low

```
✅ Run: npx shadcn-ui@latest add avatar tooltip separator
✅ src/components/team/presence-indicator.tsx
✅ src/app/dashboard/reports/builder/page.tsx
```

### BATCH 4: Query Refinements
**Files:** 8-10  
**Time:** 2-3 hours  
**Risk:** Low

```
✅ All files with where/include clause issues
✅ All files with nested property access issues
```

### BATCH 5: Type Safety
**Files:** 5-8  
**Time:** 1 hour  
**Risk:** Low

```
✅ Add TypeScript annotations
✅ Fix arithmetic operations
✅ Fix variable naming bugs
```

### BATCH 6: Feature Cleanup
**Files:** 10+  
**Time:** 3-5 hours  
**Risk:** Medium

```
✅ Sequences implementation
✅ Audit logging decision
✅ Research queue improvements
```

---

## Testing Strategy

### Unit Testing (Per Fix)
After each fix, test:
1. **Compilation:** `npm run build` succeeds
2. **Type checking:** `npm run type-check` passes (if available)
3. **API response:** Test affected endpoints in Postman/browser
4. **Database queries:** Check Prisma query logs

### Integration Testing (Per Sprint)
After each sprint:
1. **User flows:**
   - Create account → Add person → Create outreach
   - View person detail page
   - Export data
   - Run bulk research

2. **Cross-feature testing:**
   - Verify person-account relationship
   - Verify outreach-person relationship
   - Verify cascading deletes work

### Regression Testing (Before Deploy)
Before each deployment:
1. **Critical paths:**
   - Login/auth
   - Dashboard loads
   - People list loads
   - Person detail loads
   - Account detail loads
   - Create new records

2. **Data integrity:**
   - No null reference errors
   - Relations load correctly
   - Counts are accurate

### Production Monitoring (After Deploy)
After deployment:
1. **Error tracking:** Monitor Vercel/Sentry for errors
2. **Performance:** Check API response times
3. **User feedback:** Test with real user scenarios
4. **Database:** Monitor query performance

---

## Risk Assessment

### High Risk Changes
1. **Schema migrations** - Could lose data if not careful
   - Mitigation: Backup database before migration
   - Mitigation: Test migration on staging first
   - Mitigation: Use `prisma migrate --create-only` to review SQL

2. **Relation name changes** - Could break many features
   - Mitigation: Fix all references in single PR
   - Mitigation: Search codebase thoroughly for references
   - Mitigation: Use TypeScript to catch missing updates

### Medium Risk Changes
1. **Adding new fields** - Could cause NULL issues
   - Mitigation: Make fields optional (nullable)
   - Mitigation: Provide sensible defaults
   - Mitigation: Update seed data

2. **Query syntax fixes** - Could return unexpected data
   - Mitigation: Test with real data
   - Mitigation: Add unit tests
   - Mitigation: Check response shapes

### Low Risk Changes
1. **UI components** - Isolated changes
2. **Type annotations** - Compile-time only
3. **Code cleanup** - Remove unused code

---

## Estimated Effort

| Sprint | Focus | Time | Files Changed | Tests |
|--------|-------|------|---------------|-------|
| **Sprint 0** | Emergency Fix | 1-2 days | 6-8 files | Manual |
| **Sprint 1** | Data Complete | 2-3 days | 5-6 files | Automated |
| **Sprint 2** | Queries & UI | 2 days | 10-12 files | Automated |
| **Sprint 3** | Features | 3-5 days | 15+ files | Comprehensive |
| **TOTAL** | | **8-12 days** | **35-40 files** | |

---

## Success Metrics

### Sprint 0 (Emergency)
- ✅ 0 TypeScript BLOCKER errors
- ✅ Production app loads without crashes
- ✅ People detail page works
- ✅ Core CRUD operations functional

### Sprint 1 (Data)
- ✅ 0 TypeScript HIGH errors
- ✅ Export functionality works
- ✅ All data fields accessible
- ✅ Database migration successful

### Sprint 2 (Quality)
- ✅ 0 TypeScript compilation errors
- ✅ All API routes return correct data
- ✅ UI components render properly
- ✅ Type safety enforced

### Sprint 3 (Complete)
- ✅ All features work or are removed
- ✅ Comprehensive test coverage
- ✅ Performance benchmarks met
- ✅ Production monitoring in place

---

## Recommendations

### Immediate Actions (TODAY)
1. 🔥 **BACKUP DATABASE** - Before any schema changes
2. 🔥 **Create hotfix branch** - `hotfix/schema-alignment`
3. 🔥 **Fix Sprint 0 issues** - Get production working
4. 🔥 **Deploy to staging first** - Test before prod

### Short Term (THIS WEEK)
1. ✅ Complete Sprint 0 & 1
2. ✅ Set up automated testing
3. ✅ Add error monitoring (Sentry)
4. ✅ Create migration rollback plan

### Medium Term (NEXT WEEK)
1. ✅ Complete Sprint 2 & 3
2. ✅ Document schema decisions
3. ✅ Create developer onboarding guide
4. ✅ Set up CI/CD pipeline

### Long Term (NEXT MONTH)
1. ✅ Add comprehensive E2E tests
2. ✅ Implement feature flags
3. ✅ Create data migration tools
4. ✅ Performance optimization

---

## Architecture Improvements

### Prevent Future Schema Mismatches
1. **Use Prisma introspection** - Generate types from schema
2. **Enforce TypeScript strict mode** - Catch errors earlier
3. **Add Prisma schema linting** - Validate relation names
4. **Document conventions** - Naming standards for relations

### Code Quality
1. **Add pre-commit hooks** - Run type check before commit
2. **CI/CD validation** - Build + type check on every PR
3. **Automated testing** - Unit tests for all API routes
4. **Code review checklist** - Schema changes require review

### Development Workflow
1. **Schema-first development** - Define schema before code
2. **Migration review process** - All migrations reviewed by senior dev
3. **Staging environment** - Test migrations before production
4. **Rollback procedures** - Document how to undo changes

---

## Files Requiring Changes (Complete List)

### CRITICAL (Sprint 0)
1. ✅ `prisma/schema.prisma` - Fix relations, casing
2. ✅ `src/app/api/people/[id]/route.ts` - Fix includes
3. ✅ `src/app/api/reports/pdf/route.ts` - Fix Meeting, queries
4. ✅ `src/app/api/export/full/route.ts` - Fix Meeting, includes
5. ✅ `src/app/api/dashboards/stats/route.ts` - Fix auditLog
6. ✅ `src/lib/research-queue.ts` - Fix dossier references
7. ✅ `src/app/api/research/candidates/route.ts` - Fix dossier references
8. ✅ `src/app/dashboard/people/[id]/page.tsx` - Fix data.people typo

### HIGH PRIORITY (Sprint 1)
9. ✅ `prisma/schema.prisma` - Add missing fields
10. ✅ `src/app/api/export/full/route.ts` - Use new fields
11. ✅ Database migration scripts
12. ✅ Seed data files

### MEDIUM PRIORITY (Sprint 2)
13. ✅ `src/components/ui/avatar.tsx` - Add component
14. ✅ `src/components/ui/tooltip.tsx` - Add component
15. ✅ `src/components/ui/separator.tsx` - Add component
16. ✅ `src/components/team/presence-indicator.tsx` - Use new components
17. ✅ `src/app/dashboard/reports/builder/page.tsx` - Use separator
18. ✅ `src/app/api/analytics/heatmap/route.ts` - Fix queries
19. ✅ `src/app/api/outreach/track/route.ts` - Fix personId
20. ✅ `src/app/api/outreach/activity/route.ts` - Fix REPLIED, personId

### LOW PRIORITY (Sprint 3)
21. ✅ `src/app/api/cron/sequences/route.ts` - Complete or remove
22. ✅ `src/app/api/enrichment/smart-guess/route.ts` - Fix dossier
23. ✅ `src/app/api/research/refresh/route.ts` - Fix dossier
24. ✅ All files with minor type issues

**Total Files to Modify:** ~30-40 files

---

## Critical Decision Points

### Decision 1: Relation Naming Strategy
**Question:** Fix schema or fix code?

**Option A: Update Schema (RECOMMENDED)**
- Pros: Less code changes, clearer naming
- Cons: Requires migration
- Files affected: 1 (schema) + migration

**Option B: Update Code**
- Pros: No migration needed
- Cons: 50+ file changes, error-prone
- Files affected: 50+ files

**Recommendation:** Option A - Update schema with proper relation names

---

### Decision 2: Missing Fields Strategy
**Question:** Add fields to schema or remove from code?

**Option A: Add to Schema (RECOMMENDED)**
- Pros: Complete data model, enables exports
- Cons: Migration complexity
- Impact: Enables full feature set

**Option B: Remove from Code**
- Pros: No migration
- Cons: Breaks export functionality
- Impact: Limited features

**Recommendation:** Option A - Add fields, they're needed for business logic

---

### Decision 3: Sequences Feature
**Question:** Complete or remove?

**Option A: Complete Implementation**
- Effort: 2-3 days
- Value: High (automated outreach)
- Risk: Medium (complex feature)

**Option B: Remove/Stub**
- Effort: 1 day
- Value: Low (removes feature)
- Risk: Low (simple cleanup)

**Recommendation:** Stub for now (Sprint 0), complete in Sprint 3 if priority

---

### Decision 4: Audit Logging
**Question:** New table or repurpose activities?

**Option A: Repurpose Activities**
- Effort: Low (already exists)
- Value: High (working solution)
- Risk: Low

**Option B: Create Audit Log Table**
- Effort: Medium (new migration)
- Value: Medium (cleaner separation)
- Risk: Medium

**Recommendation:** Option A - Use activities model, it's sufficient

---

## Next Steps

1. **Review this plan** with team
2. **Get approval** for schema changes
3. **Backup production database**
4. **Create feature branch:** `hotfix/production-schema-fix`
5. **Start Sprint 0 fixes**
6. **Test on staging**
7. **Deploy to production**
8. **Monitor for errors**

---

## Appendix: Error Reference

### All 63 Errors by File

<details>
<summary>Click to expand full error list</summary>

#### `/src/app/api/analytics/heatmap/route.ts`
- Line 32: `person` doesn't exist in `outreachWhereInput`

#### `/src/components/team/presence-indicator.tsx`
- Line 5: Cannot find module `@/components/ui/avatar`
- Line 12: Cannot find module `@/components/ui/tooltip`

#### `/src/app/api/reports/pdf/route.ts`
- Line 40: Property `Meeting` doesn't exist (use `meeting`)
- Line 51: `person` doesn't exist in `outreachWhereInput`
- Line 59: Cannot apply `+` to `number` and `_count` object
- Line 59: Object is possibly undefined
- Line 63: Left side of arithmetic must be number
- Line 64: Left side of arithmetic must be number

#### `/src/app/dashboard/reports/builder/page.tsx`
- Line 7: Cannot find module `@/components/ui/separator`

#### `/src/app/api/export/full/route.ts`
- Line 36: `account` doesn't exist in `peopleInclude`
- Line 36: `Meeting` property (use `meeting`)
- Line 41: `person` doesn't exist in `outreachWhereInput`
- Line 46: `account` doesn't exist in `peopleInclude`
- Line 50: Property `Meeting` doesn't exist
- Line 83: Property `tier` doesn't exist on account
- Line 85: Property `location` doesn't exist on account
- Line 86: Property `revenue` doesn't exist on account
- Line 87: Property `employeeCount` doesn't exist on account
- Line 97: Property `account` doesn't exist on people
- Line 98: Property `icpScore` doesn't exist on people
- Line 101: Property `isSupplyChain` doesn't exist on people
- Line 102: Property `isITTech` doesn't exist on people
- Line 103: Property `isProcurement` doesn't exist on people
- Line 104: Property `isFacilities` doesn't exist on people
- Line 109: Property `people` doesn't exist on outreach
- Line 110: Property `people` doesn't exist on outreach
- Line 119: Parameter `m` implicitly has `any` type

#### `/src/lib/research-queue.ts`
- Line 62: `dossier` doesn't exist in `target_accountsInclude`
- Line 76: Property `dossier` doesn't exist on account
- Line 77: Property `dossier` doesn't exist on account
- Line 98: Missing `id` in `company_dossiersUncheckedCreateInput`

#### `/src/app/api/research/candidates/route.ts`
- Line 39: `dossier` doesn't exist in `target_accountsInclude`
- Line 53: Property `dossier` doesn't exist on account
- Line 54: Property `dossier` doesn't exist on account
- Line 57: Property `dossier` doesn't exist on account
- Line 65: Property `dossier` doesn't exist on account

#### `/src/app/api/dashboards/stats/route.ts`
- Line 107: Property `auditLog` doesn't exist on PrismaClient
- Line 120: Parameter `log` implicitly has `any` type

#### `/src/app/api/outreach/track/route.ts`
- Line 46: `personId` doesn't exist in `activitiesCreateInput`

#### `/src/app/api/outreach/activity/route.ts`
- Line 35: `OutreachStatus` and `"REPLIED"` have no overlap
- Line 36: Type `"REPLIED"` not assignable to `OutreachStatus`
- Line 54: `personId` doesn't exist in `activitiesCreateInput`

#### `/src/app/api/cron/sequences/route.ts`
- Line 31: `status` doesn't exist in `sequencesWhereInput`
- Line 34: `people` doesn't exist in `sequencesInclude`
- Line 47: Property `currentStep` doesn't exist on sequences
- Line 54: `status` doesn't exist in `sequencesUpdateInput`
- Line 66: Property `lastStepDate` doesn't exist on sequences
- Line 80: Property `personId` doesn't exist on sequences
- Line 81: `eventId` doesn't exist in `outreachCreateInput`
- Line 81: Property `people` doesn't exist on sequences

#### `/src/app/api/people/[id]/route.ts`
- Line 38: `dossier` doesn't exist in target_accounts include
- Line 41: `insights` doesn't exist on people model

#### `/src/app/dashboard/people/[id]/page.tsx`
- Line 43: Should be `data.person.accountId` not `data.people.accountId`

</details>

---

**Document Version:** 1.0  
**Last Updated:** January 22, 2026  
**Author:** AI Code Review System  
**Status:** Ready for Review
