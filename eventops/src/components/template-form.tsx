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
import { Checkbox } from "@/components/ui/checkbox";

type MessageTemplate = {
  id: string;
  name: string;
  description: string | null;
  channel: "EMAIL" | "LINKEDIN" | "PHONE";
  subject: string | null;
  template: string;
  isActive: boolean;
};

export function TemplateForm({ template }: { template?: MessageTemplate }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: template?.name || "",
    description: template?.description || "",
    channel: template?.channel || "EMAIL",
    subject: template?.subject || "",
    template: template?.template || "",
    isActive: template?.isActive !== false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = template
        ? `/api/templates/${template.id}`
        : "/api/templates";
      const method = template ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save template");

      router.push("/dashboard/templates");
      router.refresh();
    } catch (error) {
      console.error("Error saving template:", error);
      alert("Failed to save template");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Template Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="e.g., Executive Introduction"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description (optional)</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Brief description of when to use this template"
          />
        </div>

        <div>
          <Label htmlFor="channel">Channel</Label>
          <Select
            value={formData.channel}
            onValueChange={(value: "EMAIL" | "LINKEDIN" | "PHONE") =>
              setFormData({ ...formData, channel: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
              <SelectItem value="PHONE">Phone</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.channel === "EMAIL" && (
          <div>
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              placeholder="Use variables like {{company}} {{name}}"
            />
          </div>
        )}

        <div>
          <Label htmlFor="template">Message Template</Label>
          <Textarea
            id="template"
            value={formData.template}
            onChange={(e) =>
              setFormData({ ...formData, template: e.target.value })
            }
            placeholder="Hi {{name}},&#10;&#10;I noticed {{company}} is attending Manifest...&#10;&#10;Available variables: {{name}}, {{title}}, {{company}}, {{event}}, {{persona}}"
            rows={12}
            required
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Available variables: {"{"}{"{"} name {"}"}{"}"}, {"{"}{"{"}  title {"}"}{"}"}, {"{"}{"{"}  company {"}"}{"}"},
            {"{"}{"{"} event {"}"}{"}"}, {"{"}{"{"} persona {"}"}{"}"}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, isActive: checked === true })
            }
          />
          <Label htmlFor="isActive" className="cursor-pointer">
            Template is active
          </Label>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : template ? "Update Template" : "Create Template"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
