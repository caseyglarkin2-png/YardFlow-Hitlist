"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Loader2 } from "lucide-react";

interface VoiceNotesProps {
  onTranscriptionComplete?: (text: string) => void;
  autoAppend?: boolean;
}

export function VoiceNotes({ onTranscriptionComplete, autoAppend = true }: VoiceNotesProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  async function processAudio(audioBlob: Blob) {
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      
      if (data.text) {
        if (autoAppend) {
          setTranscription(prev => prev + (prev ? '\n\n' : '') + data.text);
        } else {
          setTranscription(data.text);
        }
        
        if (onTranscriptionComplete) {
          onTranscriptionComplete(data.text);
        }
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      alert('Failed to transcribe audio');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Voice Notes
        </CardTitle>
        <CardDescription>
          Record voice notes during meetings - they'll be automatically transcribed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              disabled={isProcessing}
              variant="default"
              className="flex-1"
            >
              <Mic className="h-4 w-4 mr-2" />
              Start Recording
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              variant="destructive"
              className="flex-1 animate-pulse"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Recording
            </Button>
          )}
        </div>

        {isProcessing && (
          <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Transcribing audio...
          </div>
        )}

        {transcription && (
          <Textarea
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            placeholder="Transcribed notes will appear here..."
            rows={8}
          />
        )}

        {transcription && (
          <p className="text-xs text-muted-foreground">
            You can edit the transcribed text above before saving
          </p>
        )}
      </CardContent>
    </Card>
  );
}
