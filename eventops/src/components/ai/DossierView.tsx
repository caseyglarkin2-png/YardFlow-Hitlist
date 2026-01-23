'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileText, Sparkles, RefreshCw, Download, Calendar } from 'lucide-react';
import { FacilityIntelligenceCard } from './FacilityIntelligenceCard';
import { StrategicQuestionsPanel } from './StrategicQuestionsPanel';
import { ManifestOpportunitiesCard } from './ManifestOpportunitiesCard';

interface CompanyDossier {
  id: string;
  accountId: string;
  companyOverview: string;
  industryContext: string;
  keyPainPoints: string[];
  techStack: string[];
  companySize: string;
  facilityIntelligence: {
    estimatedYardCount: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    reasoning: string;
    networkBreakdown: {
      centralHub?: number;
      regionalCenters?: number;
      localYards?: number;
    };
    operationalScale: string;
  };
  strategicQuestions: string[];
  manifestOpportunities: Array<{
    category: string;
    opportunities: string[];
    priority: 'high' | 'medium' | 'low';
  }>;
  researchedBy: string;
  researchedAt: Date;
}

interface DossierViewProps {
  dossier: CompanyDossier;
  companyName: string;
  onRegenerate?: () => void;
  onExport?: () => void;
  isRegenerating?: boolean;
}

export function DossierView({
  dossier,
  companyName,
  onRegenerate,
  onExport,
  isRegenerating = false,
}: DossierViewProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      // Default export as JSON
      const dataStr = JSON.stringify(dossier, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${companyName.replace(/\s+/g, '_')}_dossier.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Company Dossier: {companyName}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Sparkles className="h-3 w-3" />
                AI-Generated Intelligence Report
                {dossier.researchedAt && (
                  <>
                    <span>•</span>
                    <Calendar className="h-3 w-3" />
                    {new Date(dossier.researchedAt).toLocaleDateString()}
                  </>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onRegenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="facilities">Facilities</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Company Overview */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Badge variant="outline">Company Overview</Badge>
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-200">
                {dossier.companyOverview}
              </p>
            </div>

            {/* Industry Context */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Badge variant="outline">Industry Context</Badge>
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-200">
                {dossier.industryContext}
              </p>
            </div>

            {/* Key Pain Points */}
            {dossier.keyPainPoints && dossier.keyPainPoints.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Badge variant="outline">Key Pain Points</Badge>
                </h3>
                <ul className="space-y-2">
                  {dossier.keyPainPoints.map((point, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-gray-700 p-3 bg-red-50 rounded-lg border border-red-100"
                    >
                      <span className="text-red-600 font-bold">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tech Stack */}
            {dossier.techStack && dossier.techStack.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Badge variant="outline">Tech Stack</Badge>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {dossier.techStack.map((tech, index) => (
                    <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Company Size */}
            <div className="flex items-center gap-2 p-4 bg-purple-50 rounded-lg border border-purple-100">
              <span className="text-sm text-purple-600 font-medium">Company Size:</span>
              <span className="text-sm text-purple-900 font-bold">{dossier.companySize}</span>
            </div>
          </TabsContent>

          <TabsContent value="facilities" className="mt-6">
            <FacilityIntelligenceCard
              intelligence={dossier.facilityIntelligence}
              companyName={companyName}
            />
          </TabsContent>

          <TabsContent value="questions" className="mt-6">
            <StrategicQuestionsPanel
              questions={dossier.strategicQuestions}
              companyName={companyName}
              context="Discovery questions for Manifest booth conversations"
            />
          </TabsContent>

          <TabsContent value="opportunities" className="mt-6">
            <ManifestOpportunitiesCard
              opportunities={dossier.manifestOpportunities}
              companyName={companyName}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
