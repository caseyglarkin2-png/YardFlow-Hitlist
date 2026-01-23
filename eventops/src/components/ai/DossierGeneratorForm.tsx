'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2 } from 'lucide-react';

interface DossierGeneratorFormProps {
  onGenerate: (accountId: string, dryRun: boolean) => Promise<void>;
  companies: Array<{ id: string; name: string }>;
}

export function DossierGeneratorForm({ onGenerate, companies }: DossierGeneratorFormProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [dryRun, setDryRun] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!selectedAccountId) return;

    setIsGenerating(true);
    try {
      await onGenerate(selectedAccountId, dryRun);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-purple-600" />
          <CardTitle>Generate Company Dossier</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company-select">Select Company</Label>
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger id="company-select">
              <SelectValue placeholder="Choose a company..." />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="dry-run"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="dry-run" className="text-sm text-gray-600">
            Dry run (preview only, don't save)
          </Label>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!selectedAccountId || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Dossier...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Dossier
            </>
          )}
        </Button>

        {dryRun && (
          <Badge variant="outline" className="w-full justify-center bg-yellow-50 text-yellow-700 border-yellow-200">
            Preview Mode - Results won't be saved
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
