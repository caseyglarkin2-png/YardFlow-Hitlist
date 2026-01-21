'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ResearchPanelProps {
  accountId: string;
  companyDossierId: string | null;
}

export function ResearchPanel({ accountId, companyDossierId }: ResearchPanelProps) {
  const router = useRouter();
  const [isResearching, setIsResearching] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);

  const runResearch = async (type: 'facilities' | 'competitive' | 'locations') => {
    if (!companyDossierId) {
      alert('No company dossier found. Generate AI insights first.');
      return;
    }

    setIsResearching(type);
    setResults(null);

    try {
      const res = await fetch(`/api/research/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: companyDossierId }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setResults(data);
        router.refresh();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Research error:', error);
      alert('Failed to complete research');
    } finally {
      setIsResearching(null);
    }
  };

  return (
    <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Advanced Research</h2>
        <p className="text-sm text-gray-600 mb-4">
          Use AI to gather deeper intelligence on this company
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Facility Research */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">🏭 Facility Count</h3>
            <p className="text-sm text-gray-600 mb-3">
              Research actual facility count using public data sources
            </p>
            <button
              onClick={() => runResearch('facilities')}
              disabled={isResearching === 'facilities'}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 text-sm"
            >
              {isResearching === 'facilities' ? 'Researching...' : 'Research Facilities'}
            </button>
          </div>

          {/* Competitive Analysis */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">📊 Competitive Intel</h3>
            <p className="text-sm text-gray-600 mb-3">
              Analyze market position, competitors, and tech sophistication
            </p>
            <button
              onClick={() => runResearch('competitive')}
              disabled={isResearching === 'competitive'}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300 text-sm"
            >
              {isResearching === 'competitive' ? 'Analyzing...' : 'Analyze Competitive'}
            </button>
          </div>

          {/* Location Mapping */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">📍 Location Mapping</h3>
            <p className="text-sm text-gray-600 mb-3">
              Map facility locations and geographic spread
            </p>
            <button
              onClick={() => runResearch('locations')}
              disabled={isResearching === 'locations'}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 text-sm"
            >
              {isResearching === 'locations' ? 'Mapping...' : 'Map Locations'}
            </button>
          </div>
        </div>

        {/* Results Display */}
        {results && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium mb-2">✅ Research Complete</h3>
            <p className="text-sm text-gray-700 mb-2">{results.message}</p>
            
            {results.research && (
              <div className="mt-3 space-y-2 text-sm">
                {results.research.estimatedFacilities && (
                  <div>
                    <span className="font-medium">Facilities:</span> {results.research.estimatedFacilities}
                    <span className="ml-2 text-xs bg-white px-2 py-1 rounded">
                      {results.research.confidenceLevel} confidence
                    </span>
                  </div>
                )}
                {results.research.footprintType && (
                  <div>
                    <span className="font-medium">Footprint:</span> {results.research.footprintType}
                  </div>
                )}
              </div>
            )}

            {results.analysis && (
              <div className="mt-3 space-y-2 text-sm">
                {results.analysis.scaleTier && (
                  <div>
                    <span className="font-medium">Scale Tier:</span> {results.analysis.scaleTier}
                  </div>
                )}
                {results.analysis.marketPosition && (
                  <div>
                    <span className="font-medium">Market Position:</span> {results.analysis.marketPosition}
                  </div>
                )}
                {results.analysis.techSophistication && (
                  <div>
                    <span className="font-medium">Tech Level:</span> {results.analysis.techSophistication}
                  </div>
                )}
              </div>
            )}

            {results.locationData && (
              <div className="mt-3 space-y-2 text-sm">
                {results.locationData.headquarters && (
                  <div>
                    <span className="font-medium">HQ:</span> {results.locationData.headquarters.city}, {results.locationData.headquarters.state}
                  </div>
                )}
                {results.locationData.geographicSpread && (
                  <div>
                    <span className="font-medium">Geographic Spread:</span> {results.locationData.geographicSpread.concentration}
                  </div>
                )}
                {results.locationData.facilities && (
                  <div>
                    <span className="font-medium">Facilities Found:</span> {results.locationData.facilities.length}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setResults(null)}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
