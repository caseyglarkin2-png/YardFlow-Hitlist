'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Mail, 
  Phone, 
  Calendar, 
  Linkedin, 
  Target,
  Flame,
  Clock,
  Building2,
  User
} from 'lucide-react';

interface TopTarget {
  id: string;
  name: string;
  title: string | null;
  company: string;
  icpScore: number;
  dataQualityScore: number;
  lastEngagement: string | null;
  nextAction: string;
  email: string | null;
  linkedInUrl: string | null;
  phoneNumber: string | null;
  engagementHeat: number; // 0-100
}

export default function TopTargetsDashboard() {
  const [targets, setTargets] = useState<TopTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTarget, setSelectedTarget] = useState<TopTarget | null>(null);

  useEffect(() => {
    loadTargets();
  }, []);

  async function loadTargets() {
    try {
      const response = await fetch('/api/targets/top');
      const data = await response.json();
      if (data.success) {
        setTargets(data.targets);
      }
    } catch (error) {
      console.error('Failed to load targets:', error);
    } finally {
      setLoading(false);
    }
  }

  function getHeatColor(heat: number): string {
    if (heat >= 80) return 'text-red-600';
    if (heat >= 60) return 'text-orange-600';
    if (heat >= 40) return 'text-yellow-600';
    return 'text-blue-600';
  }

  function getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      'INITIAL_OUTREACH': 'Send first email',
      'FOLLOW_UP': 'Follow up',
      'BOOK_MEETING': 'Book meeting',
      'RE_ENGAGE': 'Re-engage',
      'NURTURE': 'Continue nurturing',
      'WAIT_FOR_REPLY': 'Wait for reply',
    };
    return labels[action] || action;
  }

  function getActionColor(action: string): string {
    const colors: Record<string, string> = {
      'INITIAL_OUTREACH': 'bg-green-100 text-green-800',
      'FOLLOW_UP': 'bg-yellow-100 text-yellow-800',
      'BOOK_MEETING': 'bg-purple-100 text-purple-800',
      'RE_ENGAGE': 'bg-orange-100 text-orange-800',
      'NURTURE': 'bg-blue-100 text-blue-800',
      'WAIT_FOR_REPLY': 'bg-gray-100 text-gray-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  }

  async function takeAction(target: TopTarget, action: string) {
    // Implement action handling
    console.log('Taking action:', action, 'for', target.name);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Top Targets</h1>
          <p className="text-gray-600 mt-1">Your highest priority prospects</p>
        </div>
        <Button onClick={loadTargets}>
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hot Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Flame className="h-4 w-4 text-red-600" />
              <span className="text-2xl font-bold">
                {targets.filter(t => t.engagementHeat >= 80).length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg ICP Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">
                {Math.round(targets.reduce((sum, t) => sum + t.icpScore, 0) / targets.length) || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">With Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">
                {targets.filter(t => t.email).length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">On LinkedIn</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Linkedin className="h-4 w-4 text-blue-700" />
              <span className="text-2xl font-bold">
                {targets.filter(t => t.linkedInUrl).length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Targets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {targets.map((target) => (
          <Card 
            key={target.id}
            className={`hover:shadow-lg transition-shadow cursor-pointer ${
              selectedTarget?.id === target.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedTarget(target)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="flex items-center space-x-2">
                    <span>{target.name}</span>
                    {target.engagementHeat >= 80 && (
                      <Flame className="h-4 w-4 text-red-600" />
                    )}
                  </CardTitle>
                  {target.title && (
                    <CardDescription className="flex items-center space-x-1 mt-1">
                      <User className="h-3 w-3" />
                      <span>{target.title}</span>
                    </CardDescription>
                  )}
                  <CardDescription className="flex items-center space-x-1 mt-1">
                    <Building2 className="h-3 w-3" />
                    <span>{target.company}</span>
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1">
                    <TrendingUp className={`h-4 w-4 ${getHeatColor(target.engagementHeat)}`} />
                    <span className={`font-bold ${getHeatColor(target.engagementHeat)}`}>
                      {target.engagementHeat}
                    </span>
                  </div>
                  <Badge variant="outline" className="mt-1">
                    ICP: {target.icpScore}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Contact Methods */}
              <div className="flex flex-wrap gap-2 mb-3">
                {target.email && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `mailto:${target.email}`;
                    }}
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    Email
                  </Button>
                )}
                {target.linkedInUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(target.linkedInUrl!, '_blank');
                    }}
                  >
                    <Linkedin className="h-3 w-3 mr-1" />
                    LinkedIn
                  </Button>
                )}
                {target.phoneNumber && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `tel:${target.phoneNumber}`;
                    }}
                  >
                    <Phone className="h-3 w-3 mr-1" />
                    Call
                  </Button>
                )}
              </div>

              {/* Next Action */}
              <div className="flex justify-between items-center">
                <Badge className={getActionColor(target.nextAction)}>
                  {getActionLabel(target.nextAction)}
                </Badge>
                {target.lastEngagement && (
                  <span className="text-xs text-gray-500 flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {new Date(target.lastEngagement).toLocaleDateString()}
                    </span>
                  </span>
                )}
              </div>

              {/* Data Quality */}
              <div className="mt-2">
                <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                  <span>Data Quality</span>
                  <span>{target.dataQualityScore}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      target.dataQualityScore >= 80
                        ? 'bg-green-600'
                        : target.dataQualityScore >= 60
                        ? 'bg-yellow-600'
                        : 'bg-red-600'
                    }`}
                    style={{ width: `${target.dataQualityScore}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {targets.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Target className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">No targets found</p>
            <p className="text-sm text-gray-500">
              Import contacts to start building your target list
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
