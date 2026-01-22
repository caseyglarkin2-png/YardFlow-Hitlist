"use client";

import { useState } from "react";
import { Mail, Send, Phone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

type OutreachItem = {
  id: string;
  channel: "EMAIL" | "LINKEDIN" | "PHONE";
  status: string;
  subject: string | null;
  message: string;
  createdAt: Date;
  people: {
    name: string;
    title: string | null;
    target_accounts: {
      name: string;
    };
  };
};

export function OutreachList({ outreach }: { outreach: OutreachItem[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === outreach.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(outreach.map(o => o.id));
    }
  };

  const handleBulkUpdate = async (status: string) => {
    if (selectedIds.length === 0) return;
    
    setIsProcessing(true);
    try {
      const res = await fetch('/api/outreach/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, status }),
      });

      if (res.ok) {
        setSelectedIds([]);
        router.refresh();
      } else {
        alert('Failed to update outreach');
      }
    } catch (error) {
      console.error('Bulk update error:', error);
      alert('Failed to update outreach');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} outreach messages?`)) return;
    
    setIsProcessing(true);
    try {
      const res = await fetch('/api/outreach/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (res.ok) {
        setSelectedIds([]);
        router.refresh();
      } else {
        alert('Failed to delete outreach');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert('Failed to delete outreach');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-10 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-medium">{selectedIds.length} selected</span>
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              {showBulkActions ? 'Hide Actions' : 'Show Actions'}
            </button>
          </div>
          <button
            onClick={() => setSelectedIds([])}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Bulk Actions Dropdown */}
      {showBulkActions && selectedIds.length > 0 && (
        <div className="bg-white border rounded-lg p-4 space-y-3">
          <h3 className="font-medium mb-2">Bulk Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleBulkUpdate('SENT')}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
            >
              Mark as Sent
            </button>
            <button
              onClick={() => handleBulkUpdate('RESPONDED')}
              disabled={isProcessing}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
            >
              Mark as Responded
            </button>
            <button
              onClick={() => handleBulkUpdate('NO_RESPONSE')}
              disabled={isProcessing}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-300"
            >
              Mark as No Response
            </button>
            <button
              onClick={() => handleBulkUpdate('BOUNCED')}
              disabled={isProcessing}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300"
            >
              Mark as Bounced
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 disabled:bg-gray-300"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Select All Checkbox */}
      <div className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={selectedIds.length === outreach.length && outreach.length > 0}
          onChange={toggleAll}
          className="w-4 h-4"
        />
        <label className="text-gray-700">
          Select All ({outreach.length})
        </label>
      </div>

      {/* Outreach List */}
      {outreach.map((item) => (
        <div
          key={item.id}
          className="border rounded-lg p-6 space-y-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => toggleSelect(item.id)}
                className="mt-1 w-4 h-4"
              />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">
                    {item.people.name} @ {item.people.target_accounts.name}
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
                {item.people.title && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {item.people.title}
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
          <div className="text-xs text-muted-foreground ml-7">
            Created {new Date(item.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}
