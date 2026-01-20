"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function PersonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const personId = params.id as string;

  const [person, setPerson] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [roiData, setRoiData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [calculatingRoi, setCalculatingRoi] = useState(false);

  useEffect(() => {
    fetchPersonData();
  }, [personId]);

  async function fetchPersonData() {
    try {
      // Fetch person with account details
      const res = await fetch(`/api/people/${personId}`);
      if (!res.ok) throw new Error("Failed to fetch person");
      const data = await res.json();
      setPerson(data.person);

      // Try to fetch insights
      try {
        const insightsRes = await fetch(`/api/contact/${personId}/insights`);
        if (insightsRes.ok) {
          const insightsData = await insightsRes.json();
          setInsights(insightsData.insights);
        }
      } catch (e) {
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
        } catch (e) {
          // No ROI yet
        }
      }
    } catch (error) {
      console.error("Error fetching person data:", error);
      alert("Failed to load person details");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateInsights() {
    if (!personId) return;
    
    setGeneratingInsights(true);
    try {
      const res = await fetch(`/api/contact/${personId}/insights`, {
        method: "POST",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || error.error);
      }
      
      const data = await res.json();
      setInsights(data.insights);
      alert("Contact insights generated successfully!");
    } catch (error: any) {
      console.error("Error generating insights:", error);
      alert(`Failed to generate insights: ${error.message}`);
    } finally {
      setGeneratingInsights(false);
    }
  }

  async function handleCalculateRoi() {
    if (!person?.accountId) return;
    
    setCalculatingRoi(true);
    try {
      const res = await fetch(`/api/roi/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      alert("ROI calculated successfully!");
    } catch (error: any) {
      console.error("Error calculating ROI:", error);
      alert(`Failed to calculate ROI: ${error.message}`);
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
        <Link href="/dashboard/people" className="text-blue-600 hover:underline mt-4 inline-block">
          ← Back to People
        </Link>
      </div>
    );
  }

  const getPersonaBadges = () => {
    const badges = [];
    if (person.isExecOps) badges.push("ExecOps");
    if (person.isOps) badges.push("Operations");
    if (person.isProc) badges.push("Procurement");
    if (person.isSales) badges.push("Sales");
    if (person.isTech) badges.push("Tech");
    if (person.isNonOps) badges.push("Non-Ops");
    return badges;
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard/people" className="text-blue-600 hover:underline">
          ← Back to People
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Person Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white shadow rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-2">{person.name}</h1>
            {person.title && <p className="text-gray-600 mb-4">{person.title}</p>}
            
            <div className="flex flex-wrap gap-2 mb-4">
              {getPersonaBadges().map((badge) => (
                <span
                  key={badge}
                  className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {badge}
                </span>
              ))}
            </div>

            <div className="space-y-2 text-sm">
              {person.email && (
                <div>
                  <span className="font-medium">Email:</span>{" "}
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
                  <span className="font-medium">LinkedIn:</span>{" "}
                  <a href={person.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Profile
                  </a>
                </div>
              )}
              {person.account && (
                <div>
                  <span className="font-medium">Company:</span>{" "}
                  <Link href={`/dashboard/accounts/${person.accountId}`} className="text-blue-600 hover:underline">
                    {person.account.name}
                  </Link>
                  {person.account.icpScore && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      ICP: {person.account.icpScore}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contact Insights */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Contact Insights</h2>
              <button
                onClick={handleGenerateInsights}
                disabled={generatingInsights}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 text-sm"
              >
                {generatingInsights ? "Generating..." : insights ? "Refresh Insights" : "Generate Insights"}
              </button>
            </div>

            {insights ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-sm text-gray-600 mb-1">Role Context</h3>
                  <p className="text-sm">{insights.roleContext}</p>
                </div>

                <div>
                  <h3 className="font-medium text-sm text-gray-600 mb-1">Likely Pain Points</h3>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {JSON.parse(insights.likelyPainPoints || "[]").map((point: string, idx: number) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-sm text-gray-600 mb-1">Suggested Approach</h3>
                  <p className="text-sm">{insights.suggestedApproach}</p>
                </div>

                <div>
                  <h3 className="font-medium text-sm text-gray-600 mb-1">ROI Opportunity</h3>
                  <p className="text-sm font-medium text-green-700">{insights.roiOpportunity}</p>
                </div>

                <div className="text-xs text-gray-500">
                  Confidence: {insights.confidence} | Generated: {new Date(insights.generatedAt).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                No insights generated yet. Click "Generate Insights" to create AI-powered contact analysis.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Actions & ROI */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href={`/dashboard/outreach/generate?personId=${personId}`}
                className="block w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-center text-sm"
              >
                Generate Outreach
              </Link>
              <Link
                href={`/dashboard/manifest/requests?personId=${personId}`}
                className="block w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-center text-sm"
              >
                Manifest Meeting Request
              </Link>
              {person.email && (
                <a
                  href={`mailto:${person.email}`}
                  className="block w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-center text-sm"
                >
                  Send Email
                </a>
              )}
            </div>
          </div>

          {/* ROI Calculation */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">ROI Calculation</h2>
              <button
                onClick={handleCalculateRoi}
                disabled={calculatingRoi}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-xs"
              >
                {calculatingRoi ? "Calculating..." : roiData ? "Recalculate" : "Calculate"}
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
                  <div className="text-xl font-semibold">
                    {roiData.paybackPeriod} months
                  </div>
                </div>
                {roiData.facilityCount && (
                  <div>
                    <div className="text-sm text-gray-600">Based on</div>
                    <div className="text-sm">{roiData.facilityCount} facilities</div>
                  </div>
                )}
                <div className="text-xs text-gray-500 pt-2 border-t">
                  Calculated: {new Date(roiData.calculatedAt).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                No ROI calculation available. Company research required first.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
