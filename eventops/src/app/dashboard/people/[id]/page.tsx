'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PersonDetailPage() {
  const params = useParams();
  const _router = useRouter();
  const personId = params.id as string;

  const [person, setPerson] = useState<Record<string, unknown> | null>(null);
  const [insights, setInsights] = useState<Record<string, unknown> | null>(null);
  const [roiData, setRoiData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [calculatingRoi, setCalculatingRoi] = useState(false);

  const fetchPersonData = useCallback(async () => {
    try {
      // Fetch person with account details
      const res = await fetch(`/api/people/${personId}`);
      if (!res.ok) throw new Error('Failed to fetch person');
      const data = await res.json();
      setPerson(data.person);

      // Try to fetch insights
      try {
        const insightsRes = await fetch(`/api/contact/${personId}/insights`);
        if (insightsRes.ok) {
          const insightsData = await insightsRes.json();
          setInsights(insightsData.insights);
        }
      } catch (_e) {
        // No insights yet
      }

      // Try to fetch ROI data
      if (data.person?.accountId) {
        try {
          const roiRes = await fetch(`/api/roi/calculate?accountId=${data.person.accountId}`);
          if (roiRes.ok) {
            const roiResult = await roiRes.json();
            setRoiData(roiResult.roiCalculation);
          }
        } catch (_e) {
          // No ROI yet
        }
      }
    } catch (error) {
      console.error('Error fetching person data:', error);
      alert('Failed to load person details');
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    fetchPersonData();
  }, [fetchPersonData]);

  async function handleGenerateInsights() {
    if (!personId) return;

    setGeneratingInsights(true);
    try {
      const res = await fetch(`/api/contact/${personId}/insights`, {
        method: 'POST',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || error.error);
      }

      const data = await res.json();
      setInsights(data.insights);
      alert('Contact insights generated successfully!');
    } catch (error) {
      console.error('Error generating insights:', error);
      alert(
        `Failed to generate insights: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setGeneratingInsights(false);
    }
  }

  async function handleCalculateRoi() {
    if (!person?.accountId) return;

    setCalculatingRoi(true);
    try {
      const res = await fetch(`/api/roi/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: person.accountId,
          personId: personId,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || error.error);
      }

      const data = await res.json();
      setRoiData(data.roiCalculation);
      alert('ROI calculated successfully!');
    } catch (error) {
      console.error('Error calculating ROI:', error);
      alert(`Failed to calculate ROI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCalculatingRoi(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="p-8">
        <div className="text-red-600">Person not found</div>
        <Link href="/dashboard/people" className="mt-4 inline-block text-blue-600 hover:underline">
          ← Back to People
        </Link>
      </div>
    );
  }

  const getPersonaBadges = () => {
    const badges = [];
    if (person.isExecOps) badges.push('ExecOps');
    if (person.isOps) badges.push('Operations');
    if (person.isProc) badges.push('Procurement');
    if (person.isSales) badges.push('Sales');
    if (person.isTech) badges.push('Tech');
    if (person.isNonOps) badges.push('Non-Ops');
    return badges;
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard/people" className="text-blue-600 hover:underline">
          ← Back to People
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Person Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic Info */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h1 className="mb-2 text-2xl font-bold">{person.name}</h1>
            {person.title && <p className="mb-4 text-gray-600">{person.title}</p>}

            <div className="mb-4 flex flex-wrap gap-2">
              {getPersonaBadges().map((badge) => (
                <span
                  key={badge}
                  className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                >
                  {badge}
                </span>
              ))}
            </div>

            <div className="space-y-2 text-sm">
              {person.email && (
                <div>
                  <span className="font-medium">Email:</span>{' '}
                  <a href={`mailto:${person.email}`} className="text-blue-600 hover:underline">
                    {person.email}
                  </a>
                </div>
              )}
              {person.phone && (
                <div>
                  <span className="font-medium">Phone:</span> {person.phone}
                </div>
              )}
              {person.linkedin && (
                <div>
                  <span className="font-medium">LinkedIn:</span>{' '}
                  <a
                    href={person.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Profile
                  </a>
                </div>
              )}
              {person.account && (
                <div>
                  <span className="font-medium">Company:</span>{' '}
                  <Link
                    href={`/dashboard/accounts/${person.accountId}`}
                    className="text-blue-600 hover:underline"
                  >
                    {person.target_accounts.name}
                  </Link>
                  {person.target_accounts.icpScore && (
                    <span className="ml-2 rounded bg-green-100 px-2 py-1 text-xs text-green-800">
                      ICP: {person.target_accounts.icpScore}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contact Insights */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Contact Insights</h2>
              <button
                onClick={handleGenerateInsights}
                disabled={generatingInsights}
                className="rounded bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:bg-gray-400"
              >
                {generatingInsights
                  ? 'Generating...'
                  : insights
                    ? 'Refresh Insights'
                    : 'Generate Insights'}
              </button>
            </div>

            {insights ? (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-600">Role Context</h3>
                  <p className="text-sm">{insights.roleContext}</p>
                </div>

                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-600">Likely Pain Points</h3>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {JSON.parse(insights.likelyPainPoints || '[]').map(
                      (point: string, idx: number) => (
                        <li key={idx}>{point}</li>
                      )
                    )}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-600">Suggested Approach</h3>
                  <p className="text-sm">{insights.suggestedApproach}</p>
                </div>

                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-600">ROI Opportunity</h3>
                  <p className="text-sm font-medium text-green-700">{insights.roiOpportunity}</p>
                </div>

                <div className="text-xs text-gray-500">
                  Confidence: {insights.confidence} | Generated:{' '}
                  {new Date(insights.generatedAt).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No insights generated yet. Click &quot;Generate Insights&quot; to create AI-powered
                contact analysis.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Actions & ROI */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href={`/dashboard/outreach/generate?personId=${personId}`}
                className="block w-full rounded bg-blue-600 px-4 py-2 text-center text-sm text-white hover:bg-blue-700"
              >
                Generate Outreach
              </Link>
              <Link
                href={`/dashboard/manifest/requests?personId=${personId}`}
                className="block w-full rounded bg-indigo-600 px-4 py-2 text-center text-sm text-white hover:bg-indigo-700"
              >
                Manifest Meeting Request
              </Link>
              {person.email && (
                <a
                  href={`mailto:${person.email}`}
                  className="block w-full rounded bg-gray-600 px-4 py-2 text-center text-sm text-white hover:bg-gray-700"
                >
                  Send Email
                </a>
              )}
            </div>
          </div>

          {/* ROI Calculation */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">ROI Calculation</h2>
              <button
                onClick={handleCalculateRoi}
                disabled={calculatingRoi}
                className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:bg-gray-400"
              >
                {calculatingRoi ? 'Calculating...' : roiData ? 'Recalculate' : 'Calculate'}
              </button>
            </div>

            {roiData ? (
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">Annual Savings</div>
                  <div className="text-2xl font-bold text-green-600">
                    ${roiData.annualSavings?.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Payback Period</div>
                  <div className="text-xl font-semibold">{roiData.paybackPeriod} months</div>
                </div>
                {roiData.facilityCount && (
                  <div>
                    <div className="text-sm text-gray-600">Based on</div>
                    <div className="text-sm">{roiData.facilityCount} facilities</div>
                  </div>
                )}
                <div className="border-t pt-2 text-xs text-gray-500">
                  Calculated: {new Date(roiData.calculatedAt).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No ROI calculation available. Company research required first.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
