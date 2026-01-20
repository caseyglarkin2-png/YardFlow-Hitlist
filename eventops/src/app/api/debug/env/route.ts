import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const keyPrefix = process.env.OPENAI_API_KEY?.substring(0, 10) || 'not set';
  
  return NextResponse.json({
    hasOpenAIKey,
    keyPrefix,
    env: process.env.NODE_ENV,
  });
}
