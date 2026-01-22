"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Users } from "lucide-react";

interface PresenceUser {
  userId: string;
  userName: string;
  page: string;
  lastSeen: Date;
}

export function PresenceIndicator() {
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [currentPageViewers, setCurrentPageViewers] = useState<PresenceUser[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    // Send heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: pathname }),
      });
    }, 30000);

    // Initial heartbeat
    fetch("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: pathname }),
    });

    // Cleanup on unmount
    return () => {
      clearInterval(heartbeat);
      fetch("/api/presence", { method: "DELETE" });
    };
  }, [pathname]);

  useEffect(() => {
    // Poll for presence updates every 10 seconds
    const interval = setInterval(fetchPresence, 10000);
    fetchPresence(); // Initial fetch

    return () => clearInterval(interval);
  }, [pathname]);

  async function fetchPresence() {
    try {
      const res = await fetch("/api/presence");
      const data = await res.json();
      setPresence(data.presence || []);

      // Filter for current page
      const viewers = (data.presence || []).filter(
        (p: PresenceUser) => p.page === pathname
      );
      setCurrentPageViewers(viewers);
    } catch (error) {
      console.error("Failed to fetch presence:", error);
    }
  }

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }

  const totalOnline = presence.length;
  const viewingThisPage = currentPageViewers.length;

  if (totalOnline === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {viewingThisPage > 0 && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {viewingThisPage} viewing
          </Badge>
        )}

        <div className="flex -space-x-2">
          {presence.slice(0, 5).map((user) => (
            <Tooltip key={user.userId}>
              <TooltipTrigger>
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {getInitials(user.userName)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{user.userName}</p>
                <p className="text-xs text-muted-foreground">
                  Viewing: {user.page.split("/").pop() || "dashboard"}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}

          {totalOnline > 5 && (
            <Tooltip>
              <TooltipTrigger>
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarFallback className="text-xs bg-muted">
                    +{totalOnline - 5}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{totalOnline - 5} more users online</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
