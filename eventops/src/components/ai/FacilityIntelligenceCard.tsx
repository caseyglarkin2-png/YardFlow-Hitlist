'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, MapPin, Network } from 'lucide-react';

interface FacilityIntelligence {
  estimatedYardCount: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  reasoning: string;
  networkBreakdown: {
    centralHub?: number;
    regionalCenters?: number;
    localYards?: number;
  };
  operationalScale: string;
}

interface FacilityIntelligenceCardProps {
  intelligence: FacilityIntelligence;
  companyName: string;
}

const confidenceColors = {
  high: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-gray-100 text-gray-800 border-gray-200',
};

const confidenceLabels = {
  high: 'High Confidence',
  medium: 'Medium Confidence',
  low: 'Low Confidence',
};

export function FacilityIntelligenceCard({ intelligence, companyName }: FacilityIntelligenceCardProps) {
  const { estimatedYardCount, confidenceLevel, reasoning, networkBreakdown, operationalScale } = intelligence;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Facility Intelligence</CardTitle>
          </div>
          <Badge className={confidenceColors[confidenceLevel]} variant="outline">
            {confidenceLabels[confidenceLevel]}
          </Badge>
        </div>
        <CardDescription>AI-estimated yard operations for {companyName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estimated Yard Count */}
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-center gap-3">
            <MapPin className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Estimated Facilities</p>
              <p className="text-3xl font-bold text-blue-900">{estimatedYardCount}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase">Operational Scale</p>
            <p className="text-sm font-medium text-gray-900">{operationalScale}</p>
          </div>
        </div>

        {/* Network Breakdown */}
        {networkBreakdown && Object.keys(networkBreakdown).length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Network className="h-4 w-4" />
              <span>Network Breakdown</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {networkBreakdown.centralHub !== undefined && networkBreakdown.centralHub > 0 && (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="text-xs text-purple-600 font-medium uppercase">Central Hub</p>
                  <p className="text-2xl font-bold text-purple-900">{networkBreakdown.centralHub}</p>
                </div>
              )}
              {networkBreakdown.regionalCenters !== undefined && networkBreakdown.regionalCenters > 0 && (
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <p className="text-xs text-indigo-600 font-medium uppercase">Regional</p>
                  <p className="text-2xl font-bold text-indigo-900">{networkBreakdown.regionalCenters}</p>
                </div>
              )}
              {networkBreakdown.localYards !== undefined && networkBreakdown.localYards > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-600 font-medium uppercase">Local</p>
                  <p className="text-2xl font-bold text-blue-900">{networkBreakdown.localYards}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reasoning */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <TrendingUp className="h-4 w-4" />
            <span>Analysis</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-200">
            {reasoning}
          </p>
        </div>

        {/* Confidence Note */}
        <div className="text-xs text-gray-500 italic border-t pt-3">
          Note: Estimates based on company size, industry data, and operational indicators. Verify during discovery calls.
        </div>
      </CardContent>
    </Card>
  );
}
