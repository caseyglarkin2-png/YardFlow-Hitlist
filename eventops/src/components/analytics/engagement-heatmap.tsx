"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HeatmapData {
  hour: number;
  day: number;
  count: number;
  rate: number;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function EngagementHeatmap() {
  const [data, setData] = useState<HeatmapData[]>([]);
  const [metric, setMetric] = useState<"opens" | "clicks" | "replies">("opens");
  const [persona, setPersona] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHeatmapData();
  }, [metric, persona]);

  async function loadHeatmapData() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics/heatmap?metric=${metric}&persona=${persona}`
      );
      const result = await res.json();
      setData(result.data || []);
    } catch (error) {
      console.error("Failed to load heatmap:", error);
    } finally {
      setLoading(false);
    }
  }

  const maxRate = Math.max(...data.map((d) => d.rate), 1);

  function getColor(rate: number): string {
    if (rate === 0) return "bg-gray-100";
    const intensity = rate / maxRate;
    
    if (intensity > 0.75) return "bg-green-600";
    if (intensity > 0.5) return "bg-green-500";
    if (intensity > 0.25) return "bg-green-400";
    return "bg-green-300";
  }

  function getCellData(day: number, hour: number): HeatmapData | undefined {
    return data.find((d) => d.day === day && d.hour === hour);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Engagement Heatmap</CardTitle>
            <CardDescription>
              When your audience is most engaged (by day and hour)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={metric} onValueChange={(v: any) => setMetric(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="opens">Opens</SelectItem>
                <SelectItem value="clicks">Clicks</SelectItem>
                <SelectItem value="replies">Replies</SelectItem>
              </SelectContent>
            </Select>

            <Select value={persona} onValueChange={setPersona}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Personas</SelectItem>
                <SelectItem value="EXEC_OPS">Exec Ops</SelectItem>
                <SelectItem value="SUPPLY_CHAIN">Supply Chain</SelectItem>
                <SelectItem value="IT_TECH">IT/Tech</SelectItem>
                <SelectItem value="PROCUREMENT">Procurement</SelectItem>
                <SelectItem value="FACILITIES">Facilities</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-xs font-medium">Day / Hour</th>
                  {HOURS.map((hour) => (
                    <th key={hour} className="p-1 text-center text-xs font-medium">
                      {hour}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, dayIndex) => (
                  <tr key={day}>
                    <td className="p-2 text-sm font-medium">{day}</td>
                    {HOURS.map((hour) => {
                      const cellData = getCellData(dayIndex, hour);
                      const rate = cellData?.rate || 0;
                      const count = cellData?.count || 0;

                      return (
                        <td
                          key={hour}
                          className="p-0.5"
                          title={`${day} ${hour}:00 - ${count} ${metric}, ${Math.round(rate)}% rate`}
                        >
                          <div
                            className={`h-8 w-8 rounded ${getColor(rate)} flex items-center justify-center text-xs font-medium hover:ring-2 hover:ring-primary cursor-pointer transition-all`}
                          >
                            {count > 0 && (
                              <span className="text-white text-[10px]">
                                {Math.round(rate)}%
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center gap-4 mt-6">
              <span className="text-sm font-medium">Low</span>
              <div className="flex gap-1">
                <div className="h-4 w-8 bg-gray-100 rounded"></div>
                <div className="h-4 w-8 bg-green-300 rounded"></div>
                <div className="h-4 w-8 bg-green-400 rounded"></div>
                <div className="h-4 w-8 bg-green-500 rounded"></div>
                <div className="h-4 w-8 bg-green-600 rounded"></div>
              </div>
              <span className="text-sm font-medium">High</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
