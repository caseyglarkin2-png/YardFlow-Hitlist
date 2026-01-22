'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface BulkActionsProps {
  selectedIds: string[];
  onClear: () => void;
  onAction: (action: string, params?: Record<string, any>) => Promise<void>;
  type: 'accounts' | 'people';
}

export function BulkActions({ selectedIds, onClear, onAction, type }: BulkActionsProps) {
  const [action, setAction] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
    if (!action) return;

    setLoading(true);
    try {
      await onAction(action);
      setAction('');
    } finally {
      setLoading(false);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 flex items-center gap-4 min-w-[500px]">
        <Badge variant="secondary" className="text-sm">
          {selectedIds.length} selected
        </Badge>

        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Choose action..." />
          </SelectTrigger>
          <SelectContent>
            {type === 'accounts' ? (
              <>
                <SelectItem value="update-tier">Change Tier</SelectItem>
                <SelectItem value="update-status">Update Status</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="add-to-sequence">Add to Sequence</SelectItem>
                <SelectItem value="assign-owner">Assign Owner</SelectItem>
                <SelectItem value="update-status">Update Status</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>

        <Button onClick={handleExecute} disabled={!action || loading}>
          {loading ? 'Processing...' : 'Execute'}
        </Button>

        <Button variant="outline" onClick={onClear}>
          Clear Selection
        </Button>
      </div>
    </div>
  );
}
