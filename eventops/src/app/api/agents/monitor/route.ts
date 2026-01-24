/**
 * Agent Monitoring Dashboard API - Sprint 32.6
 * Provides telemetry and observability for AI agent operations
 * 
 * GET /api/agents/monitor?timeRange=24h
 * - Overall agent performance metrics
 * - Success/failure rates per agent type
 * - Average execution times
 * - Recent task history
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const agentType = searchParams.get('agentType');

    // Calculate time window
    const hours = parseInt(timeRange.replace('h', ''));
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Base query filters
    const where = {
      created_at: { gte: since },
      ...(agentType && { agent_type: agentType }),
    };

    // Fetch metrics
    const [totalTasks, completedTasks, failedTasks, avgDuration, tasksByType, recentTasks] =
      await Promise.all([
        // Total tasks
        prisma.agent_tasks.count({ where }),

        // Completed tasks
        prisma.agent_tasks.count({
          where: { ...where, status: 'completed' },
        }),

        // Failed tasks
        prisma.agent_tasks.count({
          where: { ...where, status: 'failed' },
        }),

        // Average task duration
        prisma.agent_tasks.findMany({
          where: {
            ...where,
            status: 'completed',
            completed_at: { not: null },
          },
          select: {
            created_at: true,
            completed_at: true,
          },
        }),

        // Tasks by agent type
        prisma.agent_tasks.groupBy({
          by: ['agent_type', 'status'],
          where,
          _count: true,
        }),

        // Recent task history (last 20)
        prisma.agent_tasks.findMany({
          where,
          orderBy: { created_at: 'desc' },
          take: 20,
          select: {
            id: true,
            agent_type: true,
            status: true,
            created_at: true,
            completed_at: true,
            error_message: true,
            account_id: true,
            contact_id: true,
          },
        }),
      ]);

    // Calculate average duration in seconds
    const durations = avgDuration
      .map((task) => {
        if (!task.completed_at) return 0;
        return (task.completed_at.getTime() - task.created_at.getTime()) / 1000;
      })
      .filter((d) => d > 0);

    const avgDurationSeconds =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    // Build agent type breakdown
    const agentMetrics = tasksByType.reduce(
      (acc, item) => {
        if (!acc[item.agent_type]) {
          acc[item.agent_type] = {
            total: 0,
            completed: 0,
            failed: 0,
            in_progress: 0,
            pending: 0,
          };
        }
        acc[item.agent_type].total += item._count;
        acc[item.agent_type][item.status as keyof typeof acc[string]] = item._count;
        return acc;
      },
      {} as Record<string, Record<string, number>>
    );

    // Calculate success rate
    const successRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    logger.info('Agent monitoring dashboard accessed', {
      userId: session.user.id,
      timeRange,
      agentType,
    });

    return NextResponse.json({
      summary: {
        timeRange,
        totalTasks,
        completedTasks,
        failedTasks,
        successRate: Math.round(successRate * 10) / 10,
        avgDurationSeconds: Math.round(avgDurationSeconds),
      },
      agentMetrics,
      recentTasks,
    });
  } catch (error) {
    logger.error('Agent monitoring failed', { error });
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data' },
      { status: 500 }
    );
  }
}
