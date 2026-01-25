import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * LIVENESS PROBE
 * Returns 200 OK if the Node.js process is running.
 * ZERO Dependencies. No DB. No Redis.
 */
export async function GET() {
  return NextResponse.json(
    { 
      status: 'ok', 
      service: 'yardflow-hitlist',
      timestamp: new Date().toISOString() 
    },
    { status: 200 }
  );
}
