'use client';

import { useEffect, useState } from 'react';

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

  useEffect(() => {
    loadData();
  }, [groupBy]);

  const loadData = async () => {
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
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Advanced Analytics</h1>
        <p className="text-gray-600">Conversion funnels, cohort analysis, and predictive scoring</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading analytics...</div>
      ) : (
        <div className="space-y-6">
          {/* Conversion Funnel */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Conversion Funnel</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {funnel.map((stage, index) => {
                  const maxWidth = 100;
                  const width = stage.percentage;
                  const color =
                    stage.percentage >= 50
                      ? 'bg-green-500'
                      : stage.percentage >= 25
                      ? 'bg-yellow-500'
                      : 'bg-red-500';

                  return (
                    <div key={stage.stage}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{stage.stage}</span>
                        <div className="text-sm text-gray-600">
                          {stage.count.toLocaleString()} ({stage.percentage.toFixed(1)}%)
                          {index > 0 && stage.dropoff > 0 && (
                            <span className="text-red-600 ml-2">
                              ↓ {stage.dropoff.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="relative h-8 bg-gray-200 rounded-lg overflow-hidden">
                        <div
                          className={`${color} h-full flex items-center px-4 text-white font-semibold text-sm transition-all duration-500`}
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
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Cohort Analysis</h2>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2"
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cohort
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Sent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Responded
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Meetings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Response Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
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
                          className={`px-2 py-1 rounded text-sm font-medium ${
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
                          className={`px-2 py-1 rounded text-sm font-medium ${
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
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Top Conversion Predictions</h2>
              <p className="text-sm text-gray-600 mt-1">
                People most likely to convert based on ICP score, engagement, and history
              </p>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {predictions.map((prediction, index) => (
                <div key={prediction.personId} className="p-4 flex items-center gap-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{prediction.name}</div>
                    <div className="text-sm text-gray-600">{prediction.title}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full font-semibold ${getScoreColor(prediction.score)}`}>
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
