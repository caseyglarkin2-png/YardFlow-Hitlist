'use client';

import { useEffect, useState } from 'react';
import { Users, DollarSign, Calendar, TrendingUp, Mail, Target } from 'lucide-react';
import { MetricCard, ChartWidget, DataTableWidget, ActivityFeed } from '@/components/widgets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardStats {
  accounts: number;
  people: number;
  campaigns: number;
  meetings: number;
  outreachSent: number;
  responseRate: number;
  accountsChange: number;
  meetingsChange: number;
  recentCampaigns: Array<{ name: string; sent: number; opened: number; replied: number }>;
  meetingsByDay: Array<{ name: string; value: number }>;
  recentActivity: Array<{ id: string; type: string; description: string; timestamp: string }>;
}

export default function CustomDashboardsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/dashboards/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Dashboard Unavailable</CardTitle>
            <CardDescription>Failed to load dashboard data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadStats}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Track your event operations performance</p>
        </div>
        <Button onClick={loadStats} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Key Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Accounts"
          value={stats.accounts.toLocaleString()}
          change={stats.accountsChange}
          trend={stats.accountsChange > 0 ? 'up' : stats.accountsChange < 0 ? 'down' : 'neutral'}
          subtitle="target accounts"
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Total Contacts"
          value={stats.people.toLocaleString()}
          subtitle="people"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Meetings Booked"
          value={stats.meetings}
          change={stats.meetingsChange}
          trend={stats.meetingsChange > 0 ? 'up' : stats.meetingsChange < 0 ? 'down' : 'neutral'}
          subtitle="this month"
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Response Rate"
          value={`${stats.responseRate}%`}
          trend={stats.responseRate > 30 ? 'up' : stats.responseRate < 15 ? 'down' : 'neutral'}
          subtitle="avg response"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartWidget
          title="Meetings by Day (Last 7 Days)"
          type="line"
          data={stats.meetingsByDay}
          color="#10b981"
        />
        <ChartWidget
          title="Campaign Performance"
          type="bar"
          data={stats.recentCampaigns.map(c => ({
            name: c.name,
            value: c.replied,
          }))}
          color="#3b82f6"
        />
      </div>

      {/* Data Tables Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <DataTableWidget
          title="Top Campaigns"
          columns={[
            { key: 'name', label: 'Campaign' },
            { key: 'sent', label: 'Sent' },
            { key: 'opened', label: 'Opened' },
            { key: 'replied', label: 'Replied' },
          ]}
          data={stats.recentCampaigns}
          maxRows={5}
        />
        <ActivityFeed
          title="Recent Activity"
          activities={stats.recentActivity}
          maxItems={5}
        />
      </div>
    </div>
  );
}
