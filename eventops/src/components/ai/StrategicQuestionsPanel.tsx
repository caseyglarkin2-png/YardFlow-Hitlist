'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, Copy, Check } from 'lucide-react';

interface StrategicQuestionsPanelProps {
  questions: string[];
  companyName: string;
  context?: string;
}

export function StrategicQuestionsPanel({ questions, companyName, context }: StrategicQuestionsPanelProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (question: string, index: number) => {
    await navigator.clipboard.writeText(question);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = async () => {
    const allQuestions = questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n');
    await navigator.clipboard.writeText(allQuestions);
    setCopiedIndex(-1);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Strategic Questions</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAll}
            className="flex items-center gap-2"
          >
            {copiedIndex === -1 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiedIndex === -1 ? 'Copied!' : 'Copy All'}
          </Button>
        </div>
        <CardDescription>
          AI-generated discovery questions for {companyName} at Manifest
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {context && (
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
            <p className="text-sm text-purple-900 font-medium mb-1">Context</p>
            <p className="text-sm text-purple-700">{context}</p>
          </div>
        )}

        <div className="space-y-3">
          {questions.map((question, index) => (
            <div
              key={index}
              className="group p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 hover:border-purple-300 transition-all cursor-pointer"
              onClick={() => handleCopy(question, index)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-white">
                      Q{index + 1}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-900 leading-relaxed">{question}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(question, index);
                  }}
                >
                  {copiedIndex === index ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-gray-500 italic border-t pt-3">
          💡 Tip: Click any question to copy, or use "Copy All" for your booth prep notes
        </div>
      </CardContent>
    </Card>
  );
}
