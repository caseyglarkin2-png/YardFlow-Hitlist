"use client";

import { Mail, Send, Phone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type OutreachItem = {
  id: string;
  channel: "EMAIL" | "LINKEDIN" | "PHONE";
  status: string;
  subject: string | null;
  message: string;
  createdAt: Date;
  person: {
    name: string;
    title: string | null;
    account: {
      name: string;
    };
  };
};

export function OutreachList({ outreach }: { outreach: OutreachItem[] }) {
  const channelIcons = {
    EMAIL: <Mail className="h-4 w-4" />,
    LINKEDIN: <Send className="h-4 w-4" />,
    PHONE: <Phone className="h-4 w-4" />,
  };

  const statusColors = {
    DRAFT: "bg-gray-100 text-gray-700",
    SENT: "bg-blue-100 text-blue-700",
    RESPONDED: "bg-green-100 text-green-700",
    BOUNCED: "bg-red-100 text-red-700",
    NO_RESPONSE: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="space-y-4">
      {outreach.map((item) => (
        <div
          key={item.id}
          className="border rounded-lg p-6 space-y-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold">
                  {item.person.name} @ {item.person.account.name}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700">
                  {channelIcons[item.channel]}
                  {item.channel}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    statusColors[item.status as keyof typeof statusColors]
                  }`}
                >
                  {item.status.replace("_", " ")}
                </span>
              </div>
              {item.person.title && (
                <p className="text-sm text-muted-foreground mb-3">
                  {item.person.title}
                </p>
              )}
              {item.subject && (
                <p className="text-sm font-medium mb-2">
                  Subject: {item.subject}
                </p>
              )}
              <div className="bg-gray-50 rounded p-3 text-sm whitespace-pre-wrap">
                {item.message.slice(0, 300)}
                {item.message.length > 300 && "..."}
              </div>
            </div>
            <div className="ml-4">
              <Link href={`/dashboard/outreach/${item.id}`}>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View
                </Button>
              </Link>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Created {new Date(item.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}
