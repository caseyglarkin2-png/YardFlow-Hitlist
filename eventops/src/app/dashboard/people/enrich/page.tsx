'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface EnrichmentResult {
  personId: string;
  name: string;
  email: string | null;
  confidence: number;
  success: boolean;
  error?: string;
}

export default function EmailEnrichmentPage() {
  const _router = useRouter();
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [minIcpScore, setMinIcpScore] = useState<number>(0);
  const [onlyMissingEmail, setOnlyMissingEmail] = useState<boolean>(true);
  const [enrichmentMethod, setEnrichmentMethod] = useState<'smart-guess' | 'hunter'>('smart-guess');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<EnrichmentResult[]>([]);
  const [stats, setStats] = useState<{ total: number; enriched: number; failed: number } | null>(
    null
  );

  const personas = [
    { value: 'isExecOps', label: 'Exec/Ops' },
    { value: 'isOps', label: 'Ops' },
    { value: 'isProcurement', label: 'Procurement' },
    { value: 'isSales', label: 'Sales' },
    { value: 'isTech', label: 'Tech' },
    { value: 'isNonOps', label: 'Non-Ops' },
  ];

  const handleEnrich = async () => {
    setIsLoading(true);
    setResults([]);
    setStats(null);

    try {
      // Step 1: Get filtered people
      const params = new URLSearchParams();
      if (onlyMissingEmail) params.append('missingEmail', 'true');
      if (minIcpScore > 0) params.append('minIcpScore', minIcpScore.toString());
      selectedPersonas.forEach((p) => params.append('persona', p));

      const peopleRes = await fetch(`/api/people?${params.toString()}`);
      const peopleData = await peopleRes.json();

      if (!peopleData.people || peopleData.people.length === 0) {
        alert('No contacts match the selected filters');
        setIsLoading(false);
        return;
      }

      // Limit to 50 at a time for Hunter.io, unlimited for smart-guess
      const maxContacts = enrichmentMethod === 'hunter' ? 50 : 200;
      const peopleToEnrich = peopleData.people.slice(0, maxContacts);

      if (peopleToEnrich.length > 20) {
        const methodText =
          enrichmentMethod === 'smart-guess'
            ? '(FREE - Pattern matching, no API costs)'
            : 'and consume Hunter.io API credits';

        const confirm = window.confirm(
          `This will enrich ${peopleToEnrich.length} contacts ${methodText}. This may take several minutes. Continue?`
        );
        if (!confirm) {
          setIsLoading(false);
          return;
        }
      }

      // Step 2: Batch enrich using selected method
      const endpoint =
        enrichmentMethod === 'smart-guess'
          ? '/api/enrichment/smart-guess'
          : '/api/enrichment/email';

      const enrichRes = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personIds: peopleToEnrich.map((p: { id: string }) => p.id),
        }),
      });

      const enrichData = await enrichRes.json();

      if (!enrichRes.ok) {
        alert(`Error: ${enrichData.error}`);
        setIsLoading(false);
        return;
      }

      setResults(enrichData.results || []);
      setStats({
        total: enrichData.total || 0,
        enriched: enrichData.enriched || 0,
        failed: enrichData.failed || 0,
      });
    } catch (error) {
      console.error('Enrichment error:', error);
      alert('Failed to enrich emails. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    const successfulResults = results.filter((r) => r.success);
    if (successfulResults.length === 0) {
      alert('No successful results to export');
      return;
    }

    const csvContent = [
      ['Name', 'Email', 'Confidence'].join(','),
      ...successfulResults.map((r) => [r.name, r.email, r.confidence].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enriched-emails-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Email Enrichment</h1>
        <p className="text-gray-600">
          Find missing email addresses using Hunter.io. Enrich up to 50 contacts at a time.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">Enrichment Method</h2>

        <div className="mb-6">
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center">
              <input
                type="radio"
                name="method"
                value="smart-guess"
                checked={enrichmentMethod === 'smart-guess'}
                onChange={() => setEnrichmentMethod('smart-guess')}
                className="mr-2"
              />
              <span className="font-medium">Smart Guess (FREE)</span>
            </label>
            <label className="flex cursor-pointer items-center">
              <input
                type="radio"
                name="method"
                value="hunter"
                checked={enrichmentMethod === 'hunter'}
                onChange={() => setEnrichmentMethod('hunter')}
                className="mr-2"
              />
              <span className="font-medium">Hunter.io API</span>
            </label>
          </div>

          {enrichmentMethod === 'smart-guess' && (
            <p className="mt-2 rounded bg-green-50 p-3 text-sm text-green-700">
              ✨ Uses pattern matching to guess emails based on company size and known contacts.
              Also generates LinkedIn profile URLs. Completely free, no API costs.
            </p>
          )}

          {enrichmentMethod === 'hunter' && (
            <p className="mt-2 rounded bg-blue-50 p-3 text-sm text-blue-700">
              Uses Hunter.io API for verified emails. Requires HUNTER_API_KEY environment variable.
              Free tier: 25 requests/month.
            </p>
          )}
        </div>

        <h2 className="mb-4 text-lg font-semibold">Filters</h2>

        <div className="space-y-4">
          {/* Only Missing Email */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="missingEmail"
              checked={onlyMissingEmail}
              onChange={(e) => setOnlyMissingEmail(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="missingEmail" className="ml-2 text-sm text-gray-700">
              Only contacts missing email addresses
            </label>
          </div>

          {/* Min ICP Score */}
          <div>
            <label htmlFor="icpScore" className="mb-1 block text-sm font-medium text-gray-700">
              Minimum ICP Score
            </label>
            <input
              type="number"
              id="icpScore"
              value={minIcpScore}
              onChange={(e) => setMinIcpScore(parseInt(e.target.value) || 0)}
              min="0"
              max="100"
              className="w-32 rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          {/* Personas */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Filter by Persona
            </label>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {personas.map((persona) => (
                <div key={persona.value} className="flex items-center">
                  <input
                    type="checkbox"
                    id={persona.value}
                    checked={selectedPersonas.includes(persona.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPersonas([...selectedPersonas, persona.value]);
                      } else {
                        setSelectedPersonas(selectedPersonas.filter((p) => p !== persona.value));
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor={persona.value} className="ml-2 text-sm text-gray-700">
                    {persona.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleEnrich}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isLoading ? (
              <>
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Enriching...
              </>
            ) : (
              'Start Enrichment'
            )}
          </button>

          {results.length > 0 && (
            <button
              onClick={exportToCSV}
              className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Export to CSV
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-2 font-semibold text-blue-900">Enrichment Results</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-blue-600">Total:</span> {stats.total}
            </div>
            <div>
              <span className="text-green-600">Enriched:</span> {stats.enriched}
            </div>
            <div>
              <span className="text-red-600">Failed:</span> {stats.failed}
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {results.map((result) => (
                <tr key={result.personId}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {result.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {result.email || '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {result.success ? `${result.confidence}%` : '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {result.success ? (
                      <span className="rounded bg-green-100 px-2 py-1 text-green-800">Success</span>
                    ) : (
                      <span className="rounded bg-red-100 px-2 py-1 text-red-800">
                        {result.error || 'Failed'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Warning */}
      <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> Email enrichment consumes Hunter.io API credits. The free tier
          includes 25 requests/month. Consider upgrading if you need to enrich large volumes. Rate
          limited to 1 request/second.
        </p>
      </div>
    </div>
  );
}
