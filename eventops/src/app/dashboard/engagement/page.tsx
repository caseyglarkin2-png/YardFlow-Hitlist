'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface EngagementScore {
  accountId: string;
  accountName: string;
  engagementScore: number;
  lastEngagedAt: string | null;
  icpScore: number | null;
  totalOutreach: number;
  totalMeetings: number;
  daysSinceEngagement: number | null;
}

export default function EngagementScoringPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<EngagementScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    fetchScores();
  }, []);

  async function fetchScores() {
    try {
      const res = await fetch('/api/engagement/score');
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error('Error fetching scores:', error);
    } finally {
      setLoading(false);
    }
  }

  async function recalculate() {
    setCalculating(true);
    try {
      const res = await fetch('/api/engagement/score', { method: 'POST' });
      const data = await res.json();
      setAccounts(data.topEngaged || []);
    } catch (error) {
      console.error('Error calculating scores:', error);
      alert('Failed to calculate engagement scores');
    } finally {
      setCalculating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading engagement scores...</div>
      </div>
    );
  }

  const highEngagement = accounts.filter((a) => a.engagementScore >= 100);
  const needsFollowup = accounts.filter(
    (a) => a.engagementScore >= 50 && (a.daysSinceEngagement || 0) > 7
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Engagement Scoring</h1>
          <p className="text-gray-600 mt-1">Track account engagement levels</p>
        </div>
        <button
          onClick={recalculate}
          disabled={calculating}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {calculating ? 'Calculating...' : 'Recalculate Scores'}
        </button>
      </div>

      {/* Alerts */}
      {needsFollowup.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6">
          <p className="font-semibold text-orange-800">
            ⚠️ {needsFollowup.length} high-engagement accounts need follow-up (7+ days since last contact)
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Total Accounts</p>
          <p className="text-3xl font-bold">{accounts.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">High Engagement (100+)</p>
          <p className="text-3xl font-bold text-green-600">{highEngagement.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Need Follow-up</p>
          <p className="text-3xl font-bold text-orange-600">{needsFollowup.length}</p>
        </div>
      </div>

      {/* Engagement Leaderboard */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Engagement Leaderboard</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">Rank</th>
                <th className="text-left py-2 px-4">Account</th>
                <th className="text-right py-2 px-4">Engagement Score</th>
                <th className="text-right py-2 px-4">ICP Score</th>
                <th className="text-right py-2 px-4">Outreach</th>
                <th className="text-right py-2 px-4">Meetings</th>
                <th className="text-right py-2 px-4">Last Engaged</th>
                <th className="text-right py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.slice(0, 50).map((account, index) => (
                <tr
                  key={account.accountId}
                  className={`border-b hover:bg-gray-50 ${
                    account.engagementScore >= 100 ? 'bg-green-50' : ''
                  } ${
                    account.engagementScore >= 50 && (account.daysSinceEngagement || 0) > 7
                      ? 'bg-orange-50'
                      : ''
                  }`}
                >
                  <td className="py-2 px-4 font-medium">#{index + 1}</td>
                  <td className="py-2 px-4">
                    <button
                      onClick={() => router.push(`/dashboard/accounts/${account.accountId}`)}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {account.accountName}
                    </button>
                  </td>
                  <td className="text-right py-2 px-4">
                    <span className="font-bold text-green-600">{account.engagementScore}</span>
                  </td>
                  <td className="text-right py-2 px-4">{account.icpScore || 'N/A'}</td>
                  <td className="text-right py-2 px-4">{account.totalOutreach}</td>
                  <td className="text-right py-2 px-4">{account.totalMeetings}</td>
                  <td className="text-right py-2 px-4 text-sm">
                    {account.daysSinceEngagement !== null ? (
                      <span
                        className={
                          account.daysSinceEngagement > 7 ? 'text-orange-600 font-medium' : ''
                        }
                      >
                        {account.daysSinceEngagement}d ago
                      </span>
                    ) : (
                      <span className="text-gray-400">Never</span>
                    )}
                  </td>
                  <td className="text-right py-2 px-4">
                    <button
                      onClick={() => router.push(`/dashboard/accounts/${account.accountId}`)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scoring Legend */}
      <div className="mt-6 bg-gray-50 p-6 rounded-lg">
        <h3 className="font-semibold mb-3">Engagement Scoring System</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="font-medium">Email Opened</p>
            <p className="text-gray-600">+5 points</p>
          </div>
          <div>
            <p className="font-medium">Email Response</p>
            <p className="text-gray-600">+20 points</p>
          </div>
          <div>
            <p className="font-medium">Meeting Scheduled</p>
            <p className="text-gray-600">+30 points</p>
          </div>
          <div>
            <p className="font-medium">Meeting Completed</p>
            <p className="text-gray-600">+50 points</p>
          </div>
        </div>
      </div>
    </div>
  );
}
