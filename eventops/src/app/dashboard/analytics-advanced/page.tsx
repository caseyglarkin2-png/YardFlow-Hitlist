'use client';

import { useEffect, useState, useCallback } from 'react';

interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
  dropoff: number;
}

interface Cohort {
  cohort: string;
  total: number;
  sent: number;
  responded: number;
  meetings: number;
  responseRate: number;
  meetingRate: number;
}

interface Prediction {
  personId: string;
  name: string | null;
  title: string | null;
  score: number;
}

export default function AdvancedAnalyticsPage() {
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [groupBy, setGroupBy] = useState('month');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [funnelRes, cohortRes, predictionRes] = await Promise.all([
        fetch('/api/analytics/funnel'),
        fetch(`/api/analytics/cohort?groupBy=${groupBy}`),
        fetch('/api/analytics/predictions'),
      ]);

      const funnelData = await funnelRes.json();
      const cohortData = await cohortRes.json();
      const predictionData = await predictionRes.json();

      setFunnel(funnelData.funnel || []);
      setCohorts(cohortData.cohorts || []);
      setPredictions(predictionData.topPredictions || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [groupBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold">Advanced Analytics</h1>
        <p className="text-gray-600">Conversion funnels, cohort analysis, and predictive scoring</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading analytics...</div>
      ) : (
        <div className="space-y-6">
          {/* Conversion Funnel */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b p-6">
              <h2 className="text-lg font-semibold">Conversion Funnel</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {funnel.map((stage, index) => {
                  const _maxWidth = 100;
                  const width = stage.percentage;
                  const color =
                    stage.percentage >= 50
                      ? 'bg-green-500'
                      : stage.percentage >= 25
                        ? 'bg-yellow-500'
                        : 'bg-red-500';

                  return (
                    <div key={stage.stage}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">{stage.stage}</span>
                        <div className="text-sm text-gray-600">
                          {stage.count.toLocaleString()} ({stage.percentage.toFixed(1)}%)
                          {index > 0 && stage.dropoff > 0 && (
                            <span className="ml-2 text-red-600">
                              ↓ {stage.dropoff.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="relative h-8 overflow-hidden rounded-lg bg-gray-200">
                        <div
                          className={`${color} flex h-full items-center px-4 text-sm font-semibold text-white transition-all duration-500`}
                          style={{ width: `${Math.max(width, 5)}%` }}
                        >
                          {stage.count > 0 && stage.count.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cohort Analysis */}
          <div className="rounded-lg bg-white shadow">
            <div className="flex items-center justify-between border-b p-6">
              <h2 className="text-lg font-semibold">Cohort Analysis</h2>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-2"
              >
                <option value="month">By Month</option>
                <option value="week">By Week</option>
                <option value="persona">By Persona</option>
                <option value="icpTier">By ICP Tier</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Cohort
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Sent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Responded
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Meetings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Response Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Meeting Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cohorts.map((cohort) => (
                    <tr key={cohort.cohort} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{cohort.cohort}</td>
                      <td className="px-6 py-4">{cohort.total}</td>
                      <td className="px-6 py-4">{cohort.sent}</td>
                      <td className="px-6 py-4">{cohort.responded}</td>
                      <td className="px-6 py-4">{cohort.meetings}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded px-2 py-1 text-sm font-medium ${
                            cohort.responseRate >= 20
                              ? 'bg-green-100 text-green-800'
                              : cohort.responseRate >= 10
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {cohort.responseRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded px-2 py-1 text-sm font-medium ${
                            cohort.meetingRate >= 30
                              ? 'bg-green-100 text-green-800'
                              : cohort.meetingRate >= 15
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {cohort.meetingRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {cohorts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No cohort data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Predictive Scoring */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b p-6">
              <h2 className="text-lg font-semibold">Top Conversion Predictions</h2>
              <p className="mt-1 text-sm text-gray-600">
                People most likely to convert based on ICP score, engagement, and history
              </p>
            </div>
            <div className="max-h-96 divide-y overflow-y-auto">
              {predictions.map((prediction, index) => (
                <div key={prediction.personId} className="flex items-center gap-4 p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{prediction.name}</div>
                    <div className="text-sm text-gray-600">{prediction.title}</div>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 font-semibold ${getScoreColor(prediction.score)}`}
                  >
                    {prediction.score}
                  </div>
                </div>
              ))}
              {predictions.length === 0 && (
                <div className="p-8 text-center text-gray-500">No predictions available</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
