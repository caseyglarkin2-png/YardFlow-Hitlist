"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, Clock, Sparkles } from "lucide-react";

interface NextAction {
  id: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  entityType?: string;
  entityId?: string;
}

export function NextActionsWidget() {
  const [actions, setActions] = useState<NextAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActions();
  }, []);

  async function fetchActions() {
    try {
      const res = await fetch('/api/ai/next-actions');
      const data = await res.json();
      setActions(data.actions || []);
    } catch (error) {
      console.error('Failed to fetch actions:', error);
    } finally {
      setLoading(false);
    }
  }

  const priorityColors = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  };

  const priorityIcons = {
    high: AlertCircle,
    medium: TrendingUp,
    low: Clock,
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI Recommendations
        </CardTitle>
        <CardDescription>
          {actions.length} action{actions.length !== 1 ? 's' : ''} suggested for you
        </CardDescription>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recommendations at this time. Check back later!
          </p>
        ) : (
          <div className="space-y-3">
            {actions.slice(0, 5).map((action) => {
              const Icon = priorityIcons[action.priority];
              
              return (
                <div
                  key={action.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className={`h-8 w-8 rounded-full ${priorityColors[action.priority]} bg-opacity-20 flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-4 w-4 text-${action.priority === 'high' ? 'red' : action.priority === 'medium' ? 'yellow' : 'blue'}-600`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {action.description}
                    </p>
                  </div>
                  <Badge variant={action.priority === 'high' ? 'destructive' : 'secondary'} className="ml-2">
                    {action.priority}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
