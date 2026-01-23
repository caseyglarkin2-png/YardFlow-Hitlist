# Sprint 19: Training Content Management & Voice Model Integration

## Overview
Enable users to easily upload and manage training content from multiple sources (Google Drive, HubSpot, YouTube links) to train voice models and AI agents directly from the YardFlow UI.

## User Story
As a sales team lead, I want to import training materials from various sources (Drive, HubSpot, YouTube) so that I can quickly train AI voice agents with our company's sales methodology, call recordings, and best practices without manual file transfers.

## Core Features

### 1. Training Content Library (New Page)
**Route**: `/dashboard/training`

**UI Components**:
- Content library grid/list view
- Filter by source (Drive, HubSpot, YouTube, Manual Upload)
- Filter by content type (Video, Audio, Document, Link)
- Search functionality
- Bulk selection and tagging

**Actions**:
- Upload directly from device
- Import from Google Drive (leverages existing OAuth)
- Import from HubSpot (leverages existing integration)
- Add YouTube/external links
- Preview content
- Delete/archive
- Tag for specific training modules

### 2. Multi-Source Import System

#### Google Drive Integration
```typescript
// Reuse existing Google OAuth from Sprint 18
- List user's Drive files
- Filter by type (videos, audio, docs)
- Select multiple files
- Import metadata + download URLs
- Store in training_content table
```

#### HubSpot Integration
```typescript
// Extend existing HubSpot integration
- Import recorded calls
- Import sales collateral
- Import training documents
- Link to HubSpot objects (deals, contacts)
```

#### YouTube & External Links
```typescript
// Simple URL input with metadata extraction
- Paste YouTube URL
- Auto-extract title, thumbnail, duration
- Support playlists
- Validate URL accessibility
```

#### Direct Upload
```typescript
// Standard file upload
- Support: MP4, MP3, WAV, PDF, DOCX
- Max size: 100MB per file
- Batch upload support
- Progress indicators
```

### 3. Training Module Assignment

**Features**:
- Link content to specific voice training modules
- Create training "playlists"
- Assign to team members
- Track completion status

**UI**:
- Drag-and-drop to assign content to modules
- Visual workflow builder
- Training content recommendations based on module type

### 4. Content Processing Pipeline

```typescript
// Background jobs for content ingestion
interface TrainingContent {
  id: string;
  source: 'drive' | 'hubspot' | 'youtube' | 'upload' | 'link';
  type: 'video' | 'audio' | 'document' | 'link';
  title: string;
  url: string;
  downloadUrl?: string;
  metadata: {
    duration?: number;
    fileSize?: number;
    mimeType?: string;
    thumbnail?: string;
    sourceId?: string; // External ID from Drive/HubSpot
  };
  tags: string[];
  moduleIds: string[]; // Linked training modules
  status: 'pending' | 'processing' | 'ready' | 'error';
  processedAt?: Date;
  createdBy: string;
  createdAt: Date;
}
```

### 5. Share & Collaborate

**Features**:
- Generate shareable links to content collections
- Team-wide content sharing
- Permission controls (view/edit)
- Comments and annotations
- Version tracking

## Technical Implementation

### Database Schema (Prisma)

```prisma
model training_content {
  id           String   @id @default(uuid())
  eventId      String
  userId       String   // Creator
  source       String   // 'drive' | 'hubspot' | 'youtube' | 'upload' | 'link'
  type         String   // 'video' | 'audio' | 'document' | 'link'
  title        String
  description  String?
  url          String
  downloadUrl  String?
  thumbnailUrl String?
  
  // Metadata JSON
  metadata     Json     @default("{}")
  
  // File info
  fileSize     BigInt?
  duration     Int?     // seconds
  mimeType     String?
  
  // External refs
  sourceId     String?  // Drive file ID, HubSpot object ID, etc.
  sourceLink   String?  // Link back to source system
  
  // Organization
  tags         String[] @default([])
  status       String   @default("pending")
  
  // Timestamps
  processedAt  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  // Relations
  event        events   @relation(fields: [eventId], references: [id], onDelete: Cascade)
  creator      users    @relation(fields: [userId], references: [id])
  modules      training_module_content[]
  
  @@index([eventId])
  @@index([userId])
  @@index([source])
  @@index([status])
}

model training_module_content {
  id         String   @id @default(uuid())
  moduleId   String   // Link to voice training module
  contentId  String
  order      Int      @default(0)
  required   Boolean  @default(false)
  createdAt  DateTime @default(now())
  
  content    training_content @relation(fields: [contentId], references: [id], onDelete: Cascade)
  
  @@unique([moduleId, contentId])
  @@index([moduleId])
}

model training_shares {
  id         String   @id @default(uuid())
  contentIds String[] // Array of content IDs
  shareCode  String   @unique
  createdBy  String
  expiresAt  DateTime?
  viewCount  Int      @default(0)
  createdAt  DateTime @default(now())
  
  creator    users    @relation(fields: [createdBy], references: [id])
  
  @@index([shareCode])
}
```

### API Routes

```typescript
// Content Management
POST   /api/training/content              // Create content entry
GET    /api/training/content              // List all content
GET    /api/training/content/:id          // Get single content
PATCH  /api/training/content/:id          // Update content
DELETE /api/training/content/:id          // Delete content

// Import Sources
POST   /api/training/import/drive         // Import from Google Drive
POST   /api/training/import/hubspot       // Import from HubSpot
POST   /api/training/import/youtube       // Import YouTube link
POST   /api/training/import/upload        // Direct file upload

// Module Assignment
POST   /api/training/modules/:id/content  // Assign content to module
DELETE /api/training/modules/:id/content/:contentId

// Sharing
POST   /api/training/share                // Create share link
GET    /api/training/share/:code          // Access shared content
```

### Google Drive Import Service

```typescript
// lib/training/drive-importer.ts
import { google } from 'googleapis';
import { getGoogleClient } from '@/lib/google/auth';

export async function importFromDrive(
  userId: string,
  eventId: string,
  fileIds: string[]
): Promise<TrainingContent[]> {
  const auth = await getGoogleClient(userId);
  const drive = google.drive({ version: 'v3', auth });
  
  const imported = [];
  
  for (const fileId of fileIds) {
    const file = await drive.files.get({
      fileId,
      fields: 'id,name,mimeType,size,thumbnailLink,webViewLink,webContentLink',
    });
    
    const content = await prisma.training_content.create({
      data: {
        id: crypto.randomUUID(),
        eventId,
        userId,
        source: 'drive',
        type: getContentType(file.data.mimeType),
        title: file.data.name,
        url: file.data.webViewLink,
        downloadUrl: file.data.webContentLink,
        thumbnailUrl: file.data.thumbnailLink,
        fileSize: file.data.size ? BigInt(file.data.size) : null,
        mimeType: file.data.mimeType,
        sourceId: fileId,
        sourceLink: file.data.webViewLink,
        status: 'ready',
        processedAt: new Date(),
      },
    });
    
    imported.push(content);
  }
  
  return imported;
}
```

### YouTube Import Service

```typescript
// lib/training/youtube-importer.ts
export async function importYouTubeVideo(
  userId: string,
  eventId: string,
  url: string
): Promise<TrainingContent> {
  const videoId = extractYouTubeId(url);
  
  // Fetch metadata using YouTube Data API (or oEmbed)
  const metadata = await fetch(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
  ).then(r => r.json());
  
  return await prisma.training_content.create({
    data: {
      id: crypto.randomUUID(),
      eventId,
      userId,
      source: 'youtube',
      type: 'video',
      title: metadata.title,
      url: url,
      thumbnailUrl: metadata.thumbnail_url,
      sourceId: videoId,
      metadata: {
        author: metadata.author_name,
        authorUrl: metadata.author_url,
      },
      status: 'ready',
      processedAt: new Date(),
    },
  });
}
```

### HubSpot Import Service

```typescript
// lib/training/hubspot-importer.ts
export async function importHubSpotCalls(
  userId: string,
  eventId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    ownerId?: string;
  }
): Promise<TrainingContent[]> {
  const hubspot = await getHubSpotClient();
  
  // Fetch call recordings from HubSpot Engagements API
  const calls = await hubspot.engagements.getPage({
    associations: ['calls'],
    // Filter logic
  });
  
  const imported = [];
  
  for (const call of calls.results) {
    if (call.properties.hs_call_recording_url) {
      const content = await prisma.training_content.create({
        data: {
          id: crypto.randomUUID(),
          eventId,
          userId,
          source: 'hubspot',
          type: 'audio',
          title: call.properties.hs_call_title || 'HubSpot Call Recording',
          url: call.properties.hs_call_recording_url,
          duration: call.properties.hs_call_duration,
          sourceId: call.id,
          sourceLink: `https://app.hubspot.com/contacts/${call.id}`,
          metadata: {
            callOutcome: call.properties.hs_call_disposition,
            callDuration: call.properties.hs_call_duration,
          },
          status: 'ready',
          processedAt: new Date(),
        },
      });
      
      imported.push(content);
    }
  }
  
  return imported;
}
```

## UI Components

### Training Content Library Page

```tsx
// app/dashboard/training/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Link, Play, FileText } from 'lucide-react';
import { GoogleDriveImportDialog } from '@/components/training/google-drive-import';
import { HubSpotImportDialog } from '@/components/training/hubspot-import';
import { YouTubeImportDialog } from '@/components/training/youtube-import';
import { ContentGrid } from '@/components/training/content-grid';

export default function TrainingContentPage() {
  const [showDriveImport, setShowDriveImport] = useState(false);
  const [showHubSpotImport, setShowHubSpotImport] = useState(false);
  const [showYouTubeImport, setShowYouTubeImport] = useState(false);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Training Content</h1>
        
        <div className="flex gap-2">
          <Button onClick={() => setShowDriveImport(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Import from Drive
          </Button>
          
          <Button onClick={() => setShowHubSpotImport(true)}>
            <Play className="mr-2 h-4 w-4" />
            Import from HubSpot
          </Button>
          
          <Button onClick={() => setShowYouTubeImport(true)}>
            <Link className="mr-2 h-4 w-4" />
            Add YouTube Link
          </Button>
          
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </Button>
        </div>
      </div>

      <ContentGrid />

      <GoogleDriveImportDialog 
        open={showDriveImport} 
        onClose={() => setShowDriveImport(false)} 
      />
      
      <HubSpotImportDialog 
        open={showHubSpotImport} 
        onClose={() => setShowHubSpotImport(false)} 
      />
      
      <YouTubeImportDialog 
        open={showYouTubeImport} 
        onClose={() => setShowYouTubeImport(false)} 
      />
    </div>
  );
}
```

### Google Drive Import Dialog

```tsx
// components/training/google-drive-import.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export function GoogleDriveImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadDriveFiles();
    }
  }, [open]);

  async function loadDriveFiles() {
    setLoading(true);
    try {
      const res = await fetch('/api/training/drive/list');
      const data = await res.json();
      setFiles(data.files);
    } catch (error) {
      toast.error('Failed to load Drive files');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    setLoading(true);
    try {
      const res = await fetch('/api/training/import/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: selected }),
      });
      
      const data = await res.json();
      toast.success(`Imported ${data.imported.length} files`);
      onClose();
    } catch (error) {
      toast.error('Import failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import from Google Drive</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {files.map((file: any) => (
            <div key={file.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
              <Checkbox
                checked={selected.includes(file.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelected([...selected, file.id]);
                  } else {
                    setSelected(selected.filter(id => id !== file.id));
                  }
                }}
              />
              <div className="flex-1">
                <div className="font-medium">{file.name}</div>
                <div className="text-sm text-gray-500">{file.mimeType}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={selected.length === 0 || loading}>
            Import {selected.length} file{selected.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## Code Reuse from sales-agent Repo

**Identified Components to Port**:
1. File upload handler with progress tracking
2. YouTube metadata extraction
3. Content preview components
4. Training module assignment UI
5. Share link generation logic

**Integration Points**:
- Leverage existing Google OAuth (Sprint 18)
- Use existing HubSpot integration
- Extend current activity logging for training content usage
- Link to AI sentiment/scoring for call analysis

## Success Metrics

- **Import Speed**: < 5 seconds for Drive/HubSpot file import
- **Upload Limit**: Support up to 50 files in batch upload
- **Content Discovery**: Users find relevant training in < 30 seconds
- **Adoption**: 80% of team uploads training content within first week

## Tasks Breakdown

### Phase 1: Core Infrastructure (3-4 hours)
- [ ] Create Prisma schema for `training_content`, `training_module_content`, `training_shares`
- [ ] Run migrations
- [ ] Create base API routes
- [ ] Set up file upload handling

### Phase 2: Google Drive Integration (2-3 hours)
- [ ] Build Drive file picker component
- [ ] Implement Drive import API
- [ ] Add Drive file metadata extraction
- [ ] Test with various file types

### Phase 3: YouTube & Links (1-2 hours)
- [ ] YouTube URL parser
- [ ] Metadata extraction (title, thumbnail, duration)
- [ ] Manual link input UI
- [ ] URL validation

### Phase 4: HubSpot Integration (2-3 hours)
- [ ] HubSpot call recording import
- [ ] Sales collateral import
- [ ] Link HubSpot objects to content
- [ ] Test with real HubSpot data

### Phase 5: UI & UX (3-4 hours)
- [ ] Training content library page
- [ ] Content grid/list views
- [ ] Filter and search
- [ ] Content preview modal
- [ ] Bulk actions

### Phase 6: Module Assignment (2 hours)
- [ ] Drag-and-drop content assignment
- [ ] Module content ordering
- [ ] Assignment UI in training modules
- [ ] Link tracking

### Phase 7: Sharing (1-2 hours)
- [ ] Share link generation
- [ ] Public share page
- [ ] Permission controls
- [ ] Analytics tracking

**Total Estimated Time**: 14-20 hours

## Dependencies

- ✅ Google OAuth (Sprint 18 - Complete)
- ✅ HubSpot Integration (Existing)
- ⏳ Voice Training Module API (if not yet built)
- ⏳ File storage solution (S3/Vercel Blob/etc.)

## Future Enhancements (Sprint 20+)

- Auto-transcription of audio/video content
- AI-powered content recommendations
- Content analytics (view count, completion rate)
- Automated content tagging using AI
- Integration with LMS platforms
- Mobile app support for content consumption
- Offline content download
- Content versioning and change tracking

---

**Ready to implement**: Pending Sprint 18 deployment success and user approval.
