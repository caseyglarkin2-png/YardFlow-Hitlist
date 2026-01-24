'use client';

/**
 * Research Dossier Display - Sprint 33.3
 * Renders AI-generated company research
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CompanyDossier {
  companyOverview: string;
  recentNews: string;
  industryContext: string;
  keyPainPoints: string;
  techStack?: string;
  companySize: string;
  facilityCount?: string;
  locations?: string;
  operationalScale?: string;
  competitiveIntel?: string;
}

export function DossierDisplay({ dossier }: { dossier: CompanyDossier }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Company Dossier</CardTitle>
            <Badge>AI-Generated</Badge>
          </div>
          <CardDescription>
            Multi-source intelligence powered by research agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="intel">Intelligence</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="competitive">Competitive</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Company Overview</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {dossier.companyOverview}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Recent News</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {dossier.recentNews}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Company Size</h4>
                <p className="text-sm text-muted-foreground">{dossier.companySize}</p>
              </div>
            </TabsContent>

            <TabsContent value="intel" className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Industry Context</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {dossier.industryContext}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Key Pain Points</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {dossier.keyPainPoints}
                </p>
              </div>

              {dossier.techStack && (
                <div>
                  <h4 className="font-semibold mb-2">Technology Stack</h4>
                  <p className="text-sm text-muted-foreground">{dossier.techStack}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="operations" className="space-y-4">
              {dossier.facilityCount && (
                <div>
                  <h4 className="font-semibold mb-2">Facility Count</h4>
                  <p className="text-sm text-muted-foreground">{dossier.facilityCount}</p>
                </div>
              )}

              {dossier.locations && (
                <div>
                  <h4 className="font-semibold mb-2">Locations</h4>
                  <p className="text-sm text-muted-foreground">{dossier.locations}</p>
                </div>
              )}

              {dossier.operationalScale && (
                <div>
                  <h4 className="font-semibold mb-2">Operational Scale</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {dossier.operationalScale}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="competitive" className="space-y-4">
              {dossier.competitiveIntel ? (
                <div>
                  <h4 className="font-semibold mb-2">Competitive Intelligence</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {dossier.competitiveIntel}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No competitive intelligence available. Run deep dive research for more data.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
