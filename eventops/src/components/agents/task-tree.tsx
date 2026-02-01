'use client';

import { Check, Circle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskStep {
  step: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

interface TaskTreeProps {
  steps: TaskStep[];
  showTimestamps?: boolean;
}

const stepLabels: Record<string, string> = {
  prospecting: 'Prospecting',
  research: 'Research',
  'sequence-engineer': 'Sequence Design',
  'content-purposing': 'Content Creation',
  socials: 'Social Media',
  graphics: 'Graphics',
  contracting: 'Contracting',
  sequence: 'Sequence',
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'completed':
      return <Check className="h-4 w-4 text-green-600" />;
    case 'in_progress':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
    case 'failed':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Circle className="h-4 w-4 text-gray-400" />;
  }
};

export function TaskTree({ steps, showTimestamps = false }: TaskTreeProps) {
  if (!steps || steps.length === 0) {
    return (
      <div className="rounded-lg border p-4 text-center text-muted-foreground">
        No workflow steps yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {steps.map((step, idx) => (
        <div
          key={idx}
          className={cn(
            'flex items-start gap-3 rounded-md p-2 transition-colors',
            step.status === 'in_progress' && 'bg-blue-50',
            step.status === 'failed' && 'bg-red-50'
          )}
        >
          <div className="mt-0.5">
            <StatusIcon status={step.status} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{stepLabels[step.step] || step.step}</p>

            {step.error && (
              <p className="mt-1 truncate text-xs text-red-600" title={step.error}>
                {step.error}
              </p>
            )}

            {showTimestamps && step.completedAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Completed {new Date(step.completedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
