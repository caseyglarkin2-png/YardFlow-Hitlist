'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RetryButtonProps {
  workflowId: string;
  taskId: string;
  onSuccess?: () => void;
  disabled?: boolean;
}

export function RetryButton({ workflowId, taskId, onSuccess, disabled }: RetryButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();

  const handleRetry = async () => {
    setIsRetrying(true);
    
    try {
      const res = await fetch(`/api/agents/workflow/${workflowId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', taskId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Retry failed');
      }

      toast({
        title: 'Retry started',
        description: 'The failed task is being retried.',
      });
      
      onSuccess?.();
    } catch (e) {
      toast({
        title: 'Retry failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Button
      onClick={handleRetry}
      disabled={disabled || isRetrying}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isRetrying ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      {isRetrying ? 'Retrying...' : 'Retry'}
    </Button>
  );
}
