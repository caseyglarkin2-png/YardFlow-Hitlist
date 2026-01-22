'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: Date | string;
  user?: string;
  icon?: React.ReactNode;
}

interface ActivityFeedProps {
  title?: string;
  activities: Activity[];
  maxItems?: number;
}

export function ActivityFeed({ title = 'Recent Activity', activities, maxItems = 10 }: ActivityFeedProps) {
  const displayActivities = activities.slice(0, maxItems);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayActivities.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No recent activity</p>
          ) : (
            displayActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 text-sm">
                {activity.icon && (
                  <div className="mt-0.5 flex-shrink-0">{activity.icon}</div>
                )}
                <div className="flex-1 space-y-1">
                  <p className="text-sm">{activity.description}</p>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    {activity.user && <span>{activity.user}</span>}
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
