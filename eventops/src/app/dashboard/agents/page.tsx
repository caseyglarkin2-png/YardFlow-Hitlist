'use client';

/**
 * Agent Monitoring Dashboard - Sprint 33.1
 * Real-time visibility into AI agent operations
 */

import { useState } from 'react';
import { useAgentMonitoring } from '@/hooks/useAgentMonitoring';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AgentsDashboardPage() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const { data, loading, error, refresh } = useAgentMonitoring(timeRange);
  const { toast } = useToast();
  const [triggering, setTriggering] = useState(false);

  const triggerAgent = async (action: string, params: any) => {
    try {
      setTriggering(true);
      const response = await fetch('/api/agents/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, params }),
      });

      if (!response.ok) throw new Error('Failed to trigger agent');

      toast({
        title: 'Agent Triggered',
        description: `Successfully started ${action}`,
      });

      // Refresh data without reloading page
      setTimeout(() => refresh(), 1000);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to start agent task',
        variant: 'destructive',
      });
    } finally {
      setTriggering(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center flex-col gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-muted-foreground">Loading squad status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive p-4">
        <p className="text-destructive">Error loading monitoring data: {error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { summary, agentMetrics, recentTasks } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Agent Squad Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time performance metrics for autonomous GTM agents
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => triggerAgent('run-prospecting', { eventId: 'manifest-2026' })}
            disabled={triggering}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Start Prospecting
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              triggerAgent('start-campaign', {
                eventId: 'manifest-2026',
                campaignType: 'pre-event',
              })
            }
            disabled={triggering}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Full Campaign
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
        <TabsList>
          <TabsTrigger value="24h">Last 24 Hours</TabsTrigger>
          <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
          <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tasks</CardDescription>
            <CardTitle className="text-3xl">{summary.totalTasks}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl text-green-600">{summary.completedTasks}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-3xl text-red-600">{summary.failedTasks}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Success Rate</CardDescription>
            <CardTitle className="text-3xl">{summary.successRate}%</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Duration</CardDescription>
            <CardTitle className="text-3xl">{summary.avgDurationSeconds}s</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Agent Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance Breakdown</CardTitle>
          <CardDescription>Task execution by agent type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(agentMetrics).map(([agentType, metrics]) => (
              <div key={agentType} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium capitalize">{agentType.replace('_', ' ')}</div>
                  <div className="text-sm text-muted-foreground">{metrics.total} tasks</div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${(metrics.completed / metrics.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline" className="bg-green-50">
                      {metrics.completed} done
                    </Badge>
                    {metrics.failed > 0 && (
                      <Badge variant="outline" className="bg-red-50">
                        {metrics.failed} failed
                      </Badge>
                    )}
                    {metrics.in_progress > 0 && (
                      <Badge variant="outline" className="bg-blue-50">
                        {metrics.in_progress} running
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Task History</CardTitle>
          <CardDescription>Last 20 agent executions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      task.status === 'completed'
                        ? 'default'
                        : task.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {task.status}
                  </Badge>
                  <div>
                    <div className="font-medium capitalize">
                      {task.agent_type.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {task.error_message || task.id}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(task.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
