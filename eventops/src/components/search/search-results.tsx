'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface SearchResult {
  id: string;
  type: 'person' | 'account' | 'outreach' | 'meeting';
  title: string;
  subtitle?: string;
  metadata?: Record<string, any>;
  url: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
  resultCount?: number;
}

export function SearchResults({
  results,
  isLoading,
  resultCount,
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Searching...</p>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No results found. Try adjusting your filters.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {resultCount !== undefined && (
        <p className="text-sm text-muted-foreground">
          Found {resultCount} result{resultCount !== 1 ? 's' : ''}
        </p>
      )}
      
      <div className="space-y-2">
        {results.map((result) => (
          <Link key={result.id} href={result.url}>
            <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{result.title}</h3>
                    <Badge variant="outline" className="text-xs">
                      {result.type}
                    </Badge>
                  </div>
                  {result.subtitle && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.subtitle}
                    </p>
                  )}
                  {result.metadata && (
                    <div className="flex gap-4 mt-2">
                      {Object.entries(result.metadata).map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="text-muted-foreground">{key}: </span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
