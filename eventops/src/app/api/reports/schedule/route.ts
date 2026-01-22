import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reports/schedule - Get scheduled reports
 * POST /api/reports/schedule - Create scheduled report
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // In production, fetch from scheduled_reports table
  // For now, return empty array
  return NextResponse.json({ schedules: [] });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { frequency, recipients, reportType } = await req.json();

  // In production, create schedule in database and configure cron job
  // For now, return success
  
  return NextResponse.json({
    schedule: {
      id: Math.random().toString(36),
      frequency,
      recipients,
      reportType,
      nextRun: getNextRunDate(frequency),
    },
  }, { status: 201 });
}

function getNextRunDate(frequency: string): Date {
  const now = new Date();
  
  switch (frequency) {
    case 'daily':
      now.setDate(now.getDate() + 1);
      now.setHours(8, 0, 0, 0);
      break;
    case 'weekly':
      now.setDate(now.getDate() + (8 - now.getDay())); // Next Monday
      now.setHours(8, 0, 0, 0);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() + 1, 1);
      now.setHours(8, 0, 0, 0);
      break;
  }
  
  return now;
}
