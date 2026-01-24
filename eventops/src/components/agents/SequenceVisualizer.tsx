'use client';

/**
 * Sequence Blueprint Visualizer - Sprint 33.4
 * Visual timeline of multi-channel outreach sequences
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Linkedin, Phone, Calendar } from 'lucide-react';

interface SequenceStep {
  stepNumber: number;
  delayHours: number;
  channel: 'EMAIL' | 'LINKEDIN' | 'PHONE' | 'MANIFEST';
  templateType: string;
  personalizationLevel: 'low' | 'medium' | 'high';
}

interface SequenceBlueprint {
  name: string;
  description: string;
  targetPersona: string;
  minIcpScore: number;
  steps: SequenceStep[];
}

const channelIcons = {
  EMAIL: Mail,
  LINKEDIN: Linkedin,
  PHONE: Phone,
  MANIFEST: Calendar,
};

const channelColors = {
  EMAIL: 'bg-blue-100 text-blue-700',
  LINKEDIN: 'bg-indigo-100 text-indigo-700',
  PHONE: 'bg-green-100 text-green-700',
  MANIFEST: 'bg-purple-100 text-purple-700',
};

export function SequenceVisualizer({ blueprint }: { blueprint: SequenceBlueprint }) {
  const totalDays = Math.max(...blueprint.steps.map((s) => s.delayHours)) / 24;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{blueprint.name}</CardTitle>
            <CardDescription>{blueprint.description}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{blueprint.targetPersona}</Badge>
            <Badge variant="outline">ICP: {blueprint.minIcpScore}</Badge>
            <Badge>{blueprint.steps.length} steps</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Timeline */}
        <div className="relative">
          {/* Timeline bar */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-border" />

          {/* Steps */}
          <div className="space-y-8">
            {blueprint.steps.map((step, index) => {
              const Icon = channelIcons[step.channel];
              const days = step.delayHours / 24;
              const isFirst = index === 0;

              return (
                <div key={step.stepNumber} className="relative flex items-start gap-4">
                  {/* Timeline dot */}
                  <div
                    className={`z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 border-background ${channelColors[step.channel]}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  {/* Step content */}
                  <div className="flex-1 pb-8">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">Step {step.stepNumber}</Badge>
                      <Badge variant="secondary">{step.channel}</Badge>
                      {!isFirst && (
                        <span className="text-sm text-muted-foreground">
                          +{days.toFixed(1)} days
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium mb-1 capitalize">
                      {step.templateType.replace('-', ' ')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Personalization: {step.personalizationLevel}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 rounded-lg bg-muted">
            <div className="text-sm text-muted-foreground">
              Total campaign duration: <span className="font-medium">{totalDays.toFixed(1)} days</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Channels used:{' '}
              <span className="font-medium">
                {[...new Set(blueprint.steps.map((s) => s.channel))].join(', ')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
