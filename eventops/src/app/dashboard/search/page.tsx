'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdvancedFilters, SearchFilter } from '@/components/search/advanced-filters';
import { SearchResults } from '@/components/search/search-results';
import { SavedSearches } from '@/components/search/saved-searches';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Save, Search } from 'lucide-react';

export default function AdvancedSearchPage() {
  const router = useRouter();
  const [entityType, setEntityType] = useState<'accounts' | 'people' | 'outreach' | 'meetings'>('people');
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [searching, setSearching] = useState(false);

  // Auto-search when filters change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.length > 0) {
        handleSearch();
      } else {
        setResults([]);
        setResultCount(0);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [filters]);

  async function handleSearch() {
    setSearching(true);

    try {
      const res = await fetch('/api/search/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, filters }),
      });
      const data = await res.json();
      
      setResults(data.results || []);
      setResultCount(data.totalResults || 0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  }

  async function handleExport() {
    if (results.length === 0) return;

    const csv = convertToCSV(results);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityType}-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  function convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((item) =>
      Object.values(item)
        .map((v) => (typeof v === 'object' ? JSON.stringify(v) : v))
        .join(',')
    );

    return [headers, ...rows].join('\n');
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Advanced Search</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExport}
            disabled={results.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
        </div>
      </div>

      <Tabs value={entityType} onValueChange={(v) => setEntityType(v as any)} className="mb-6">
        <TabsList>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="outreach">Outreach</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <SavedSearches
            entityType={entityType}
            currentFilters={filters}
            onLoadSearch={setFilters}
          />
          
          <AdvancedFilters
            entityType={entityType}
            filters={filters}
            onFiltersChange={setFilters}
            resultCount={resultCount}
          />
        </div>

        <div className="lg:col-span-2">
          <SearchResults
            results={results}
            isLoading={searching}
            emptyMessage={filters.length === 0 ? "Add filters to start searching" : "No results found. Try adjusting your filters."}
          />
        </div>
      </div>
    </div>
  );
}

