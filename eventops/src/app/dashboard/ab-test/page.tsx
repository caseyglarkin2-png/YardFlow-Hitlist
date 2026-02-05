'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TestVariant {
  variant: string;
  total: number;
  sent: number;
  opened: number;
  responded: number;
  openRate: number;
  responseRate: number;
}

interface ABTest {
  testId: string;
  testName: string;
  status: string;
  totalOutreach: number;
  variants: TestVariant[];
  winner: {
    variant: string;
    responseRate: string;
    sampleSize: number;
  } | null;
  statisticalValidity: boolean;
}

export default function ABTestingPage() {
  const _router = useRouter();
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [_selectedTest, setSelectedTest] = useState<string | null>(null);

  useEffect(() => {
    // In real implementation, fetch list of tests
    // For now, show empty state
    setLoading(false);
  }, []);

  async function createTest(formData: Record<string, unknown>) {
    try {
      const res = await fetch('/api/ab-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Test created: ${data.name}`);
        setShowCreateModal(false);
        // Refresh tests list
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating test:', error);
      alert('Failed to create A/B test');
    }
  }

  async function _fetchTestResults(testId: string) {
    try {
      const res = await fetch(`/api/ab-test?testId=${testId}`);
      const data = await res.json();
      setSelectedTest(testId);
      setTests([data]);
    } catch (error) {
      console.error('Error fetching test results:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading A/B tests...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">A/B Testing</h1>
          <p className="mt-1 text-gray-600">Optimize outreach message performance</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          + New A/B Test
        </button>
      </div>

      {/* Active Tests */}
      {tests.length > 0 ? (
        <div className="space-y-6">
          {tests.map((test) => (
            <div key={test.testId} className="rounded-lg bg-white p-6 shadow">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{test.testName}</h2>
                  <p className="text-gray-600">
                    {test.totalOutreach} contacts • {test.variants.length} variants
                  </p>
                </div>
                <span
                  className={`rounded px-3 py-1 text-sm font-medium ${
                    test.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {test.status}
                </span>
              </div>

              {/* Winner Alert */}
              {test.winner && test.statisticalValidity && (
                <div className="mb-4 border-l-4 border-green-500 bg-green-50 p-4">
                  <p className="font-semibold text-green-800">
                    🏆 Winner: Variant {test.winner.variant} ({test.winner.responseRate} response
                    rate)
                  </p>
                </div>
              )}

              {!test.statisticalValidity && (
                <div className="mb-4 border-l-4 border-yellow-500 bg-yellow-50 p-4">
                  <p className="text-yellow-800">
                    ⚠️ Not enough data for statistical significance (need 20+ sends per variant)
                  </p>
                </div>
              )}

              {/* Variant Performance Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left">Variant</th>
                      <th className="px-4 py-2 text-right">Total</th>
                      <th className="px-4 py-2 text-right">Sent</th>
                      <th className="px-4 py-2 text-right">Opened</th>
                      <th className="px-4 py-2 text-right">Responded</th>
                      <th className="px-4 py-2 text-right">Open Rate</th>
                      <th className="px-4 py-2 text-right">Response Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {test.variants.map((variant) => (
                      <tr
                        key={variant.variant}
                        className={`border-b hover:bg-gray-50 ${
                          test.winner?.variant === variant.variant ? 'bg-green-50' : ''
                        }`}
                      >
                        <td className="px-4 py-2 font-medium">
                          {variant.variant}
                          {test.winner?.variant === variant.variant && (
                            <span className="ml-2 text-green-600">🏆</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">{variant.total}</td>
                        <td className="px-4 py-2 text-right">{variant.sent}</td>
                        <td className="px-4 py-2 text-right">{variant.opened}</td>
                        <td className="px-4 py-2 text-right">{variant.responded}</td>
                        <td className="px-4 py-2 text-right">{variant.openRate.toFixed(1)}%</td>
                        <td className="px-4 py-2 text-right font-semibold">
                          {variant.responseRate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <div className="mb-4 text-6xl">🧪</div>
          <h2 className="mb-2 text-2xl font-semibold">No A/B Tests Yet</h2>
          <p className="mb-6 text-gray-600">
            Create an A/B test to compare different outreach messages and optimize your response
            rates
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            Create Your First Test
          </button>
        </div>
      )}

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-2xl font-bold">Create A/B Test</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createTest({
                  name: formData.get('name'),
                  description: formData.get('description'),
                  sampleSize: parseInt(formData.get('sampleSize') as string),
                  variants: [
                    { name: 'Variant A', templateId: 'variant-a' },
                    { name: 'Variant B', templateId: 'variant-b' },
                  ],
                });
              }}
            >
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium">Test Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full rounded border px-3 py-2"
                  placeholder="e.g., Subject Line Test #1"
                />
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium">Description</label>
                <textarea
                  name="description"
                  className="w-full rounded border px-3 py-2"
                  rows={3}
                  placeholder="What are you testing?"
                />
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium">Sample Size (per variant)</label>
                <input
                  type="number"
                  name="sampleSize"
                  defaultValue={50}
                  className="w-full rounded border px-3 py-2"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded border px-4 py-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Create Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
