/**
 * Sprint Completion API Endpoint
 * 
 * POST /api/sprints/complete
 * 
 * Triggers sprint completion workflow:
 * 1. Collects performance metrics
 * 2. Sends email notification to casey@freightroll.com
 * 3. Logs completion in activities table
 * 4. Updates sprint tracking
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendSprintCompletionEmail, type SprintMetrics } from '@/lib/email/sprint-completion';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const metrics: SprintMetrics = body;

    // Validate required fields
    const requiredFields = [
      'sprintNumber',
      'sprintName',
      'startDate',
      'endDate',
      'demo',
      'tasksCompleted',
      'tasksTotal',
    ];

    for (const field of requiredFields) {
      if (!metrics[field as keyof SprintMetrics]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Send email notification
    const emailResult = await sendSprintCompletionEmail(metrics);

    if (!emailResult.success) {
      console.error('Email send failed but continuing:', emailResult.error);
    }

    // Log in activities table
    await prisma.activities.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.user.id,
        entityType: 'sprint',
        entityId: metrics.sprintNumber.toString(),
        action: 'sprint_completed',
        metadata: {
          sprintName: metrics.sprintName,
          tasksCompleted: metrics.tasksCompleted,
          tasksTotal: metrics.tasksTotal,
          buildTime: metrics.buildTime,
          apiP95Response: metrics.apiP95Response,
          testCoverage: metrics.testCoverage,
          commitHash: metrics.commitHash,
          emailSent: emailResult.success,
        },
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      emailSent: emailResult.success,
      sprintNumber: metrics.sprintNumber,
      sprintName: metrics.sprintName,
    });
  } catch (error: any) {
    console.error('Sprint completion error:', error);
    return NextResponse.json(
      { error: error.message || 'Sprint completion failed' },
      { status: 500 }
    );
  }
}

/**
 * Example usage:
 * 
 * curl -X POST http://localhost:3000/api/sprints/complete \
 *   -H "Content-Type: application/json" \
 *   -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
 *   -d '{
 *     "sprintNumber": 18,
 *     "sprintName": "Google Workspace Integration",
 *     "startDate": "Jan 23, 2026",
 *     "endDate": "Jan 27, 2026",
 *     "demo": "User connects Google account, sees synced meetings",
 *     "buildTime": 4250,
 *     "buildTimeChange": -12.5,
 *     "apiP95Response": 185,
 *     "apiP95Change": -8.2,
 *     "bundleSize": 1228.8,
 *     "bundleSizeChange": 3.1,
 *     "testCoverage": 78.5,
 *     "testCoverageChange": 5.2,
 *     "tasksCompleted": 6,
 *     "tasksTotal": 6,
 *     "taskDetails": [
 *       {
 *         "id": "18.1",
 *         "name": "Google OAuth Setup",
 *         "validation": "OAuth flow tested, tokens stored"
 *       },
 *       {
 *         "id": "18.2",
 *         "name": "Calendar Sync",
 *         "validation": "100 events imported successfully"
 *       }
 *     ],
 *     "productionUrl": "https://yard-flow-hitlist.vercel.app",
 *     "commitHash": "8b906ce",
 *     "deploymentStatus": "live",
 *     "nextSprint": {
 *       "number": 19,
 *       "name": "Bulk Operations & Performance",
 *       "startDate": "Jan 28, 2026",
 *       "goal": "High-performance bulk operations"
 *     }
 *   }'
 */
