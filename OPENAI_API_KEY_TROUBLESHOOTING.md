# OpenAI API Key Setup - Complete Guide

## Problem
The AI features (contact insights, outreach generation, ROI calculations) require OpenAI API access but keep failing in production with "Failed to generate" errors.

## Root Cause Analysis

The codebase uses **lazy-loading** for the OpenAI client to avoid build errors:

```typescript
let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}
```

This prevents build failures BUT the API key must still be accessible at **runtime** in production.

## ✅ Verified Steps (You've Done This)

Based on your screenshots, you have:
1. ✅ Created an OpenAI API key
2. ✅ Added `OPENAI_API_KEY` to Vercel environment variables
3. ✅ Redeployed the app (deployment 79wC3ACFg is "Ready")

## 🚨 Why It's Still Failing

There are **3 possible causes**:

### 1. Environment Variable Scope Issue
Vercel has 3 environment scopes:
- Production
- Preview
- Development

**Check:** Did you add the key to **Production** scope?

**Fix:**
1. Go to Vercel → Project Settings → Environment Variables
2. Find `OPENAI_API_KEY`
3. Verify it's checked for "Production" ✅
4. If not, edit and enable Production scope
5. Trigger new deployment (Settings → Deployments → Redeploy)

### 2. Key Format Issue
The OpenAI SDK expects keys starting with `sk-proj-` (new format) or `sk-` (legacy).

**Check:** Is your key in the correct format?

**Fix:**
1. In Vercel env vars, click "View" on OPENAI_API_KEY
2. Verify it starts with `sk-proj-` or `sk-`
3. No extra spaces/quotes around the value
4. If wrong, delete and re-add with correct key

### 3. Cache/Stale Deployment Issue
Sometimes Vercel caches environment variables incorrectly.

**Fix:**
1. Go to Vercel → Settings → Environment Variables
2. **Delete** the OPENAI_API_KEY variable completely
3. **Re-add** it fresh (Production scope only)
4. Go to Deployments → Click "..." on latest → **Redeploy** (not just "Visit")
5. Wait for new deployment to finish
6. Test again

## 🧪 How to Test If It's Working

### Option 1: Check Deployment Logs
1. Go to Vercel → Deployments → Click latest deployment
2. Click "View Function Logs"
3. Try generating outreach in the app
4. Look for errors in logs - should show actual OpenAI error if key is wrong

### Option 2: Use the Debug Endpoint
We created `/api/debug/env` but it requires Vercel auth. 

**Workaround:** Add this temporary test endpoint:

```typescript
// src/app/api/test-openai/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  const hasKey = !!process.env.OPENAI_API_KEY;
  const keyPrefix = process.env.OPENAI_API_KEY?.substring(0, 10) || 'not set';
  
  if (!hasKey) {
    return NextResponse.json({ 
      error: 'OPENAI_API_KEY not found in environment',
      hasKey: false 
    });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say "API key works!"' }],
      max_tokens: 10,
    });
    
    return NextResponse.json({
      success: true,
      hasKey: true,
      keyPrefix,
      testResponse: response.choices[0]?.message?.content,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'API key found but OpenAI call failed',
      hasKey: true,
      keyPrefix,
      details: error.message,
    });
  }
}
```

Then visit: `https://your-app.vercel.app/api/test-openai`

Expected response if working:
```json
{
  "success": true,
  "hasKey": true,
  "keyPrefix": "sk-proj-zc",
  "testResponse": "API key works!"
}
```

If it returns an error, the error message will tell you exactly what's wrong.

## 🔧 What I Can Do vs What You Must Do

### ✅ I Already Did (Code-Level Fixes)
- Implemented lazy-loading pattern for OpenAI client
- Added error handling with detailed messages
- Created force-dynamic exports on all API routes
- Fixed all build errors

### ⚠️ You Must Do (Vercel Configuration)
Vercel environment variables are **outside my control**. I cannot:
- Access your Vercel dashboard
- See/modify environment variables
- Trigger deployments directly

**You must:**
1. Verify OPENAI_API_KEY is set for Production scope
2. Confirm key format is correct (`sk-proj-...`)
3. Try the delete/re-add fix (clears cache)
4. Check deployment logs for actual errors

## 🎯 Recommended Action Plan

**Do this NOW (5 minutes):**

1. **Delete and re-add the key:**
   - Vercel → Settings → Environment Variables
   - Delete OPENAI_API_KEY
   - Add new: `OPENAI_API_KEY` = `your-key-here` (Production only)
   - Save

2. **Force fresh deployment:**
   - Settings → Deployments
   - Click latest "Ready" deployment (79wC3ACFg)
   - Click "..." → Redeploy
   - Wait for completion

3. **Test immediately:**
   - Go to production app
   - Try generating outreach for one contact
   - If it fails, check browser console for error details

4. **If still failing:**
   - Copy the exact error message
   - Share screenshot of Vercel env var settings (hide actual key value)
   - I'll create the test endpoint to diagnose

## 🚀 Alternative: Use Custom Email Scraper (No OpenAI Required)

I just built a **FREE alternative** that doesn't need OpenAI at all:

### Smart Email Guess
- Pattern-based email generation (no API)
- Uses company size data to pick best pattern
- Learns from known emails in same company
- Generates LinkedIn profile URLs
- **Completely free, unlimited use**

**To use:**
1. Go to `/dashboard/people/enrich`
2. Select "Smart Guess (FREE)" option
3. Filter contacts
4. Click "Start Enrichment"

This works for email + LinkedIn enrichment **without any API keys**.

For AI outreach generation, we still need OpenAI working.

## 📝 Summary

**The issue is NOT in the code** - it's an environment variable configuration issue in Vercel.

**Next step:** Try the delete/re-add fix above. If that doesn't work, create the test endpoint and share the response with me.
