'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

type ExportType = 'accounts' | 'people' | 'outreach' | 'meetings';

interface ExportButtonProps {
  type: ExportType;
  label?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

const typeLabels: Record<ExportType, string> = {
  accounts: 'Accounts',
  people: 'Contacts',
  outreach: 'Outreach',
  meetings: 'Meetings',
};

export function ExportButton({ type, label, variant = 'outline', size = 'sm' }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);

    // Trigger download via window.location (browser will handle file download)
    window.location.href = `/api/export?type=${type}&format=csv`;

    // Reset after a delay (download starts async)
    setTimeout(() => setIsExporting(false), 2000);
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant={variant}
      size={size}
      className="gap-2"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {label || `Export ${typeLabels[type]}`}
    </Button>
  );
}
