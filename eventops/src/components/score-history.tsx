'use client';

import { useEffect, useState } from 'react';

type ScoreHistoryEntry = {
  id: string;
  oldScore: number | null;
  newScore: number | null;
  reason: string;
  changedBy: string | null;
  notes: string | null;
  createdAt: string;
};

type Props = {
  accountId: string;
};

export function ScoreHistory({ accountId }: Props) {
  const [history, setHistory] = useState<ScoreHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch(`/api/accounts/${accountId}/score-history`);
        if (!response.ok) throw new Error('Failed to load history');
        
        const data = await response.json();
        setHistory(data.history);
      } catch (error) {
        console.error('Error loading score history:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [accountId]);

  if (isLoading) {
    return (
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <p className="text-sm text-gray-500">Loading history...</p>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900 mb-2">
            Score History
          </h3>
          <p className="text-sm text-gray-500">No score changes yet.</p>
        </div>
      </div>
    );
  }

  function formatReason(reason: string): string {
    const map: Record<string, string> = {
      manual_override: 'Manual Override',
      auto_calculated: 'Auto-Calculated',
      csv_import: 'CSV Import',
    };
    return map[reason] || reason;
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  return (
    <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">
          Score History
        </h3>
        <div className="flow-root">
          <ul role="list" className="-mb-8">
            {history.map((entry, idx) => (
              <li key={entry.id}>
                <div className="relative pb-8">
                  {idx !== history.length - 1 && (
                    <span
                      className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                        <svg
                          className="h-5 w-5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                      <div>
                        <p className="text-sm text-gray-500">
                          Score changed from{' '}
                          <span className="font-medium text-gray-900">
                            {entry.oldScore ?? 'unset'}
                          </span>{' '}
                          to{' '}
                          <span className="font-medium text-gray-900">
                            {entry.newScore ?? 'unset'}
                          </span>
                          {' · '}
                          <span className="font-medium">{formatReason(entry.reason)}</span>
                        </p>
                        {entry.changedBy && (
                          <p className="mt-1 text-xs text-gray-400">
                            by {entry.changedBy}
                          </p>
                        )}
                        {entry.notes && (
                          <p className="mt-1 text-sm text-gray-600">{entry.notes}</p>
                        )}
                      </div>
                      <div className="whitespace-nowrap text-right text-sm text-gray-500">
                        <time dateTime={entry.createdAt}>
                          {formatDate(entry.createdAt)}
                        </time>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
