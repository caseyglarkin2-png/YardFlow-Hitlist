'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { DossierView } from '@/components/ai/DossierView';
import { DossierGeneratorForm } from '@/components/ai/DossierGeneratorForm';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function DossierPageContent() {
  const searchParams = useSearchParams();
  const accountId = searchParams.get('accountId') || undefined;
  
  const [dossier, setDossier] = useState<any>(null);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>('');

  useEffect(() => {
    loadCompanies();
    if (accountId) {
      loadDossier(accountId);
    } else {
      setLoading(false);
    }
  }, [accountId]);

  const loadCompanies = async () => {
    try {
      const response = await fetch('/api/accounts?limit=100');
      if (!response.ok) throw new Error('Failed to load companies');
      const data = await response.json();
      setCompanies(
        data.accounts.map((acc: any) => ({
          id: acc.id,
          name: acc.company_name,
        }))
      );
    } catch (err) {
      console.error('Error loading companies:', err);
    }
  };

  const loadDossier = async (accId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/ai/dossier?accountId=${accId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setDossier(null);
          return;
        }
        throw new Error('Failed to load dossier');
      }
      const data = await response.json();
      setDossier(data.dossier);

      const company = companies.find((c) => c.id === accId);
      if (company) setSelectedCompanyName(company.name);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (accId: string, dryRun: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/dossier/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: accId, dryRun }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate dossier');
      }

      const data = await response.json();
      setDossier(data.dossier);

      const company = companies.find((c) => c.id === accId);
      if (company) setSelectedCompanyName(company.name);

      if (!dryRun) {
        await loadDossier(accId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!dossier?.accountId) return;
    await handleGenerate(dossier.accountId, false);
  };

  const handleExport = () => {
    if (!dossier) return;
    const dataStr = JSON.stringify(dossier, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedCompanyName.replace(/\s+/g, '_')}_dossier_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !dossier) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <span className="ml-2 text-gray-600">Loading...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!dossier && (
        <DossierGeneratorForm companies={companies} onGenerate={handleGenerate} />
      )}

      {dossier && (
        <DossierView
          dossier={dossier}
          companyName={selectedCompanyName}
          onRegenerate={handleRegenerate}
          onExport={handleExport}
          isRegenerating={loading}
        />
      )}
    </div>
  );
}

// Loading fallback for Suspense
function DossierPageLoading() {
  return (
    <Card>
      <CardContent className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <span className="ml-2 text-gray-600">Loading...</span>
      </CardContent>
    </Card>
  );
}

// Main component wrapped in Suspense for useSearchParams
export default function CompanyDossierPage() {
  return (
    <Suspense fallback={<DossierPageLoading />}>
      <DossierPageContent />
    </Suspense>
  );
}
