'use client';

import { useEffect, useState } from 'react';

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
  byPersona: Record<string, { total: number; sent: number; responded: number; responseRate: number }>;
  byIcpTier: Record<string, { total: number; sent: number; responded: number; responseRate: number }>;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      const res = await fetch('/api/analytics');
      const data = await res.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return <div>Failed to load analytics</div>;
  }

  const { overview, byPersona, byIcpTier, byChannel, byStatus } = analytics;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Analytics & Reporting</h1>

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Total Outreach</p>
          <p className="text-3xl font-bold">{overview.totalOutreach}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Sent</p>
          <p className="text-3xl font-bold">{overview.sent}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Response Rate</p>
          <p className="text-3xl font-bold text-green-600">{overview.responseRate}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Meetings</p>
          <p className="text-3xl font-bold text-blue-600">{overview.totalMeetings}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* By Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">By Status</h2>
          <div className="space-y-2">
            {Object.entries(byStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center">
                <span className="text-gray-700">{status}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Channel */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">By Channel</h2>
          <div className="space-y-2">
            {Object.entries(byChannel).map(([channel, count]) => (
              <div key={channel} className="flex justify-between items-center">
                <span className="text-gray-700">{channel}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* By Persona */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Performance by Persona</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">Persona</th>
                <th className="text-right py-2 px-4">Total</th>
                <th className="text-right py-2 px-4">Sent</th>
                <th className="text-right py-2 px-4">Responded</th>
                <th className="text-right py-2 px-4">Response Rate</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byPersona)
                .sort(([, a], [, b]) => b.responseRate - a.responseRate)
                .map(([persona, stats]) => (
                  <tr key={persona} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 font-medium">{persona}</td>
                    <td className="text-right py-2 px-4">{stats.total}</td>
                    <td className="text-right py-2 px-4">{stats.sent}</td>
                    <td className="text-right py-2 px-4">{stats.responded}</td>
                    <td className="text-right py-2 px-4">
                      <span className="font-semibold text-green-600">
                        {stats.responseRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* By ICP Tier */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Performance by ICP Tier</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">ICP Tier</th>
                <th className="text-right py-2 px-4">Total</th>
                <th className="text-right py-2 px-4">Sent</th>
                <th className="text-right py-2 px-4">Responded</th>
                <th className="text-right py-2 px-4">Response Rate</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byIcpTier)
                .sort(([, a], [, b]) => b.responseRate - a.responseRate)
                .map(([tier, stats]) => (
                  <tr key={tier} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 font-medium">{tier}</td>
                    <td className="text-right py-2 px-4">{stats.total}</td>
                    <td className="text-right py-2 px-4">{stats.sent}</td>
                    <td className="text-right py-2 px-4">{stats.responded}</td>
                    <td className="text-right py-2 px-4">
                      <span className="font-semibold text-green-600">
                        {stats.responseRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="mt-8 flex gap-4">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Print / Export PDF
        </button>
        <button
          onClick={() => {
            const csv = generateCSV(analytics);
            downloadCSV(csv, 'analytics.csv');
          }}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Export to CSV
        </button>
      </div>
    </div>
  );
}

function generateCSV(analytics: AnalyticsData): string {
  const rows = [
    ['Metric', 'Value'],
    ['Total Outreach', analytics.overview.totalOutreach.toString()],
    ['Sent', analytics.overview.sent.toString()],
    ['Opened', analytics.overview.opened.toString()],
    ['Responded', analytics.overview.responded.toString()],
    ['Open Rate', analytics.overview.openRate + '%'],
    ['Response Rate', analytics.overview.responseRate + '%'],
    [''],
    ['Persona', 'Total', 'Sent', 'Responded', 'Response Rate'],
    ...Object.entries(analytics.byPersona).map(([persona, stats]) => [
      persona,
      stats.total.toString(),
      stats.sent.toString(),
      stats.responded.toString(),
      stats.responseRate.toFixed(1) + '%',
    ]),
  ];

  return rows.map((row) => row.join(',')).join('\n');
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
