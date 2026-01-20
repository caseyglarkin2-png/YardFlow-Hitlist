"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ManifestRequestsPage() {
  const router = useRouter();
  const [personaFilters, setPersonaFilters] = useState({
    isExecOps: false,
    isOps: false,
    isProc: true,
    isSales: false,
    isTech: false,
    isNonOps: false,
  });
  const [minIcpScore, setMinIcpScore] = useState(90);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    setShowResults(false);
    
    try {
      // First, get filtered people
      const personas = Object.entries(personaFilters)
        .filter(([_, value]) => value)
        .map(([key]) => key);

      const res = await fetch(`/api/people?personas=${personas.join(',')}&minIcpScore=${minIcpScore}`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch people');
      }
      
      const data = await res.json();
      const personIds = data.people.map((p: any) => p.id);

      if (personIds.length === 0) {
        alert('No people match your filters');
        setGenerating(false);
        return;
      }

      if (personIds.length > 50) {
        if (!confirm(`This will generate ${personIds.length} meeting requests. Continue?`)) {
          setGenerating(false);
          return;
        }
      }

      // Generate Manifest requests
      const generateRes = await fetch('/api/manifest/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personIds,
          useAI: true,
        }),
      });

      if (!generateRes.ok) {
        const error = await generateRes.json();
        throw new Error(error.details || error.error || 'Failed to generate requests');
      }

      const generateData = await generateRes.json();
      setResults(generateData.results);
      setShowResults(true);
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  }

  function exportToCsv() {
    const successfulResults = results.filter(r => r.success);
    
    const csv = [
      ['Name', 'Company', 'Email', 'Message', 'Character Count'].join(','),
      ...successfulResults.map(r =>
        [
          `"${r.personName}"`,
          `"${r.companyName}"`,
          `"${r.email || ''}"`,
          `"${r.message.replace(/"/g, '""')}"`,
          r.characterCount
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manifest-requests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Manifest Meeting Requests</h1>
          <p className="text-gray-600">
            Generate concise 250-character meeting requests for the Manifest app
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-3">Filter Contacts</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {Object.entries(personaFilters).map(([key, value]) => (
                <label key={key} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setPersonaFilters({ ...personaFilters, [key]: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">
                    {key === 'isExecOps' && 'Executive Ops'}
                    {key === 'isOps' && 'Operations'}
                    {key === 'isProc' && 'Procurement'}
                    {key === 'isSales' && 'Sales'}
                    {key === 'isTech' && 'Tech'}
                    {key === 'isNonOps' && 'Non-Ops'}
                  </span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum ICP Score
              </label>
              <select
                value={minIcpScore}
                onChange={(e) => setMinIcpScore(Number(e.target.value))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value={0}>All Accounts</option>
                <option value={75}>75+ (Mid Tier)</option>
                <option value={85}>85+ (High Tier)</option>
                <option value={90}>90+ (Top Tier)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              {generating ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                'Generate Meeting Requests'
              )}
            </button>

            {showResults && results.length > 0 && (
              <button
                onClick={exportToCsv}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Export to CSV
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {showResults && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              Generated {results.filter(r => r.success).length} / {results.length} Requests
            </h2>

            <div className="space-y-4">
              {results.filter(r => r.success).map((result, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{result.personName}</div>
                      <div className="text-sm text-gray-600">{result.companyName}</div>
                      {result.email && (
                        <div className="text-xs text-gray-500">{result.email}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        result.characterCount <= 250 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.characterCount} chars
                      </span>
                      <button
                        onClick={() => copyToClipboard(result.message)}
                        className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded text-sm">
                    {result.message}
                  </div>
                </div>
              ))}

              {results.filter(r => !r.success).length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-medium text-red-600 mb-2">
                    {results.filter(r => !r.success).length} Failed
                  </h3>
                  {results.filter(r => !r.success).map((result, idx) => (
                    <div key={idx} className="text-sm text-red-600">
                      {result.personName}: {result.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
