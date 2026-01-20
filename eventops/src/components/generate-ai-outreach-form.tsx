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
import { Loader2, Sparkles } from "lucide-react";

type Account = {
  id: string;
  name: string;
  icpScore: number | null;
  people: Array<{
    id: string;
    name: string;
    title: string | null;
    isExecOps: boolean;
    isOps: boolean;
    isProc: boolean;
    isSales: boolean;
    isTech: boolean;
    isNonOps: boolean;
  }>;
};

export function GenerateAIOutreachForm({
  accounts,
  eventId,
}: {
  accounts: Account[];
  eventId: string;
}) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [channel, setChannel] = useState<"EMAIL" | "LINKEDIN">("EMAIL");
  const [personaFilter, setPersonaFilter] = useState<string[]>([]);
  const [minIcpScore, setMinIcpScore] = useState<number>(50);
  const [generationStatus, setGenerationStatus] = useState<string>("");

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
    if (filteredPeople.length === 0) {
      alert("No people match your filters");
      return;
    }

    if (filteredPeople.length > 20) {
      if (!confirm(`This will generate ${filteredPeople.length} AI messages, which may take several minutes and use OpenAI API credits. Continue?`)) {
        return;
      }
    }

    setIsGenerating(true);
    setGenerationStatus("Initializing AI research and generation...");

    try {
      const response = await fetch("/api/outreach/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personIds: filteredPeople.map((p) => p.id),
          channel,
          eventId,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate outreach");

      const result = await response.json();

      setGenerationStatus(`✓ Generated ${result.created} personalized messages!`);
      
      setTimeout(() => {
        router.push("/dashboard/outreach");
        router.refresh();
      }, 1500);
    } catch (error) {
      console.error("Error generating outreach:", error);
      setGenerationStatus("");
      alert("Failed to generate outreach");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-6 bg-gradient-to-br from-blue-50 to-purple-50 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-lg">AI-Powered Outreach</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          For each selected person, we will:
        </p>
        <ul className="text-sm text-muted-foreground space-y-1 ml-4">
          <li>• Research their company using AI</li>
          <li>• Identify relevant pain points and industry context</li>
          <li>• Generate a personalized message (not template)</li>
          <li>• Reference specific company details naturally</li>
        </ul>
      </div>

      <div className="border rounded-lg p-6 space-y-4">
        <div>
          <Label htmlFor="channel">Channel</Label>
          <Select
            value={channel}
            onValueChange={(value: "EMAIL" | "LINKEDIN") => setChannel(value)}
          >
            <SelectTrigger id="channel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="LINKEDIN">LinkedIn Message</SelectItem>
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
              <SelectItem value="90">90+ (Top Tier)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg p-6 bg-blue-50">
        <h3 className="font-semibold mb-2">Preview</h3>
        <p className="text-sm text-muted-foreground">
          Will generate <span className="font-bold text-blue-700">{filteredPeople.length}</span>{" "}
          AI-powered {channel.toLowerCase()} messages
        </p>
        {personaFilter.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Filtered to: {personaFilter.map((p) => personas.find((per) => per.key === p)?.label).join(", ")}
          </p>
        )}
        {filteredPeople.length > 10 && (
          <p className="text-sm text-yellow-700 mt-2">
            ⚠️ Large batch - generation may take {Math.ceil(filteredPeople.length / 2)} minutes
          </p>
        )}
      </div>

      {generationStatus && (
        <div className="border rounded-lg p-4 bg-green-50 text-green-800">
          {generationStatus}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || filteredPeople.length === 0}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating AI Outreach...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate {filteredPeople.length} AI Messages
            </>
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
