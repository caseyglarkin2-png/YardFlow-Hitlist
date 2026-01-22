'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportToCSV } from '@/lib/search-builder';
import { useToast } from '@/hooks/use-toast';

interface ExportSearchButtonProps {
  data: any[];
  filename?: string;
  disabled?: boolean;
}

export function ExportSearchButton({
  data,
  filename = 'search-results.csv',
  disabled = false,
}: ExportSearchButtonProps) {
  const { toast } = useToast();

  const handleExport = () => {
    if (data.length === 0) {
      toast({
        title: 'No data to export',
        description: 'Run a search first to export results.',
        variant: 'destructive',
      });
      return;
    }

    try {
      exportToCSV(data, filename);
      toast({
        title: 'Export successful',
        description: `Downloaded ${data.length} results to ${filename}`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'There was an error exporting the data.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || data.length === 0}
    >
      <Download className="h-4 w-4 mr-2" />
      Export CSV ({data.length})
    </Button>
  );
}
