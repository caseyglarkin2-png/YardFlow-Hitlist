'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Users, Zap } from 'lucide-react';

interface OpportunityCategory {
  category: string;
  opportunities: string[];
  priority: 'high' | 'medium' | 'low';
}

interface ManifestOpportunitiesCardProps {
  opportunities: OpportunityCategory[];
  companyName: string;
}

const priorityConfig = {
  high: { color: 'bg-red-100 text-red-800 border-red-200', icon: Zap, label: 'High Priority' },
  medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: TrendingUp, label: 'Medium Priority' },
  low: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Users, label: 'Low Priority' },
};

export function ManifestOpportunitiesCard({ opportunities, companyName }: ManifestOpportunitiesCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-green-600" />
          <CardTitle className="text-lg">Manifest Opportunities</CardTitle>
        </div>
        <CardDescription>Strategic talking points for {companyName} at the booth</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {opportunities.map((oppCategory, catIndex) => {
          const config = priorityConfig[oppCategory.priority];
          const Icon = config.icon;

          return (
            <div key={catIndex} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <h3 className="font-medium text-gray-900">{oppCategory.category}</h3>
                </div>
                <Badge className={config.color} variant="outline">
                  {config.label}
                </Badge>
              </div>

              <div className="space-y-2 pl-6">
                {oppCategory.opportunities.map((opportunity, oppIndex) => (
                  <div
                    key={oppIndex}
                    className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-green-300 transition-colors"
                  >
                    <div className="mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed flex-1">{opportunity}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {opportunities.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Target className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No opportunities identified yet</p>
          </div>
        )}

        <div className="text-xs text-gray-500 italic border-t pt-3">
          🎯 Use these talking points to guide booth conversations and identify mutual value
        </div>
      </CardContent>
    </Card>
  );
}
