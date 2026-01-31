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
      return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
    case 'failed':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Circle className="h-4 w-4 text-gray-400" />;
  }
};

export function TaskTree({ steps, showTimestamps = false }: TaskTreeProps) {
  if (!steps || steps.length === 0) {
    return (
      <div className="p-4 border rounded-lg text-center text-muted-foreground">
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
            'flex items-start gap-3 p-2 rounded-md transition-colors',
            step.status === 'in_progress' && 'bg-blue-50',
            step.status === 'failed' && 'bg-red-50'
          )}
        >
          <div className="mt-0.5">
            <StatusIcon status={step.status} />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {stepLabels[step.step] || step.step}
            </p>
            
            {step.error && (
              <p className="text-xs text-red-600 mt-1 truncate" title={step.error}>
                {step.error}
              </p>
            )}
            
            {showTimestamps && step.completedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Completed {new Date(step.completedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
