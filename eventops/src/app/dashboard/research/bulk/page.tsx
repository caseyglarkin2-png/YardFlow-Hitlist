'use client';

import { useState, useEffect } from 'react';
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
  const router = useRouter();
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

  useEffect(() => {
    loadAccounts();
  }, [filters]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (processing) {
      interval = setInterval(checkStatus, 2000);
    }
    return () => clearInterval(interval);
  }, [processing]);

  const loadAccounts = async () => {
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
  };

  const checkStatus = async () => {
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
  };

  const startBulkResearch = async (forceRefresh = false) => {
    if (selected.size === 0) {
      alert('Please select at least one account');
      return;
    }

    if (!confirm(`Generate dossiers for ${selected.size} accounts?${forceRefresh ? ' (Force refresh)' : ''}`)) {
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
      .filter(a => a.needsResearch)
      .slice(0, 100)
      .map(a => a.id);
    setSelected(new Set(top100));
  };

  const selectMissing = () => {
    const missing = accounts
      .filter(a => !a.hasDossier)
      .map(a => a.id);
    setSelected(new Set(missing));
  };

  const toggleAll = () => {
    if (selected.size === accounts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(accounts.map(a => a.id)));
    }
  };

  const clearResults = async () => {
    await fetch('/api/research/bulk', { method: 'DELETE' });
    setStatus(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Bulk Research Generation</h1>
          <p className="text-sm text-gray-600 mt-1">
            Generate AI dossiers for multiple accounts at once
          </p>
        </div>
        <Link
          href="/dashboard/accounts"
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
        >
          ← Back to Accounts
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded shadow space-y-4">
        <h2 className="font-medium">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min ICP Score
            </label>
            <input
              type="number"
              value={filters.minIcpScore}
              onChange={(e) => setFilters({ ...filters, minIcpScore: parseInt(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Days Old
            </label>
            <input
              type="number"
              value={filters.daysOld}
              onChange={(e) => setFilters({ ...filters, daysOld: parseInt(e.target.value) || 7 })}
              className="w-full border border-gray-300 rounded px-3 py-2"
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
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
        >
          Select Top 100
        </button>
        <button
          onClick={selectMissing}
          disabled={processing}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300"
        >
          Select Missing
        </button>
        <button
          onClick={toggleAll}
          disabled={processing}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300"
        >
          {selected.size === accounts.length ? 'Deselect All' : 'Select All'}
        </button>
        <div className="flex-1"></div>
        <button
          onClick={() => startBulkResearch(false)}
          disabled={selected.size === 0 || processing}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
        >
          {processing ? 'Processing...' : `Generate (${selected.size})`}
        </button>
        <button
          onClick={() => startBulkResearch(true)}
          disabled={selected.size === 0 || processing}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-300"
        >
          Force Refresh ({selected.size})
        </button>
      </div>

      {/* Progress */}
      {processing && status && (
        <div className="bg-blue-50 p-6 rounded shadow">
          <div className="flex justify-between items-start mb-4">
            <h2 className="font-bold text-lg">Research in Progress</h2>
            <button
              onClick={clearResults}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Results
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white p-3 rounded">
              <div className="text-2xl font-bold text-blue-600">{status.queueLength}</div>
              <div className="text-sm text-gray-600">In Queue</div>
            </div>
            <div className="bg-white p-3 rounded">
              <div className="text-2xl font-bold text-green-600">{status.completedCount}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="bg-white p-3 rounded">
              <div className="text-2xl font-bold text-red-600">{status.errorCount}</div>
              <div className="text-sm text-gray-600">Errors</div>
            </div>
            <div className="bg-white p-3 rounded">
              <div className="text-2xl font-bold text-yellow-600">{status.skippedCount}</div>
              <div className="text-sm text-gray-600">Skipped</div>
            </div>
          </div>

          {status.currentItem && (
            <div className="bg-white p-3 rounded mb-4">
              <div className="text-sm text-gray-600">Currently processing:</div>
              <div className="font-medium">{status.currentItem.accountName}</div>
            </div>
          )}

          {status.results.length > 0 && (
            <div className="bg-white rounded p-4 max-h-64 overflow-y-auto">
              <div className="text-sm font-medium mb-2">Recent Results:</div>
              <div className="space-y-1">
                {status.results.slice(-20).reverse().map((r, idx) => (
                  <div
                    key={idx}
                    className={`text-sm ${
                      r.status === 'completed' ? 'text-green-600' :
                      r.status === 'error' ? 'text-red-600' :
                      r.status === 'skipped' ? 'text-yellow-600' :
                      'text-gray-600'
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
      <div className="bg-white rounded shadow overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No accounts found matching filters
          </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Industry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ICP Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dossier Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.map(account => (
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
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {account.industry || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      (account.icpScore || 0) >= 80 ? 'bg-green-100 text-green-800' :
                      (account.icpScore || 0) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {account.icpScore || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {account.hasDossier ? (
                      <div>
                        <span className="text-green-600 text-sm">✓ Has dossier</span>
                        {account.daysSinceUpdate !== null && (
                          <div className="text-xs text-gray-500">
                            {account.daysSinceUpdate} days old
                            {account.needsResearch && ' (refresh recommended)'}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">No dossier</span>
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
