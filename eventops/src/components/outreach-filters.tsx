"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function OutreachFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/dashboard/outreach?${params.toString()}`);
  };

  return (
    <div className="flex gap-4">
      <Select
        value={searchParams.get("status") || "all"}
        onValueChange={(value) => updateFilter("status", value)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="DRAFT">Draft</SelectItem>
          <SelectItem value="SENT">Sent</SelectItem>
          <SelectItem value="RESPONDED">Responded</SelectItem>
          <SelectItem value="BOUNCED">Bounced</SelectItem>
          <SelectItem value="NO_RESPONSE">No Response</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("channel") || "all"}
        onValueChange={(value) => updateFilter("channel", value)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Filter by channel" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Channels</SelectItem>
          <SelectItem value="EMAIL">Email</SelectItem>
          <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
          <SelectItem value="PHONE">Phone</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
