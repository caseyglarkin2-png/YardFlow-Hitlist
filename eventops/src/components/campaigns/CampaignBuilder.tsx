'use client';

/**
 * Campaign Builder - Sprint 35.2
 * Visual interface for creating multi-channel campaigns
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, MoveUp, MoveDown } from 'lucide-react';

interface CampaignStep {
  id: string;
  stepNumber: number;
  channel: 'EMAIL' | 'LINKEDIN' | 'PHONE' | 'MANIFEST';
  delayDays: number;
  templateType: string;
  subject?: string;
  body?: string;
}

export function CampaignBuilder() {
  const [campaignName, setCampaignName] = useState('');
  const [description, setDescription] = useState('');
  const [targetPersona, setTargetPersona] = useState('ExecOps');
  const [minIcpScore, setMinIcpScore] = useState(70);
  const [steps, setSteps] = useState<CampaignStep[]>([
    {
      id: '1',
      stepNumber: 1,
      channel: 'EMAIL',
      delayDays: 0,
      templateType: 'intro-email',
      subject: 'Quick question about {{company}}',
      body: 'Hi {{first_name}},\n\nI noticed {{company}} is attending Manifest 2026...',
    },
  ]);

  const addStep = () => {
    const newStep: CampaignStep = {
      id: String(steps.length + 1),
      stepNumber: steps.length + 1,
      channel: 'EMAIL',
      delayDays: 3,
      templateType: 'follow-up',
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id).map((s, i) => ({ ...s, stepNumber: i + 1 })));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    newSteps.forEach((step, i) => (step.stepNumber = i + 1));
    setSteps(newSteps);
  };

  const updateStep = (id: string, field: keyof CampaignStep, value: any) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const saveCampaign = async () => {
    const campaign = {
      name: campaignName,
      description,
      targetPersona,
      minIcpScore,
      steps: steps.map((s) => ({
        stepNumber: s.stepNumber,
        channel: s.channel,
        delayHours: s.delayDays * 24,
        templateType: s.templateType,
        subject: s.subject,
        body: s.body,
      })),
    };

    const response = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaign),
    });

    if (response.ok) {
      alert('Campaign saved successfully!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Campaign Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Settings</CardTitle>
          <CardDescription>Define your campaign parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Manifest 2026 - ExecOps Outreach"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="persona">Target Persona</Label>
              <Select value={targetPersona} onValueChange={setTargetPersona}>
                <SelectTrigger id="persona">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ExecOps">ExecOps (C-Suite)</SelectItem>
                  <SelectItem value="Ops">Operations (Directors/VPs)</SelectItem>
                  <SelectItem value="Procurement">Procurement</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pre-event outreach campaign targeting supply chain executives..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="icpScore">Minimum ICP Score: {minIcpScore}</Label>
            <input
              type="range"
              id="icpScore"
              min="0"
              max="100"
              value={minIcpScore}
              onChange={(e) => setMinIcpScore(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Only enroll accounts with ICP score ≥ {minIcpScore}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Steps */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Campaign Steps</CardTitle>
              <CardDescription>Build your multi-channel sequence</CardDescription>
            </div>
            <Button onClick={addStep} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Step
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge>Step {step.stepNumber}</Badge>
                  {step.stepNumber > 1 && (
                    <span className="text-sm text-muted-foreground">
                      +{step.delayDays} days
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveStep(index, 'up')}
                    disabled={index === 0}
                  >
                    <MoveUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveStep(index, 'down')}
                    disabled={index === steps.length - 1}
                  >
                    <MoveDown className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeStep(step.id)}
                    disabled={steps.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <Select
                    value={step.channel}
                    onValueChange={(v) => updateStep(step.id, 'channel', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                      <SelectItem value="PHONE">Phone</SelectItem>
                      <SelectItem value="MANIFEST">Manifest Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Delay (days)</Label>
                  <Input
                    type="number"
                    value={step.delayDays}
                    onChange={(e) => updateStep(step.id, 'delayDays', Number(e.target.value))}
                    disabled={step.stepNumber === 1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Template Type</Label>
                  <Select
                    value={step.templateType}
                    onValueChange={(v) => updateStep(step.id, 'templateType', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intro-email">Introduction</SelectItem>
                      <SelectItem value="follow-up">Follow-up</SelectItem>
                      <SelectItem value="value-prop">Value Proposition</SelectItem>
                      <SelectItem value="meeting-request">Meeting Request</SelectItem>
                      <SelectItem value="breakup">Breakup Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {step.channel === 'EMAIL' && (
                <>
                  <div className="space-y-2">
                    <Label>Subject Line</Label>
                    <Input
                      value={step.subject || ''}
                      onChange={(e) => updateStep(step.id, 'subject', e.target.value)}
                      placeholder="Use {{variables}} for personalization"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Body</Label>
                    <Textarea
                      value={step.body || ''}
                      onChange={(e) => updateStep(step.id, 'body', e.target.value)}
                      placeholder="Hi {{first_name}},..."
                      rows={5}
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveCampaign} size="lg">
          Save Campaign
        </Button>
      </div>
    </div>
  );
}
