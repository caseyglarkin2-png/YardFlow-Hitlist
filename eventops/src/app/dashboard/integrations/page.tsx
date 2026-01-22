"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Zap, Check, ExternalLink } from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  status: string;
  features: string[];
  requiresAuth: boolean;
  authType: string;
  isConnected?: boolean;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  async function fetchIntegrations() {
    try {
      const res = await fetch('/api/integrations');
      const data = await res.json();
      setIntegrations(data.integrations || []);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleIntegration(integrationId: string, enable: boolean) {
    if (enable) {
      // In production, initiate OAuth or show API key input
      const confirmed = confirm(`Connect to ${integrationId}? This will redirect you to authenticate.`);
      if (!confirmed) return;

      try {
        const res = await fetch('/api/integrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            integrationId,
            config: {},
          }),
        });

        if (res.ok) {
          setIntegrations(integrations.map(i =>
            i.id === integrationId ? { ...i, isConnected: true } : i
          ));
        }
      } catch (error) {
        console.error('Failed to connect:', error);
        alert('Failed to connect integration');
      }
    } else {
      setIntegrations(integrations.map(i =>
        i.id === integrationId ? { ...i, isConnected: false } : i
      ));
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading integrations...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect EventOps with your favorite tools
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => (
          <Card key={integration.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    {integration.name}
                    {integration.isConnected && (
                      <Badge variant="default" className="ml-2">
                        <Check className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {integration.description}
                  </CardDescription>
                </div>
                <Switch
                  checked={integration.isConnected || false}
                  onCheckedChange={(checked) => toggleIntegration(integration.id, checked)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Features:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {integration.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-muted-foreground" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {integration.isConnected && (
                  <div className="pt-3 border-t">
                    <Button variant="outline" size="sm" className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Configure Settings
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Custom Webhooks</CardTitle>
          <CardDescription>
            Build your own integrations using our webhook system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Receive real-time notifications when events occur in EventOps. Perfect for custom workflows and automation.
          </p>
          <Button variant="outline">
            Manage Webhooks
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
