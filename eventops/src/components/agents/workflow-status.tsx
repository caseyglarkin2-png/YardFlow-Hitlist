'use client';

import { useEffect, useState, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';

interface WorkflowStep {
  step: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

interface WorkflowStatusData {
  found: boolean;
  workflowId: string;
  status: string;
  progress: number;
  steps: WorkflowStep[];
}

interface WorkflowStatusProps {
  workflowId: string;
  pollInterval?: number;
  onComplete?: () => void;
}

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  in_progress: 'default',
  completed: 'outline',
  failed: 'destructive',
};

export function WorkflowStatus({ workflowId, pollInterval = 3000, onComplete }: WorkflowStatusProps) {
  const [status, setStatus] = useState<WorkflowStatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/workflow/${workflowId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Workflow not found');
          setIsPolling(false);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setStatus(data);
      setError(null);
      
      if (data.status === 'completed' || data.status === 'failed') {
        setIsPolling(false);
        if (data.status === 'completed') {
          onComplete?.();
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, [workflowId, onComplete]);

  useEffect(() => {
    fetchStatus();
    
    if (!isPolling) return;
    
    const interval = setInterval(fetchStatus, pollInterval);
    return () => clearInterval(interval);
  }, [fetchStatus, pollInterval, isPolling]);

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <p className="text-red-600 text-sm">Error: {error}</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="p-4 border rounded-lg flex items-center gap-2">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading workflow status...</span>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Workflow Progress</h3>
        <Badge variant={statusVariants[status.status] || 'secondary'}>
          {status.status.replace('_', ' ')}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{status.progress}% complete</span>
          <span>{status.steps.filter(s => s.status === 'completed').length} / {status.steps.length} steps</span>
        </div>
        <Progress value={status.progress} className="h-2" />
      </div>

      {isPolling && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Auto-refreshing every {pollInterval / 1000}s
        </p>
      )}
    </div>
  );
}
