'use client';

/**
 * Campaign Builder Page - Sprint 35.2
 */

import { CampaignBuilder } from '@/components/campaigns/CampaignBuilder';

export default function CampaignBuilderPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Campaign Builder</h1>
        <p className="text-muted-foreground">Create multi-channel outreach sequences</p>
      </div>

      <CampaignBuilder />
    </div>
  );
}
