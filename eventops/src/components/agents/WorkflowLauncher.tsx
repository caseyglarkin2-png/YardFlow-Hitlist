'use client';

/**
 * Workflow Launch Interface - Sprint 33.2
 * UI for initiating multi-agent campaigns
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export function WorkflowLauncher() {
  const [workflowType, setWorkflowType] = useState<
    'full-campaign' | 'quick-outreach' | 'research-only'
  >('full-campaign');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [goal, setGoal] = useState<'meeting' | 'demo' | 'relationship'>('meeting');
  const [launching, setLaunching] = useState(false);
  const [result, setResult] = useState<{ workflowId: string; status: string } | null>(null);

  const handleLaunch = async () => {
    setLaunching(true);
    setResult(null);

    try {
      // TODO: Replace with actual account/contact IDs from selection
      const response = await fetch('/api/workflows/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: workflowType,
          accountId: 'demo-account',
          contactIds: ['demo-contact-1'],
          config: {
            sequenceGoal: goal,
            urgency,
            skipResearch: workflowType === 'quick-outreach',
          },
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Workflow launch failed:', error);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Launch Agent Workflow</CardTitle>
        <CardDescription>
          Orchestrate multi-agent campaigns for selected accounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Workflow Type */}
        <div className="space-y-3">
          <Label>Workflow Type</Label>
          <RadioGroup
            value={workflowType}
            onValueChange={(v) => setWorkflowType(v as typeof workflowType)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="full-campaign" id="full" />
              <Label htmlFor="full" className="font-normal">
                <div>Full Campaign</div>
                <div className="text-xs text-muted-foreground">
                  Research → Sequence → Content → Launch
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="quick-outreach" id="quick" />
              <Label htmlFor="quick" className="font-normal">
                <div>Quick Outreach</div>
                <div className="text-xs text-muted-foreground">
                  Sequence → Launch (skip research)
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="research-only" id="research" />
              <Label htmlFor="research" className="font-normal">
                <div>Research Only</div>
                <div className="text-xs text-muted-foreground">
                  Generate dossiers without launching sequences
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Campaign Goal */}
        {workflowType !== 'research-only' && (
          <div className="space-y-2">
            <Label>Campaign Goal</Label>
            <Select value={goal} onValueChange={(v) => setGoal(v as typeof goal)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting">Book Meeting</SelectItem>
                <SelectItem value="demo">Schedule Demo</SelectItem>
                <SelectItem value="relationship">Build Relationship</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Urgency */}
        <div className="space-y-2">
          <Label>Urgency</Label>
          <Select value={urgency} onValueChange={(v) => setUrgency(v as typeof urgency)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low (1.5x timing)</SelectItem>
              <SelectItem value="medium">Medium (standard)</SelectItem>
              <SelectItem value="high">High (0.5x timing)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Launch Button */}
        <Button
          onClick={handleLaunch}
          disabled={launching}
          className="w-full"
          size="lg"
        >
          {launching ? 'Launching Agents...' : 'Launch Workflow'}
        </Button>

        {/* Result */}
        {result && (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={result.status === 'completed' ? 'default' : 'secondary'}>
                {result.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Workflow ID: {result.workflowId}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
