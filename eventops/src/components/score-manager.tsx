'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  accountId: string;
  currentScore: number | null;
};

export function ScoreManager({ accountId, currentScore }: Props) {
  const router = useRouter();
  const [isCalculating, setIsCalculating] = useState(false);
  const [isOverriding, setIsOverriding] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideScore, setOverrideScore] = useState(currentScore?.toString() || '');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [breakdown, setBreakdown] = useState<any>(null);

  async function handleCalculate() {
    setIsCalculating(true);
    try {
      const response = await fetch(`/api/accounts/${accountId}/calculate-score`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to calculate score');
      }

      const data = await response.json();
      setBreakdown(data.breakdown);
      router.refresh();
    } catch (error) {
      alert('Failed to calculate score');
    } finally {
      setIsCalculating(false);
    }
  }

  async function handleOverride(e: React.FormEvent) {
    e.preventDefault();
    setIsOverriding(true);

    try {
      const response = await fetch(`/api/accounts/${accountId}/override-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: Number(overrideScore),
          notes: overrideNotes || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to override score');
      }

      setShowOverrideForm(false);
      setOverrideNotes('');
      router.refresh();
    } catch (error) {
      alert('Failed to override score');
    } finally {
      setIsOverriding(false);
    }
  }

  return (
    <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-base font-semibold leading-6 text-gray-900">
          ICP Score Management
        </h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>
            Calculate score automatically based on contacts and data, or set manually.
          </p>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
          >
            {isCalculating ? 'Calculating...' : 'Auto-Calculate Score'}
          </button>
          <button
            onClick={() => setShowOverrideForm(!showOverrideForm)}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Manual Override
          </button>
        </div>

        {breakdown && (
          <div className="mt-6 bg-blue-50 p-4 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Score Breakdown (Total: {breakdown.total})
            </h4>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-blue-700">Persona Match</dt>
                <dd className="font-semibold text-blue-900">{breakdown.personaMatch}/40</dd>
              </div>
              <div>
                <dt className="text-blue-700">Executive Count</dt>
                <dd className="font-semibold text-blue-900">{breakdown.executiveCount}/20</dd>
              </div>
              <div>
                <dt className="text-blue-700">Total Contacts</dt>
                <dd className="font-semibold text-blue-900">{breakdown.totalContacts}/20</dd>
              </div>
              <div>
                <dt className="text-blue-700">Data Completeness</dt>
                <dd className="font-semibold text-blue-900">{breakdown.dataCompleteness}/20</dd>
              </div>
            </dl>
          </div>
        )}

        {showOverrideForm && (
          <form onSubmit={handleOverride} className="mt-6 space-y-4 border-t pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                New Score (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={overrideScore}
                onChange={(e) => setOverrideScore(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Reason (Optional)
              </label>
              <textarea
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Why are you manually setting this score?"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isOverriding}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
              >
                {isOverriding ? 'Saving...' : 'Save Override'}
              </button>
              <button
                type="button"
                onClick={() => setShowOverrideForm(false)}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
