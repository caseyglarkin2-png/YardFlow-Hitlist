'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, PlayCircle, BookOpen, Video } from 'lucide-react';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  videoId: string; // YouTube video ID
  category: 'getting-started' | 'features' | 'advanced';
  completed?: boolean;
}

const TUTORIALS: Tutorial[] = [
  {
    id: 'quick-start',
    title: 'Quick Start Guide',
    description: 'Get started with EventOps in 5 minutes. Learn the basics of account management and meeting scheduling.',
    duration: '5:30',
    videoId: 'dQw4w9WgXcQ', // Replace with actual video ID
    category: 'getting-started',
  },
  {
    id: 'daily-brief',
    title: 'Daily Intelligence Brief',
    description: 'Learn how to use the daily brief to prioritize your event day and maximize meetings.',
    duration: '4:15',
    videoId: 'dQw4w9WgXcQ',
    category: 'getting-started',
  },
  {
    id: 'outreach-sequences',
    title: 'Email Outreach & Sequences',
    description: 'Master email templates, personalization, and automated follow-up sequences.',
    duration: '8:45',
    videoId: 'dQw4w9WgXcQ',
    category: 'features',
  },
  {
    id: 'meeting-management',
    title: 'Meeting Management',
    description: 'Schedule, track, and maximize the value of every meeting at your event.',
    duration: '6:20',
    videoId: 'dQw4w9WgXcQ',
    category: 'features',
  },
  {
    id: 'ai-research',
    title: 'AI Research Tools',
    description: 'Use AI-powered research to build better context and personalize outreach.',
    duration: '7:10',
    videoId: 'dQw4w9WgXcQ',
    category: 'advanced',
  },
  {
    id: 'icp-scoring',
    title: 'ICP Scoring & Prioritization',
    description: 'Configure ICP scoring to automatically prioritize your best-fit accounts.',
    duration: '5:45',
    videoId: 'dQw4w9WgXcQ',
    category: 'advanced',
  },
];

export default function HelpPage() {
  const [selectedVideo, setSelectedVideo] = useState<Tutorial | null>(null);
  const [completedTutorials, setCompletedTutorials] = useState<Set<string>>(new Set());

  const markComplete = (tutorialId: string) => {
    setCompletedTutorials(prev => new Set([...prev, tutorialId]));
  };

  const categories = [
    { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
    { id: 'features', label: 'Features', icon: PlayCircle },
    { id: 'advanced', label: 'Advanced', icon: Video },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Video Tutorials</h1>
        <p className="mt-1 text-sm text-gray-600">
          Learn how to get the most out of EventOps
        </p>
      </div>

      {selectedVideo ? (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{selectedVideo.title}</CardTitle>
                <CardDescription>{selectedVideo.description}</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedVideo(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${selectedVideo.videoId}`}
                title={selectedVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Badge variant="secondary">{selectedVideo.duration}</Badge>
              {!completedTutorials.has(selectedVideo.id) && (
                <Button onClick={() => markComplete(selectedVideo.id)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Complete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {categories.map((category) => {
            const categoryTutorials = TUTORIALS.filter(t => t.category === category.id);
            const Icon = category.icon;
            
            return (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {category.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {categoryTutorials.map((tutorial) => {
                    const isCompleted = completedTutorials.has(tutorial.id);
                    
                    return (
                      <div
                        key={tutorial.id}
                        className="flex flex-col p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedVideo(tutorial)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-sm">{tutorial.title}</h3>
                          {isCompleted && (
                            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 ml-2" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-3 flex-1">
                          {tutorial.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {tutorial.duration}
                          </Badge>
                          <Button size="sm" variant="ghost">
                            <PlayCircle className="h-3 w-3 mr-1" />
                            Watch
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Need More Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-1">Documentation</h4>
            <p className="text-xs text-muted-foreground">
              Visit our comprehensive documentation for detailed guides and API references.
            </p>
            <Button variant="link" className="p-0 h-auto text-xs" asChild>
              <a href="https://docs.eventops.io" target="_blank" rel="noopener noreferrer">
                View Docs →
              </a>
            </Button>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1">Support</h4>
            <p className="text-xs text-muted-foreground">
              Get in touch with our support team for personalized assistance.
            </p>
            <Button variant="link" className="p-0 h-auto text-xs" asChild>
              <a href="mailto:support@eventops.io">
                Contact Support →
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
