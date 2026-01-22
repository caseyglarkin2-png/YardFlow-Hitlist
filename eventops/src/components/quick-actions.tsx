'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, MailIcon, UserIcon, ClockIcon } from 'lucide-react';
import Link from 'next/link';

interface Person {
  id: string;
  name: string;
  title: string | null;
  accountName: string;
  icpScore: number;
  nextMeetingIn?: number; // minutes
}

export function QuickActions() {
  const [topPeople, setTopPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Update time every minute for countdown
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadBriefing() {
      try {
        const res = await fetch('/api/briefing/daily');
        if (res.ok) {
          const data = await res.json();
          setTopPeople(data.topPeopleToMeet.slice(0, 3));
        }
      } catch (error) {
        console.error('Failed to load briefing:', error);
      } finally {
        setLoading(false);
      }
    }
    loadBriefing();
  }, []);

  function formatTimeUntil(minutes: number): string {
    if (minutes < 0) return 'In progress';
    if (minutes < 60) return `in ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `in ${hours}h ${mins}m`;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Loading your top priorities...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5" />
          Quick Actions
        </CardTitle>
        <CardDescription>Your top 3 people to meet today</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {topPeople.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No priority contacts for today. Check your <Link href="/briefing" className="text-primary underline">daily brief</Link>.
          </p>
        ) : (
          topPeople.map((person) => (
            <div
              key={person.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{person.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {person.title} at {person.accountName}
                    </p>
                  </div>
                  <Badge variant={person.icpScore >= 90 ? 'default' : 'secondary'} className="ml-2 flex-shrink-0">
                    {person.icpScore}
                  </Badge>
                </div>
                {person.nextMeetingIn !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    Meeting {formatTimeUntil(person.nextMeetingIn)}
                  </p>
                )}
              </div>
              <div className="flex gap-1 ml-3 flex-shrink-0">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/calendar?person=${person.id}`}>
                    <CalendarIcon className="h-3 w-3" />
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/outreach/new?personId=${person.id}`}>
                    <MailIcon className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          ))
        )}
        <div className="pt-2 border-t">
          <Button variant="link" className="w-full" asChild>
            <Link href="/briefing">View Full Daily Brief →</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
