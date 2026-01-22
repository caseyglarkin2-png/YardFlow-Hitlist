'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  entityType: string;
  filters: any;
  isGlobal: boolean;
  createdAt: string;
  users?: {
    name?: string;
    email: string;
  };
}

interface SavedSearchesProps {
  entityType: 'people' | 'accounts' | 'outreach' | 'meetings';
  onLoad: (filters: any) => void;
}

export function SavedSearches({ entityType, onLoad }: SavedSearchesProps) {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSearches = async () => {
    try {
      const res = await fetch(`/api/searches?entityType=${entityType}`);
      if (res.ok) {
        const data = await res.json();
        setSearches(data);
      }
    } catch (error) {
      console.error('Error fetching saved searches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSearches();
  }, [entityType]);

  const handleLoad = (search: SavedSearch) => {
    onLoad(search.filters);
    toast({
      title: 'Search loaded',
      description: `Loaded "${search.name}"`,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/searches/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSearches(searches.filter((s) => s.id !== id));
        toast({
          title: 'Search deleted',
          description: 'Saved search has been removed.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete search.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading searches...</div>;
  }

  if (searches.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No saved searches yet. Create one using the search filters above.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Saved Searches</h4>
      <div className="grid gap-2">
        {searches.map((search) => (
          <div
            key={search.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
          >
            <div className="flex-1 cursor-pointer" onClick={() => handleLoad(search)}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{search.name}</span>
                {search.isGlobal && (
                  <Badge variant="secondary" className="text-xs">
                    <Share2 className="h-3 w-3 mr-1" />
                    Shared
                  </Badge>
                )}
              </div>
              {search.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {search.description}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(search.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
