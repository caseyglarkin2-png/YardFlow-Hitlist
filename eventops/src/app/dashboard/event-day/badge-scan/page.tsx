"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X } from "lucide-react";

export default function BadgeScanPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [manualEdit, setManualEdit] = useState({
    name: "",
    title: "",
    company: "",
    email: "",
    phone: "",
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setScanning(true);
    } catch (error) {
      console.error('Failed to start camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  }

  function stopCamera() {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setScanning(false);
  }

  async function captureAndProcess() {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    // Convert to blob
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      // Send to OCR API
      const formData = new FormData();
      formData.append('image', blob);
      
      try {
        const res = await fetch('/api/ocr/badge', {
          method: 'POST',
          body: formData,
        });
        
        const data = await res.json();
        setExtractedData(data);
        setManualEdit({
          name: data.name || "",
          title: data.title || "",
          company: data.company || "",
          email: data.email || "",
          phone: data.phone || "",
        });
        
        stopCamera();
      } catch (error) {
        console.error('OCR failed:', error);
        alert('Failed to process badge. Please enter manually.');
      }
    });
  }

  async function saveContact() {
    try {
      // Create account if doesn't exist
      let accountId = null;
      if (manualEdit.company) {
        const accountRes = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: manualEdit.company,
            industry: 'Unknown',
          }),
        });
        const accountData = await accountRes.json();
        accountId = accountData.account?.id;
      }

      // Create person
      const personRes = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          name: manualEdit.name,
          title: manualEdit.title,
          email: manualEdit.email,
          phone: manualEdit.phone,
        }),
      });

      if (personRes.ok) {
        const personData = await personRes.json();
        router.push(`/dashboard/people/${personData.person.id}`);
      }
    } catch (error) {
      console.error('Failed to save contact:', error);
      alert('Failed to save contact');
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Badge Scanner</CardTitle>
          <CardDescription>
            Scan event badges to quickly capture contact information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!scanning && !extractedData && (
            <div className="text-center space-y-4">
              <div className="bg-muted rounded-lg p-12">
                <Camera className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Use your camera to scan an event badge
                </p>
                <Button onClick={startCamera} size="lg">
                  <Camera className="h-4 w-4 mr-2" />
                  Start Camera
                </Button>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>

              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard/people/new')}
                className="w-full"
              >
                Enter Manually
              </Button>
            </div>
          )}

          {scanning && (
            <div className="space-y-4">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-4 border-primary rounded-lg w-3/4 h-1/2 opacity-50"></div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={captureAndProcess} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" />
                  Capture & Process
                </Button>
                <Button variant="outline" onClick={stopCamera}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {extractedData && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-800">
                  Badge scanned successfully! Review and edit the information below.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={manualEdit.name}
                    onChange={(e) => setManualEdit({ ...manualEdit, name: e.target.value })}
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <Label>Title</Label>
                  <Input
                    value={manualEdit.title}
                    onChange={(e) => setManualEdit({ ...manualEdit, title: e.target.value })}
                    placeholder="Director of Operations"
                  />
                </div>

                <div>
                  <Label>Company *</Label>
                  <Input
                    value={manualEdit.company}
                    onChange={(e) => setManualEdit({ ...manualEdit, company: e.target.value })}
                    placeholder="ACME Corp"
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={manualEdit.email}
                    onChange={(e) => setManualEdit({ ...manualEdit, email: e.target.value })}
                    placeholder="john@acme.com"
                  />
                </div>

                <div className="col-span-2">
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    value={manualEdit.phone}
                    onChange={(e) => setManualEdit({ ...manualEdit, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={saveContact} 
                  className="flex-1"
                  disabled={!manualEdit.name || !manualEdit.company}
                >
                  Save Contact
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setExtractedData(null);
                    setManualEdit({ name: "", title: "", company: "", email: "", phone: "" });
                  }}
                >
                  Scan Another
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
