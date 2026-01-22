"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Plus, Trash2, BarChart3, PieChart, TrendingUp, Users } from "lucide-react";

interface Widget {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: any;
}

const AVAILABLE_WIDGETS: Widget[] = [
  {
    id: "accounts-by-icp",
    type: "chart",
    title: "Accounts by ICP Score",
    description: "Bar chart showing account distribution",
    icon: BarChart3,
  },
  {
    id: "response-rate",
    type: "metric",
    title: "Response Rate",
    description: "Overall email response rate",
    icon: TrendingUp,
  },
  {
    id: "top-campaigns",
    type: "table",
    title: "Top Campaigns",
    description: "Best performing campaigns",
    icon: Users,
  },
  {
    id: "persona-breakdown",
    type: "chart",
    title: "Persona Breakdown",
    description: "Pie chart of contact personas",
    icon: PieChart,
  },
  {
    id: "meeting-funnel",
    type: "chart",
    title: "Meeting Funnel",
    description: "Conversion funnel visualization",
    icon: BarChart3,
  },
];

export default function ReportBuilderPage() {
  const [selectedWidgets, setSelectedWidgets] = useState<Widget[]>([]);
  const [reportName, setReportName] = useState("Custom Report");
  const [dateRange, setDateRange] = useState("last-30-days");

  function addWidget(widget: Widget) {
    if (!selectedWidgets.find(w => w.id === widget.id)) {
      setSelectedWidgets([...selectedWidgets, widget]);
    }
  }

  function removeWidget(widgetId: string) {
    setSelectedWidgets(selectedWidgets.filter(w => w.id !== widgetId));
  }

  async function generatePDF() {
    try {
      const res = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: 'custom',
          widgets: selectedWidgets.map(w => w.id),
          dateRange,
        }),
      });

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
      a.click();
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate report');
    }
  }

  async function saveReport() {
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reportName,
          widgets: selectedWidgets.map(w => w.id),
          dateRange,
        }),
      });

      if (res.ok) {
        alert('Report template saved!');
      }
    } catch (error) {
      console.error('Failed to save report:', error);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Custom Report Builder</h1>
          <p className="text-muted-foreground">
            Drag and drop widgets to build your perfect report
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-7-days">Last 7 Days</SelectItem>
              <SelectItem value="last-30-days">Last 30 Days</SelectItem>
              <SelectItem value="last-90-days">Last 90 Days</SelectItem>
              <SelectItem value="all-time">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={saveReport}>
            Save Template
          </Button>
          <Button onClick={generatePDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Available Widgets */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Available Widgets</CardTitle>
            <CardDescription>Click to add to report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {AVAILABLE_WIDGETS.map((widget) => {
              const Icon = widget.icon;
              const isAdded = selectedWidgets.some(w => w.id === widget.id);
              
              return (
                <Button
                  key={widget.id}
                  variant={isAdded ? "secondary" : "outline"}
                  className="w-full justify-start h-auto p-3"
                  onClick={() => addWidget(widget)}
                  disabled={isAdded}
                >
                  <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-sm">{widget.title}</div>
                    <div className="text-xs text-muted-foreground">{widget.description}</div>
                  </div>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* Report Canvas */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Report Canvas</CardTitle>
                <CardDescription>
                  {selectedWidgets.length} widget{selectedWidgets.length !== 1 ? 's' : ''} added
                </CardDescription>
              </div>
              {selectedWidgets.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedWidgets([])}
                >
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedWidgets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>Add widgets from the sidebar to build your report</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedWidgets.map((widget, index) => {
                  const Icon = widget.icon;
                  
                  return (
                    <Card key={widget.id} className="relative">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <CardTitle className="text-base">{widget.title}</CardTitle>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeWidget(widget.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-muted rounded h-32 flex items-center justify-center text-sm text-muted-foreground">
                          {widget.description}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {selectedWidgets.length > 0 && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Report Preview Info:</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Date Range: {dateRange.replace(/-/g, ' ')}</p>
                  <p>• Widgets: {selectedWidgets.map(w => w.title).join(', ')}</p>
                  <p>• Export format: PDF or HTML</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
