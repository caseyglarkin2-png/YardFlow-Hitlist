"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar, Mail, Trash2, Clock, Plus } from "lucide-react";

interface Schedule {
  id: string;
  frequency: string;
  recipients: string[];
  reportType: string;
  nextRun: string;
}

export default function ScheduledReportsPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    frequency: 'weekly',
    recipients: '',
    reportType: 'performance-summary',
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  async function fetchSchedules() {
    const res = await fetch('/api/reports/schedule');
    const data = await res.json();
    setSchedules(data.schedules || []);
  }

  async function createSchedule() {
    try {
      const res = await fetch('/api/reports/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          recipients: formData.recipients.split(',').map(e => e.trim()),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSchedules([...schedules, data.schedule]);
        setIsCreating(false);
        setFormData({ frequency: 'weekly', recipients: '', reportType: 'performance-summary' });
      }
    } catch (error) {
      console.error('Failed to create schedule:', error);
      alert('Failed to create schedule');
    }
  }

  async function deleteSchedule(id: string) {
    if (!confirm('Delete this scheduled report?')) return;
    
    setSchedules(schedules.filter(s => s.id !== id));
    // In production: await fetch(`/api/reports/schedule/${id}`, { method: 'DELETE' });
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Scheduled Reports</h1>
          <p className="text-muted-foreground">
            Automatically email reports to your team
          </p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule New Report</DialogTitle>
              <DialogDescription>
                Configure automatic report delivery via email
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="report-type">Report Type</Label>
                <Select
                  value={formData.reportType}
                  onValueChange={(value) => setFormData({ ...formData, reportType: value })}
                >
                  <SelectTrigger id="report-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance-summary">Performance Summary</SelectItem>
                    <SelectItem value="outreach-metrics">Outreach Metrics</SelectItem>
                    <SelectItem value="meeting-pipeline">Meeting Pipeline</SelectItem>
                    <SelectItem value="team-activity">Team Activity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily (8am)</SelectItem>
                    <SelectItem value="weekly">Weekly (Monday 8am)</SelectItem>
                    <SelectItem value="monthly">Monthly (1st at 8am)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="recipients">Recipients (comma-separated emails)</Label>
                <Input
                  id="recipients"
                  type="text"
                  placeholder="team@company.com, manager@company.com"
                  value={formData.recipients}
                  onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separate multiple emails with commas
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button onClick={createSchedule} disabled={!formData.recipients}>
                Create Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground mb-4">No scheduled reports yet</p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Schedule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      {schedule.reportType.replace(/-/g, ' ')}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {schedule.recipients.join(', ')}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSchedule(schedule.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    {schedule.frequency}
                  </Badge>
                  <span className="text-muted-foreground">
                    Next run: {new Date(schedule.nextRun).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Reports are generated automatically based on your schedule</p>
          <p>• PDFs are attached to emails sent via SendGrid</p>
          <p>• Timezone: UTC (configure in settings)</p>
          <p>• Maximum recipients: 10 per schedule</p>
        </CardContent>
      </Card>
    </div>
  );
}
