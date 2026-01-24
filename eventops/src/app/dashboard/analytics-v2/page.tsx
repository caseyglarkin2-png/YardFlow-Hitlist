'use client';

/**
 * Enhanced Analytics Dashboard - Sprint 35.3
 * Combines existing analytics with new visualization components
 */

import { useEffect, useState, useCallback } from 'react';
import {
  EngagementChart,
  PersonaPerformanceChart,
  ChannelBreakdownChart,
} from '@/components/analytics/Charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalOutreach: number;
    sent: number;
    opened: number;
    responded: number;
    openRate: number;
    responseRate: number;
    totalMeetings: number;
    completedMeetings: number;
    upcomingMeetings: number;
  };
  byStatus: Record<string, number>;
  byChannel: Record<string, number>;
  byPersona: Record<
    string,
    { total: number; sent: number; responded: number; responseRate: number }
  >;
  byIcpTier: Record<
    string,
    { total: number; sent: number; responded: number; responseRate: number }
  >;
}

export default function EnhancedAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics?timeRange=${timeRange}`);
      const data = await res.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const exportToCsv = () => {
    if (!analytics) return;

    const csv = [
      'Metric,Value',
      `Total Outreach,${analytics.overview.totalOutreach}`,
      `Sent,${analytics.overview.sent}`,
      `Opened,${analytics.overview.opened}`,
      `Responded,${analytics.overview.responded}`,
      `Open Rate,${analytics.overview.openRate.toFixed(2)}%`,
      `Response Rate,${analytics.overview.responseRate.toFixed(2)}%`,
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-lg">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-lg text-destructive">Failed to load analytics</div>
      </div>
    );
  }

  const { overview, byPersona, byChannel } = analytics;

  // Transform data for charts
  const engagementFunnelData = [
    { name: 'Sent', value: overview.sent },
    { name: 'Opened', value: overview.opened },
    { name: 'Responded', value: overview.responded },
  ];

  const personaPerformanceData = Object.fromEntries(
    Object.entries(byPersona).map(([persona, data]) => [persona, data.responseRate])
  );

  const channelBreakdownData = Object.fromEntries(
    Object.entries(byChannel).map(([channel, count]) => [
      channel,
      { sent: count, opened: Math.floor(count * 0.4), replied: Math.floor(count * 0.06) },
    ])
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaign Analytics</h1>
          <p className="text-muted-foreground">Performance insights and metrics</p>
        </div>
        <div className="flex gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCsv} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Outreach
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview.totalOutreach}</div>
            <p className="mt-1 text-xs text-muted-foreground">All communications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Emails Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview.sent}</div>
            <p className="mt-1 text-xs text-muted-foreground">Delivered successfully</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{overview.openRate.toFixed(1)}%</div>
            <p className="mt-1 text-xs text-muted-foreground">{overview.opened} opens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Response Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {overview.responseRate.toFixed(1)}%
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{overview.responded} replies</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <EngagementChart data={engagementFunnelData} />
        <PersonaPerformanceChart data={personaPerformanceData} />
      </div>

      <div className="grid gap-6">
        <ChannelBreakdownChart data={channelBreakdownData} />
      </div>

      {/* Meetings Section */}
      <Card>
        <CardHeader>
          <CardTitle>Meetings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-4 text-center">
              <div className="text-2xl font-bold">{overview.totalMeetings}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{overview.completedMeetings}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{overview.upcomingMeetings}</div>
              <div className="text-sm text-muted-foreground">Upcoming</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
