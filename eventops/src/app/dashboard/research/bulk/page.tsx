'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Account {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  icpScore: number | null;
  hasDossier: boolean;
  daysSinceUpdate: number | null;
  needsResearch: boolean;
}

interface BulkStatus {
  queueLength: number;
  processing: boolean;
  currentItem: { accountName: string } | null;
  totalProcessed: number;
  completedCount: number;
  errorCount: number;
  skippedCount: number;
  results: Array<{
    accountId: string;
    accountName: string;
    status: string;
    error?: string;
  }>;
}

export default function BulkResearchPage() {
  const _router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<BulkStatus | null>(null);
  const [filters, setFilters] = useState({
    minIcpScore: 75,
    daysOld: 7,
    missingOnly: false,
  });

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        minIcpScore: filters.minIcpScore.toString(),
        daysOld: filters.daysOld.toString(),
        missingOnly: filters.missingOnly.toString(),
      });

      const res = await fetch(`/api/research/candidates?${params}`);
      const data = await res.json();

      if (res.ok) {
        setAccounts(data.accounts);
      } else {
        alert(data.error || 'Failed to load accounts');
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      alert('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/research/bulk');
      const data = await res.json();
      setStatus(data);

      if (data.queueLength === 0 && !data.processing) {
        setProcessing(false);
        loadAccounts(); // Refresh to show updated dossier status
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  }, [loadAccounts]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (processing) {
      interval = setInterval(checkStatus, 2000);
    }
    return () => clearInterval(interval);
  }, [processing, checkStatus]);

  const startBulkResearch = async (forceRefresh = false) => {
    if (selected.size === 0) {
      alert('Please select at least one account');
      return;
    }

    if (
      !confirm(
        `Generate dossiers for ${selected.size} accounts?${forceRefresh ? ' (Force refresh)' : ''}`
      )
    ) {
      return;
    }

    setProcessing(true);
    const accountIds = Array.from(selected);

    try {
      const res = await fetch('/api/research/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountIds, forceRefresh }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to start bulk research');
        setProcessing(false);
      }
    } catch (error) {
      console.error('Error starting bulk research:', error);
      alert('Failed to start bulk research');
      setProcessing(false);
    }
  };

  const selectTop100 = () => {
    const top100 = accounts
      .filter((a) => a.needsResearch)
      .slice(0, 100)
      .map((a) => a.id);
    setSelected(new Set(top100));
  };

  const selectMissing = () => {
    const missing = accounts.filter((a) => !a.hasDossier).map((a) => a.id);
    setSelected(new Set(missing));
  };

  const toggleAll = () => {
    if (selected.size === accounts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(accounts.map((a) => a.id)));
    }
  };

  const clearResults = async () => {
    await fetch('/api/research/bulk', { method: 'DELETE' });
    setStatus(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bulk Research Generation</h1>
          <p className="mt-1 text-sm text-gray-600">
            Generate AI dossiers for multiple accounts at once
          </p>
        </div>
        <Link
          href="/dashboard/accounts"
          className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          ← Back to Accounts
        </Link>
      </div>

      {/* Filters */}
      <div className="space-y-4 rounded bg-white p-4 shadow">
        <h2 className="font-medium">Filters</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Min ICP Score</label>
            <input
              type="number"
              value={filters.minIcpScore}
              onChange={(e) =>
                setFilters({ ...filters, minIcpScore: parseInt(e.target.value) || 0 })
              }
              className="w-full rounded border border-gray-300 px-3 py-2"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Days Old</label>
            <input
              type="number"
              value={filters.daysOld}
              onChange={(e) => setFilters({ ...filters, daysOld: parseInt(e.target.value) || 7 })}
              className="w-full rounded border border-gray-300 px-3 py-2"
              min="1"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.missingOnly}
                onChange={(e) => setFilters({ ...filters, missingOnly: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Missing dossiers only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={selectTop100}
          disabled={processing}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-300"
        >
          Select Top 100
        </button>
        <button
          onClick={selectMissing}
          disabled={processing}
          className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:bg-gray-300"
        >
          Select Missing
        </button>
        <button
          onClick={toggleAll}
          disabled={processing}
          className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 disabled:bg-gray-300"
        >
          {selected.size === accounts.length ? 'Deselect All' : 'Select All'}
        </button>
        <div className="flex-1"></div>
        <button
          onClick={() => startBulkResearch(false)}
          disabled={selected.size === 0 || processing}
          className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-gray-300"
        >
          {processing ? 'Processing...' : `Generate (${selected.size})`}
        </button>
        <button
          onClick={() => startBulkResearch(true)}
          disabled={selected.size === 0 || processing}
          className="rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:bg-gray-300"
        >
          Force Refresh ({selected.size})
        </button>
      </div>

      {/* Progress */}
      {processing && status && (
        <div className="rounded bg-blue-50 p-6 shadow">
          <div className="mb-4 flex items-start justify-between">
            <h2 className="text-lg font-bold">Research in Progress</h2>
            <button onClick={clearResults} className="text-sm text-gray-600 hover:text-gray-800">
              Clear Results
            </button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded bg-white p-3">
              <div className="text-2xl font-bold text-blue-600">{status.queueLength}</div>
              <div className="text-sm text-gray-600">In Queue</div>
            </div>
            <div className="rounded bg-white p-3">
              <div className="text-2xl font-bold text-green-600">{status.completedCount}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="rounded bg-white p-3">
              <div className="text-2xl font-bold text-red-600">{status.errorCount}</div>
              <div className="text-sm text-gray-600">Errors</div>
            </div>
            <div className="rounded bg-white p-3">
              <div className="text-2xl font-bold text-yellow-600">{status.skippedCount}</div>
              <div className="text-sm text-gray-600">Skipped</div>
            </div>
          </div>

          {status.currentItem && (
            <div className="mb-4 rounded bg-white p-3">
              <div className="text-sm text-gray-600">Currently processing:</div>
              <div className="font-medium">{status.currentItem.accountName}</div>
            </div>
          )}

          {status.results.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded bg-white p-4">
              <div className="mb-2 text-sm font-medium">Recent Results:</div>
              <div className="space-y-1">
                {status.results
                  .slice(-20)
                  .reverse()
                  .map((r, idx) => (
                    <div
                      key={idx}
                      className={`text-sm ${
                        r.status === 'completed'
                          ? 'text-green-600'
                          : r.status === 'error'
                            ? 'text-red-600'
                            : r.status === 'skipped'
                              ? 'text-yellow-600'
                              : 'text-gray-600'
                      }`}
                    >
                      {r.status === 'completed' && '✓ '}
                      {r.status === 'error' && '✗ '}
                      {r.status === 'skipped' && '⊘ '}
                      {r.accountName} - {r.status}
                      {r.error && ` (${r.error})`}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Accounts Table */}
      <div className="overflow-x-auto rounded bg-white shadow">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No accounts found matching filters</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === accounts.length && accounts.length > 0}
                    onChange={toggleAll}
                    disabled={processing}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Industry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  ICP Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Dossier Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selected.has(account.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selected);
                        if (e.target.checked) {
                          newSelected.add(account.id);
                        } else {
                          newSelected.delete(account.id);
                        }
                        setSelected(newSelected);
                      }}
                      disabled={processing}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{account.name}</div>
                    {account.website && (
                      <div className="text-xs text-gray-500">{account.website}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{account.industry || '-'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        (account.icpScore || 0) >= 80
                          ? 'bg-green-100 text-green-800'
                          : (account.icpScore || 0) >= 60
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {account.icpScore || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {account.hasDossier ? (
                      <div>
                        <span className="text-sm text-green-600">✓ Has dossier</span>
                        {account.daysSinceUpdate !== null && (
                          <div className="text-xs text-gray-500">
                            {account.daysSinceUpdate} days old
                            {account.needsResearch && ' (refresh recommended)'}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No dossier</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="text-sm text-gray-600">
        Showing {accounts.length} accounts • {selected.size} selected
      </div>
    </div>
  );
}
