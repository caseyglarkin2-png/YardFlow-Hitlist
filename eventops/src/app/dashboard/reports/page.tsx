"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Calendar, Building2, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function ReportsPage() {
  async function exportAllData(format: 'csv' | 'json') {
    try {
      const res = await fetch(`/api/export/full?format=${format}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EventOps_Full_Export_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed');
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          Generate custom reports, schedule deliveries, and export data
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Custom Report Builder */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <CardTitle>Custom Report Builder</CardTitle>
            </div>
            <CardDescription>
              Drag and drop widgets to create custom reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/reports/builder">
              <Button className="w-full">
                Build Custom Report
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Scheduled Reports */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              <CardTitle>Scheduled Reports</CardTitle>
            </div>
            <CardDescription>
              Set up automatic email delivery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/reports/scheduled">
              <Button className="w-full" variant="outline">
                Manage Schedules
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-purple-500" />
              <CardTitle>Data Warehouse Export</CardTitle>
            </div>
            <CardDescription>
              Download all your data for backup or migration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => exportAllData('csv')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export as CSV
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => exportAllData('json')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export as JSON
            </Button>
          </CardContent>
        </Card>

        {/* Quick Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Reports</CardTitle>
            <CardDescription>Pre-configured report templates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Button variant="ghost" className="w-full justify-start" size="sm">
              Performance Summary
            </Button>
            <Button variant="ghost" className="w-full justify-start" size="sm">
              Outreach Metrics
            </Button>
            <Button variant="ghost" className="w-full justify-start" size="sm">
              Meeting Pipeline
            </Button>
            <Button variant="ghost" className="w-full justify-start" size="sm">
              Team Activity
            </Button>
          </CardContent>
        </Card>

        {/* Report History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Reports</CardTitle>
            <CardDescription>Previously generated reports</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>No reports generated yet</p>
          </CardContent>
        </Card>

        {/* Help */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Need Help?</CardTitle>
            <CardDescription>Learn more about reporting</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Create custom layouts with the builder</p>
            <p>• Schedule daily, weekly, or monthly delivery</p>
            <p>• Export to CSV or JSON format</p>
            <p>• Share reports with your team</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
