# Sprint 59: Email Configuration Hardening

**Goal**: Eliminate email configuration errors by adding validation, documentation, and clear error messages.

**Root Cause of Current Issues**:
1. `SENDGRID_API_KEY_CASEY` was added but code uses `SENDGRID_API_KEY`
2. No startup validation warns when env vars are misconfigured
3. Error messages don't clearly indicate which variable is wrong

---

## Environment Variable Reference

### Railway (YardFlow-Hitlist)

| Variable | Required | Description |
|----------|----------|-------------|
| `SENDGRID_API_KEY` | ✅ | **Must be Casey's verified key** (from SendGrid "GTM-yard-flow") |
| `SENDGRID_FROM_EMAIL` | ✅ | `casey@freightroll.com` |
| `SERVICE_TO_SERVICE_SECRET` | ✅ | Shared secret for S2S auth |
| `DATABASE_URL` | ✅ | PostgreSQL connection |
| `REDIS_URL` | ✅ | Redis connection |

### Railway (YardFlow-Worker)

Same as YardFlow-Hitlist (shares env vars)

### Vercel (GTM-YardFlow)

| Variable | Required | Description |
|----------|----------|-------------|
| `RAILWAY_API_SECRET` | ✅ | **Must match Railway's `SERVICE_TO_SERVICE_SECRET`** |
| `NEXT_PUBLIC_RAILWAY_URL` | ✅ | `https://yardflow-hitlist-production-2f41.up.railway.app` |

**Vercel does NOT need**: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `DATABASE_URL`, `REDIS_URL`
All email/DB operations proxy through Railway.

---

## Sprint Tasks

### Task 59.1: Validate SendGrid Config at Startup

**File**: `src/lib/email/config-validator.ts`

```typescript
export interface EmailConfigValidation {
  valid: boolean;
  apiKeySet: boolean;
  apiKeyLength: number;
  fromEmailSet: boolean;
  fromEmailValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEmailConfig(): EmailConfigValidation {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check API key
  const apiKeySet = !!apiKey;
  const apiKeyLength = apiKey?.length || 0;
  
  if (!apiKeySet) {
    errors.push('SENDGRID_API_KEY is not set');
  } else if (apiKeyLength < 20) {
    errors.push('SENDGRID_API_KEY appears invalid (too short)');
  }
  
  // Check common misconfiguration: wrong variable name
  if (!apiKeySet && process.env.SENDGRID_API_KEY_CASEY) {
    errors.push('Found SENDGRID_API_KEY_CASEY but code expects SENDGRID_API_KEY - rename the variable');
  }
  
  // Check from email
  const fromEmailSet = !!fromEmail;
  const fromEmailValid = fromEmail ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail) : false;
  
  if (!fromEmailSet) {
    warnings.push('SENDGRID_FROM_EMAIL not set - will use fallback');
  } else if (!fromEmailValid) {
    errors.push(`SENDGRID_FROM_EMAIL "${fromEmail}" is not a valid email`);
  }
  
  // Check for unverified sender (Jake's email while not verified)
  if (fromEmail === 'jake@freightroll.com') {
    warnings.push('SENDGRID_FROM_EMAIL is jake@freightroll.com - ensure this sender is verified in SendGrid');
  }
  
  return {
    valid: errors.length === 0,
    apiKeySet,
    apiKeyLength,
    fromEmailSet,
    fromEmailValid,
    errors,
    warnings,
  };
}
```

**Test**: `tests/lib/email-config-validator.test.ts`
**Commit**: `feat(email): add startup config validator with clear error messages`

---

### Task 59.2: Add Config Validation to Health Endpoint

**File**: `src/app/api/email/health/route.ts`

Update to include config validation:

```typescript
import { validateEmailConfig } from '@/lib/email/config-validator';

// In the handler:
const configValidation = validateEmailConfig();

return NextResponse.json({
  status: configValidation.valid ? 'ok' : 'misconfigured',
  config: {
    apiKeySet: configValidation.apiKeySet,
    fromEmailSet: configValidation.fromEmailSet,
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'not set',
  },
  errors: configValidation.errors,
  warnings: configValidation.warnings,
});
```

**Test**: Verify `/api/email/health` returns config validation
**Commit**: `feat(email): add config validation to health endpoint`

---

### Task 59.3: Improve Error Messages in Send Routes

**File**: `src/app/api/outreach/send-email/route.ts`

Current:
```typescript
if (!process.env.SENDGRID_API_KEY) {
  return NextResponse.json({ error: 'SendGrid not configured' }, { status: 500 });
}
```

Improved:
```typescript
import { validateEmailConfig } from '@/lib/email/config-validator';

const configValidation = validateEmailConfig();
if (!configValidation.valid) {
  return NextResponse.json({
    error: 'Email service misconfigured',
    details: configValidation.errors.join('; '),
    hint: 'Check Railway environment variables',
  }, { status: 500 });
}
```

**Commit**: `fix(email): improve error messages for misconfigured SendGrid`

---

### Task 59.4: Add Config Validation Test Suite

**File**: `tests/lib/email-config-validator.test.ts`

```typescript
describe('Email Config Validator', () => {
  it('detects missing SENDGRID_API_KEY', () => {
    delete process.env.SENDGRID_API_KEY;
    const result = validateEmailConfig();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('SENDGRID_API_KEY is not set');
  });

  it('detects wrong variable name (SENDGRID_API_KEY_CASEY)', () => {
    delete process.env.SENDGRID_API_KEY;
    process.env.SENDGRID_API_KEY_CASEY = 'SG.xxx';
    const result = validateEmailConfig();
    expect(result.errors).toContain(
      'Found SENDGRID_API_KEY_CASEY but code expects SENDGRID_API_KEY - rename the variable'
    );
  });

  it('validates from email format', () => {
    process.env.SENDGRID_FROM_EMAIL = 'not-an-email';
    const result = validateEmailConfig();
    expect(result.fromEmailValid).toBe(false);
  });

  it('warns about unverified jake@ sender', () => {
    process.env.SENDGRID_API_KEY = 'SG.test-key-that-is-long-enough';
    process.env.SENDGRID_FROM_EMAIL = 'jake@freightroll.com';
    const result = validateEmailConfig();
    expect(result.warnings).toContain(
      'SENDGRID_FROM_EMAIL is jake@freightroll.com - ensure this sender is verified in SendGrid'
    );
  });

  it('passes with valid config', () => {
    process.env.SENDGRID_API_KEY = 'SG.test-key-that-is-long-enough';
    process.env.SENDGRID_FROM_EMAIL = 'casey@freightroll.com';
    const result = validateEmailConfig();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
```

**Commit**: `test(email): add config validator test suite`

---

### Task 59.5: Update Environment Documentation

**File**: `docs/current/ENV_VARS.md`

Add clear section on email configuration with common mistakes and fixes.

**Commit**: `docs: add email configuration troubleshooting guide`

---

## Verification Checklist

After completing Sprint 59:

- [ ] `npm run lint` passes
- [ ] `npm test` passes (including new config validator tests)
- [ ] `/api/email/health` returns `{ config: { ... }, errors: [], warnings: [] }`
- [ ] Attempting to send with wrong env var name gives clear error message
- [ ] Railway logs show config validation on startup

---

## Immediate Action Items (Before Sprint 59 Code)

**These are Railway/Vercel console changes, not code:**

1. **Railway**: Update `SENDGRID_API_KEY` value to Casey's key
2. **Railway**: Delete `SENDGRID_API_KEY_CASEY` (unused)
3. **Railway**: Confirm `SENDGRID_FROM_EMAIL` = `casey@freightroll.com`
4. **Vercel**: Delete `SENDGRID_API_KEY_CASEY` (not needed)
5. **Test**: `curl https://yardflow-hitlist-production-2f41.up.railway.app/api/email/health -H "x-service-key: <secret>"`

---

## Demo Script

**Sprint 59 Demo** (5 min):

1. Show `/api/email/health` with validation output
2. Temporarily misconfigure `SENDGRID_API_KEY` → show clear error
3. Show test suite catching wrong variable name
4. Send test email successfully with correct config
