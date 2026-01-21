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
  const router = useRouter();
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  useEffect(() => {
    // In real implementation, fetch list of tests
    // For now, show empty state
    setLoading(false);
  }, []);

  async function createTest(formData: any) {
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

  async function fetchTestResults(testId: string) {
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading A/B tests...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">A/B Testing</h1>
          <p className="text-gray-600 mt-1">Optimize outreach message performance</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + New A/B Test
        </button>
      </div>

      {/* Active Tests */}
      {tests.length > 0 ? (
        <div className="space-y-6">
          {tests.map((test) => (
            <div key={test.testId} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{test.testName}</h2>
                  <p className="text-gray-600">
                    {test.totalOutreach} contacts • {test.variants.length} variants
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded text-sm font-medium ${
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
                <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
                  <p className="font-semibold text-green-800">
                    🏆 Winner: Variant {test.winner.variant} ({test.winner.responseRate} response
                    rate)
                  </p>
                </div>
              )}

              {!test.statisticalValidity && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
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
                      <th className="text-left py-2 px-4">Variant</th>
                      <th className="text-right py-2 px-4">Total</th>
                      <th className="text-right py-2 px-4">Sent</th>
                      <th className="text-right py-2 px-4">Opened</th>
                      <th className="text-right py-2 px-4">Responded</th>
                      <th className="text-right py-2 px-4">Open Rate</th>
                      <th className="text-right py-2 px-4">Response Rate</th>
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
                        <td className="py-2 px-4 font-medium">
                          {variant.variant}
                          {test.winner?.variant === variant.variant && (
                            <span className="ml-2 text-green-600">🏆</span>
                          )}
                        </td>
                        <td className="text-right py-2 px-4">{variant.total}</td>
                        <td className="text-right py-2 px-4">{variant.sent}</td>
                        <td className="text-right py-2 px-4">{variant.opened}</td>
                        <td className="text-right py-2 px-4">{variant.responded}</td>
                        <td className="text-right py-2 px-4">{variant.openRate.toFixed(1)}%</td>
                        <td className="text-right py-2 px-4 font-semibold">
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
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <div className="text-6xl mb-4">🧪</div>
          <h2 className="text-2xl font-semibold mb-2">No A/B Tests Yet</h2>
          <p className="text-gray-600 mb-6">
            Create an A/B test to compare different outreach messages and optimize your response
            rates
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Your First Test
          </button>
        </div>
      )}

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full">
            <h2 className="text-2xl font-bold mb-4">Create A/B Test</h2>
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
                <label className="block text-sm font-medium mb-1">Test Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g., Subject Line Test #1"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  name="description"
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                  placeholder="What are you testing?"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Sample Size (per variant)</label>
                <input
                  type="number"
                  name="sampleSize"
                  defaultValue={50}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
