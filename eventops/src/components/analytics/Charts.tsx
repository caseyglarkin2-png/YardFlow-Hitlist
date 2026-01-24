'use client';

/**
 * Analytics Charts - Sprint 35.3
 * Real-time performance visualization
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartData {
  name: string;
  value: number;
}

export function EngagementChart({ data }: { data: ChartData[] }) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagement Funnel</CardTitle>
        <CardDescription>Email performance metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => {
            const percentage = (item.value / data[0].value) * 100;
            const barWidth = (item.value / maxValue) * 100;

            return (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </span>
                    <span className="text-sm font-semibold">{item.value}</span>
                  </div>
                </div>
                <div className="h-8 bg-muted rounded-lg overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      index === 0
                        ? 'bg-blue-500'
                        : index === 1
                          ? 'bg-green-500'
                          : index === 2
                            ? 'bg-yellow-500'
                            : 'bg-purple-500'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function PersonaPerformanceChart({ data }: { data: Record<string, number> }) {
  const personas = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const maxValue = Math.max(...personas.map(([, value]) => value));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance by Persona</CardTitle>
        <CardDescription>Reply rate by target audience</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {personas.map(([persona, replyRate]) => {
            const barWidth = (replyRate / maxValue) * 100;

            return (
              <div key={persona} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{persona}</span>
                  <span className="text-sm font-semibold">{replyRate.toFixed(1)}%</span>
                </div>
                <div className="h-6 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function ChannelBreakdownChart({
  data,
}: {
  data: Record<string, { sent: number; opened: number; replied: number }>;
}) {
  const channels = Object.entries(data);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel Performance</CardTitle>
        <CardDescription>Engagement by communication channel</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {channels.map(([channel, metrics]) => {
            const openRate = metrics.sent > 0 ? (metrics.opened / metrics.sent) * 100 : 0;
            const replyRate = metrics.sent > 0 ? (metrics.replied / metrics.sent) * 100 : 0;

            return (
              <div
                key={channel}
                className="p-4 border rounded-lg space-y-3"
              >
                <div className="font-semibold text-sm">{channel}</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Sent</span>
                    <span className="font-medium">{metrics.sent}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Open Rate</span>
                    <span className="font-medium">{openRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Reply Rate</span>
                    <span className="font-medium text-green-600">{replyRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function TimelineChart({ data }: { data: Array<{ date: string; count: number }> }) {
  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
        <CardDescription>Daily outreach volume</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between h-48 gap-2">
          {data.map((item) => {
            const heightPercent = (item.count / maxCount) * 100;

            return (
              <div key={item.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="relative flex-1 w-full flex items-end">
                  <div
                    className="w-full bg-blue-500 rounded-t-md transition-all hover:bg-blue-600 cursor-pointer"
                    style={{ height: `${heightPercent}%` }}
                    title={`${item.date}: ${item.count} emails`}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.date).getDate()}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
