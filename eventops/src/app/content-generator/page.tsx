'use client';

import React, { useState } from 'react';
import { ContentGenerator, ContentRequest, GeneratedContent } from '@/components/ai/ContentGenerator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function ContentGeneratorPage() {
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (request: ContentRequest): Promise<GeneratedContent> => {
    setError(null);
    try {
      const response = await fetch('/api/ai/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate content');
      }

      const data = await response.json();
      return data.content;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold">AI Content Generator</h1>
        <p className="text-gray-600">
          Generate personalized outreach content with YardFlow brand voice for Manifest 2026
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ContentGenerator onGenerate={handleGenerate} />
    </div>
  );
}
