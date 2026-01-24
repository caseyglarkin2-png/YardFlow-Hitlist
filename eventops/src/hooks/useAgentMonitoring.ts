/**
 * Custom hook for agent monitoring data
 * Sprint 33.1 - Agent Monitoring Dashboard
 */

import { useEffect, useState } from 'react';

export interface AgentMonitoringData {
  summary: {
    timeRange: string;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    successRate: number;
    avgDurationSeconds: number;
  };
  agentMetrics: Record<
    string,
    {
      total: number;
      completed: number;
      failed: number;
      in_progress: number;
      pending: number;
    }
  >;
  recentTasks: Array<{
    id: string;
    agent_type: string;
    status: string;
    created_at: string;
    completed_at: string | null;
    error_message: string | null;
    account_id: string | null;
    contact_id: string | null;
  }>;
}

export function useAgentMonitoring(
  timeRange: '24h' | '7d' | '30d' = '24h',
  agentType?: string
) {
  const [data, setData] = useState<AgentMonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const params = new URLSearchParams({ timeRange });
        if (agentType) params.append('agentType', agentType);

        const response = await fetch(`/api/agents/monitor?${params}`);
        if (!response.ok) throw new Error('Failed to fetch monitoring data');

        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [timeRange, agentType]);

  return { data, loading, error };
}
