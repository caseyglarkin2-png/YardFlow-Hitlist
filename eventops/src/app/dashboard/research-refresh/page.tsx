'use client';

import { useEffect, useState } from 'react';

interface AccountNeedingRefresh {
  id: string;
  name: string;
  icpScore: number | null;
  dossierUpdatedAt: string | null;
  daysSinceUpdate: number | null;
}

export default function ResearchRefreshPage() {
  const [accounts, setAccounts] = useState<AccountNeedingRefresh[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  useEffect(() => {
    fetchAccountsNeedingRefresh();
  }, []);

  async function fetchAccountsNeedingRefresh() {
    try {
      const res = await fetch('/api/research/refresh?daysOld=7&minIcpScore=75');
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function refreshSelected() {
    if (selectedAccounts.length === 0) {
      alert('Select at least one account');
      return;
    }

    setRefreshing(true);
    try {
      const res = await fetch('/api/research/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountIds: selectedAccounts,
          forceRefresh: false,
        }),
      });

      const data = await res.json();
      alert(
        `Refreshed ${data.updated} accounts. ${data.changed} had significant changes detected.`
      );
      setSelectedAccounts([]);
      fetchAccountsNeedingRefresh();
    } catch (error) {
      console.error('Error refreshing:', error);
      alert('Failed to refresh research');
    } finally {
      setRefreshing(false);
    }
  }

  async function refreshTop100() {
    setRefreshing(true);
    try {
      const top100 = accounts.slice(0, 100).map((a) => a.id);
      const res = await fetch('/api/research/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountIds: top100,
          forceRefresh: false,
        }),
      });

      const data = await res.json();
      alert(
        `Refreshed ${data.updated} accounts. ${data.changed} had significant changes detected.`
      );
      fetchAccountsNeedingRefresh();
    } catch (error) {
      console.error('Error refreshing:', error);
      alert('Failed to refresh research');
    } finally {
      setRefreshing(false);
    }
  }

  function toggleAccount(accountId: string) {
    setSelectedAccounts((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading accounts...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Automated Research Refresh</h1>
          <p className="text-gray-600 mt-1">Keep account research up to date</p>
        </div>
        <div className="space-x-2">
          <button
            onClick={refreshSelected}
            disabled={refreshing || selectedAccounts.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {refreshing ? 'Refreshing...' : `Refresh Selected (${selectedAccounts.length})`}
          </button>
          <button
            onClick={refreshTop100}
            disabled={refreshing}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            Refresh Top 100
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Accounts Needing Refresh</p>
          <p className="text-3xl font-bold">{accounts.length}</p>
          <p className="text-sm text-gray-500 mt-1">7+ days old, ICP 75+</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Never Researched</p>
          <p className="text-3xl font-bold">
            {accounts.filter((a) => !a.dossierUpdatedAt).length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Selected for Refresh</p>
          <p className="text-3xl font-bold text-blue-600">{selectedAccounts.length}</p>
        </div>
      </div>

      {/* Accounts List */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Accounts Needing Research Refresh</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">
                  <input
                    type="checkbox"
                    checked={
                      selectedAccounts.length === accounts.length && accounts.length > 0
                    }
                    onChange={(e) =>
                      setSelectedAccounts(e.target.checked ? accounts.map((a) => a.id) : [])
                    }
                  />
                </th>
                <th className="text-left py-2 px-4">Account Name</th>
                <th className="text-right py-2 px-4">ICP Score</th>
                <th className="text-right py-2 px-4">Last Updated</th>
                <th className="text-right py-2 px-4">Days Old</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-4">
                    <input
                      type="checkbox"
                      checked={selectedAccounts.includes(account.id)}
                      onChange={() => toggleAccount(account.id)}
                    />
                  </td>
                  <td className="py-2 px-4 font-medium">{account.name}</td>
                  <td className="text-right py-2 px-4">{account.icpScore || 'N/A'}</td>
                  <td className="text-right py-2 px-4 text-sm">
                    {account.dossierUpdatedAt
                      ? new Date(account.dossierUpdatedAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="text-right py-2 px-4">
                    {account.daysSinceUpdate !== null ? (
                      <span
                        className={`font-medium ${
                          account.daysSinceUpdate > 14
                            ? 'text-red-600'
                            : account.daysSinceUpdate > 7
                              ? 'text-orange-600'
                              : 'text-gray-600'
                        }`}
                      >
                        {account.daysSinceUpdate}d
                      </span>
                    ) : (
                      <span className="text-red-600 font-medium">Never</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 p-6 rounded-lg">
        <h3 className="font-semibold mb-2">About Research Refresh</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Automatically updates company research using AI</li>
          <li>• Prioritizes high ICP score accounts (75+)</li>
          <li>• Detects significant changes in company status, news, or strategy</li>
          <li>• Recommended: Refresh every 7-14 days for active targets</li>
          <li>• Manual refresh available for selected accounts</li>
        </ul>
      </div>
    </div>
  );
}
