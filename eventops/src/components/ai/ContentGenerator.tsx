'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Linkedin, Phone, Copy, Check } from 'lucide-react';

interface ContentGeneratorProps {
  onGenerate: (request: ContentRequest) => Promise<GeneratedContent>;
  defaultRecipient?: string;
  defaultCompany?: string;
}

interface ContentRequest {
  recipientName: string;
  companyName: string;
  channel: 'email' | 'linkedin' | 'phone';
  context?: {
    painPoints?: string[];
    recentNews?: string;
    manifestBooth?: string;
    productFocus?: string;
  };
  tone?: 'professional' | 'casual' | 'urgent' | 'friendly';
}

interface GeneratedContent {
  channel: string;
  subject?: string;
  body: string;
  cta: string;
  followUpSuggestions?: string[];
}

const channelIcons = {
  email: Mail,
  linkedin: Linkedin,
  phone: Phone,
};

export function ContentGenerator({
  onGenerate,
  defaultRecipient = '',
  defaultCompany = '',
}: ContentGeneratorProps) {
  const [recipientName, setRecipientName] = useState(defaultRecipient);
  const [companyName, setCompanyName] = useState(defaultCompany);
  const [channel, setChannel] = useState<'email' | 'linkedin' | 'phone'>('email');
  const [tone, setTone] = useState<'professional' | 'casual' | 'urgent' | 'friendly'>('professional');
  const [painPoints, setPainPoints] = useState('');
  const [recentNews, setRecentNews] = useState('');
  const [manifestBooth, setManifestBooth] = useState('Booth 247');
  const [productFocus, setProductFocus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!recipientName || !companyName) return;

    setIsGenerating(true);
    try {
      const request: ContentRequest = {
        recipientName,
        companyName,
        channel,
        tone,
        context: {
          painPoints: painPoints ? painPoints.split('\n').filter(Boolean) : undefined,
          recentNews: recentNews || undefined,
          manifestBooth: manifestBooth || undefined,
          productFocus: productFocus || undefined,
        },
      };

      const content = await onGenerate(request);
      setGeneratedContent(content);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedContent) return;

    let copyText = '';
    if (generatedContent.subject) {
      copyText += `Subject: ${generatedContent.subject}\n\n`;
    }
    copyText += `${generatedContent.body}\n\n${generatedContent.cta}`;

    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ChannelIcon = channelIcons[channel];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>Content Generator</CardTitle>
          <CardDescription>AI-powered outreach content with YardFlow brand voice</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Name</Label>
            <Input
              id="recipient"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="John Smith"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company Name</Label>
            <Input
              id="company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Waste Management"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
                <SelectTrigger id="channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="phone">Phone Script</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as any)}>
                <SelectTrigger id="tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pain-points">Pain Points (one per line)</Label>
            <Textarea
              id="pain-points"
              value={painPoints}
              onChange={(e) => setPainPoints(e.target.value)}
              placeholder="Route optimization challenges&#10;Manual dispatching&#10;Lack of real-time visibility"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recent-news">Recent News (optional)</Label>
            <Input
              id="recent-news"
              value={recentNews}
              onChange={(e) => setRecentNews(e.target.value)}
              placeholder="Recently acquired 3 new facilities"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="booth">Manifest Booth</Label>
              <Input
                id="booth"
                value={manifestBooth}
                onChange={(e) => setManifestBooth(e.target.value)}
                placeholder="Booth 247"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-focus">Product Focus</Label>
              <Input
                id="product-focus"
                value={productFocus}
                onChange={(e) => setProductFocus(e.target.value)}
                placeholder="Route optimization"
              />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!recipientName || !companyName || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ChannelIcon className="mr-2 h-4 w-4" />
                Generate Content
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Content */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ChannelIcon className="h-5 w-5" />
                Generated Content
              </CardTitle>
              <CardDescription>
                {generatedContent ? `${channel} message ready` : 'Generate content to preview'}
              </CardDescription>
            </div>
            {generatedContent && (
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {generatedContent ? (
            <div className="space-y-4">
              {generatedContent.subject && (
                <div className="space-y-2">
                  <Badge variant="outline">Subject</Badge>
                  <p className="text-sm font-medium p-3 bg-blue-50 rounded-lg border border-blue-200">
                    {generatedContent.subject}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Badge variant="outline">Message</Badge>
                <div className="text-sm p-4 bg-gray-50 rounded-lg border border-gray-200 whitespace-pre-wrap leading-relaxed">
                  {generatedContent.body}
                </div>
              </div>

              <div className="space-y-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Call to Action
                </Badge>
                <p className="text-sm font-medium p-3 bg-green-50 rounded-lg border border-green-200">
                  {generatedContent.cta}
                </p>
              </div>

              {generatedContent.followUpSuggestions && generatedContent.followUpSuggestions.length > 0 && (
                <div className="space-y-2">
                  <Badge variant="outline">Follow-up Suggestions</Badge>
                  <ul className="space-y-1 text-sm">
                    {generatedContent.followUpSuggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2 p-2 bg-purple-50 rounded border border-purple-100">
                        <span className="text-purple-600">•</span>
                        <span className="text-gray-700">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <ChannelIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Fill in the form and click "Generate Content"</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
