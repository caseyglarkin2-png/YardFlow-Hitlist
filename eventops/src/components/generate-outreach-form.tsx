"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

type Template = {
  id: string;
  name: string;
  channel: string;
};

type Account = {
  id: string;
  name: string;
  icpScore: number | null;
  people: Array<{
    id: string;
    name: string;
    title: string | null;
    email: string | null;
    isExecOps: boolean;
    isOps: boolean;
    isProc: boolean;
    isSales: boolean;
    isTech: boolean;
    isNonOps: boolean;
  }>;
};

export function GenerateOutreachForm({
  templates,
  accounts,
  eventId,
}: {
  templates: Template[];
  accounts: Account[];
  eventId: string;
}) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [personaFilter, setPersonaFilter] = useState<string[]>([]);
  const [minIcpScore, setMinIcpScore] = useState<number>(0);

  const personas = [
    { key: "isExecOps", label: "Executive Ops" },
    { key: "isOps", label: "Operations" },
    { key: "isProc", label: "Procurement" },
    { key: "isSales", label: "Sales" },
    { key: "isTech", label: "Tech" },
    { key: "isNonOps", label: "Non-Ops" },
  ];

  const togglePersona = (persona: string) => {
    setPersonaFilter((prev) =>
      prev.includes(persona)
        ? prev.filter((p) => p !== persona)
        : [...prev, persona]
    );
  };

  const getFilteredPeople = () => {
    const filteredAccounts = accounts.filter(
      (account) => !account.icpScore || account.icpScore >= minIcpScore
    );

    const allPeople = filteredAccounts.flatMap((account) => account.people);

    if (personaFilter.length === 0) return allPeople;

    return allPeople.filter((person) =>
      personaFilter.some((persona) => person[persona as keyof typeof person])
    );
  };

  const filteredPeople = getFilteredPeople();

  const handleGenerate = async () => {
    if (!templateId) {
      alert("Please select a template");
      return;
    }

    if (filteredPeople.length === 0) {
      alert("No people match your filters");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/outreach/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          personIds: filteredPeople.map((p) => p.id),
          eventId,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate outreach");

      const result = await response.json();

      router.push("/dashboard/outreach");
      router.refresh();
    } catch (error) {
      console.error("Error generating outreach:", error);
      alert("Failed to generate outreach");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-6 space-y-4">
        <div>
          <Label htmlFor="template">Select Template</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger id="template">
              <SelectValue placeholder="Choose a message template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name} ({template.channel})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Filter by Persona</Label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {personas.map((persona) => (
              <div key={persona.key} className="flex items-center space-x-2">
                <Checkbox
                  id={persona.key}
                  checked={personaFilter.includes(persona.key)}
                  onCheckedChange={() => togglePersona(persona.key)}
                />
                <Label htmlFor={persona.key} className="cursor-pointer font-normal">
                  {persona.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="icpScore">Minimum ICP Score</Label>
          <Select
            value={minIcpScore.toString()}
            onValueChange={(value) => setMinIcpScore(Number(value))}
          >
            <SelectTrigger id="icpScore">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">All Accounts (0+)</SelectItem>
              <SelectItem value="25">25+</SelectItem>
              <SelectItem value="50">50+</SelectItem>
              <SelectItem value="75">75+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg p-6 bg-blue-50">
        <h3 className="font-semibold mb-2">Preview</h3>
        <p className="text-sm text-muted-foreground">
          This will generate <span className="font-bold text-blue-700">{filteredPeople.length}</span>{" "}
          outreach messages
        </p>
        {personaFilter.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Filtered to: {personaFilter.map((p) => personas.find((per) => per.key === p)?.label).join(", ")}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !templateId || filteredPeople.length === 0}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            `Generate ${filteredPeople.length} Messages`
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isGenerating}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
