"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Send, Trash2 } from "lucide-react";

type OutreachData = {
  id: string;
  channel: "EMAIL" | "LINKEDIN" | "PHONE";
  status: string;
  subject: string | null;
  message: string;
  notes: string | null;
  people: {
    name: string;
    email: string | null;
    linkedin: string | null;
  };
};

export function OutreachEditor({ outreach }: { outreach: OutreachData }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    status: outreach.status,
    subject: outreach.subject || "",
    message: outreach.message,
    notes: outreach.notes || "",
  });

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/outreach/${outreach.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to update outreach");

      router.refresh();
      alert("Outreach updated successfully");
    } catch (error) {
      console.error("Error updating outreach:", error);
      alert("Failed to update outreach");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this outreach?")) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/outreach/${outreach.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete outreach");

      router.push("/dashboard/outreach");
      router.refresh();
    } catch (error) {
      console.error("Error deleting outreach:", error);
      alert("Failed to delete outreach");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkSent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/outreach/${outreach.id}/mark-sent`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to mark as sent");

      router.refresh();
      alert("Marked as sent!");
    } catch (error) {
      console.error("Error marking as sent:", error);
      alert("Failed to mark as sent");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-6 bg-blue-50">
        <div className="flex items-center gap-2 mb-2">
          {outreach.channel === "EMAIL" && <Mail className="h-5 w-5" />}
          {outreach.channel === "LINKEDIN" && <Send className="h-5 w-5" />}
          <span className="font-semibold">{outreach.channel}</span>
        </div>
        {outreach.people.email && (
          <p className="text-sm">To: {outreach.people.email}</p>
        )}
        {outreach.people.linkedin && (
          <p className="text-sm">LinkedIn: {outreach.people.linkedin}</p>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              setFormData({ ...formData, status: value })
            }
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="RESPONDED">Responded</SelectItem>
              <SelectItem value="BOUNCED">Bounced</SelectItem>
              <SelectItem value="NO_RESPONSE">No Response</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {outreach.channel === "EMAIL" && (
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
            />
          </div>
        )}

        <div>
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            value={formData.message}
            onChange={(e) =>
              setFormData({ ...formData, message: e.target.value })
            }
            rows={15}
            className="font-mono text-sm"
          />
        </div>

        <div>
          <Label htmlFor="notes">Internal Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            rows={4}
            placeholder="Add any internal notes or follow-up reminders..."
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleUpdate} disabled={isLoading}>
          Save Changes
        </Button>
        {formData.status === "DRAFT" && (
          <Button onClick={handleMarkSent} disabled={isLoading} variant="outline">
            <Send className="mr-2 h-4 w-4" />
            Mark as Sent
          </Button>
        )}
        <Button
          onClick={handleDelete}
          disabled={isLoading}
          variant="outline"
          className="ml-auto"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}
