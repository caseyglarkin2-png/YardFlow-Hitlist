'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  Link as LinkIcon,
  FileText,
  Play,
  Music,
  Video,
  Trash2,
  ExternalLink,
  Search,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface TrainingContent {
  id: string;
  source: string;
  type: string;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  fileSize?: number;
  duration?: number;
  createdAt: string;
}

export default function TrainingPage() {
  const [content, setContent] = useState<TrainingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const { toast } = useToast();

  // Import dialogs state
  const [showDriveDialog, setShowDriveDialog] = useState(false);
  const [showYouTubeDialog, setShowYouTubeDialog] = useState(false);
  const [showHubSpotDialog, setShowHubSpotDialog] = useState(false);

  useEffect(() => {
    loadContent();
  }, []);

  async function loadContent() {
    try {
      setLoading(true);
      const res = await fetch('/api/training/content');
      const data = await res.json();
      setContent(data.content || []);
    } catch (error) {
      toast({ title: 'Failed to load content' });
    } finally {
      setLoading(false);
    }
  }

  const filteredContent = content.filter((item) => {
    if (selectedSource !== 'all' && item.source !== selectedSource) return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  function getContentIcon(type: string) {
    switch (type) {
      case 'video':
        return <Video className="h-5 w-5" />;
      case 'audio':
        return <Music className="h-5 w-5" />;
      case 'document':
        return <FileText className="h-5 w-5" />;
      default:
        return <LinkIcon className="h-5 w-5" />;
    }
  }

  function getSourceBadgeColor(source: string) {
    switch (source) {
      case 'drive':
        return 'bg-blue-100 text-blue-800';
      case 'youtube':
        return 'bg-red-100 text-red-800';
      case 'hubspot':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  async function deleteContent(id: string) {
    if (!confirm('Delete this content?')) return;

    try {
      await fetch(`/api/training/content/${id}`, { method: 'DELETE' });
      toast({ title: 'Content deleted' });
      loadContent();
    } catch (error) {
      toast({ title: 'Failed to delete' });
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Training Content</h1>
          <p className="text-gray-600 mt-1">
            Import training materials from Drive, YouTube, and HubSpot
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={showDriveDialog} onOpenChange={setShowDriveDialog}>
            <DialogTrigger asChild>
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                Import from Drive
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import from Google Drive</DialogTitle>
              </DialogHeader>
              <DriveImportDialog
                onSuccess={() => {
                  setShowDriveDialog(false);
                  loadContent();
                }}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={showYouTubeDialog} onOpenChange={setShowYouTubeDialog}>
            <DialogTrigger asChild>
              <Button>
                <Play className="mr-2 h-4 w-4" />
                Add YouTube
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import YouTube Video</DialogTitle>
              </DialogHeader>
              <YouTubeImportDialog
                onSuccess={() => {
                  setShowYouTubeDialog(false);
                  loadContent();
                }}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={showHubSpotDialog} onOpenChange={setShowHubSpotDialog}>
            <DialogTrigger asChild>
              <Button>
                <Music className="mr-2 h-4 w-4" />
                Import from HubSpot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import HubSpot Call Recordings</DialogTitle>
              </DialogHeader>
              <HubSpotImportDialog
                onSuccess={() => {
                  setShowHubSpotDialog(false);
                  loadContent();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <select
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          className="px-4 py-2 border rounded-md"
        >
          <option value="all">All Sources</option>
          <option value="drive">Google Drive</option>
          <option value="youtube">YouTube</option>
          <option value="hubspot">HubSpot</option>
        </select>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filteredContent.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No training content yet. Import from Drive, YouTube, or HubSpot to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContent.map((item) => (
            <Card key={item.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded">
                  {getContentIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold truncate" title={item.title}>
                      {item.title}
                    </h3>
                    <button
                      onClick={() => deleteContent(item.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getSourceBadgeColor(item.source)}>
                      {item.source}
                    </Badge>
                    {item.duration && (
                      <span className="text-xs text-gray-500">
                        {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                  >
                    View Content
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {item.thumbnailUrl && (
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="w-full h-32 object-cover rounded mt-3"
                />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Sub-components for import dialogs
function DriveImportDialog({ onSuccess }: { onSuccess: () => void }) {
  const [files, setFiles] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  async function loadFiles() {
    setLoading(true);
    try {
      const res = await fetch('/api/training/drive/list');
      const data = await res.json();
      setFiles(data.files || []);
    } catch (error) {
      toast({ title: 'Failed to load files' });
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    setLoading(true);
    try {
      // Get active event ID (you'll need to implement this)
      const eventId = 'your-event-id'; // TODO: Get from context/session

      const res = await fetch('/api/training/import/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: selected, eventId }),
      });

      const data = await res.json();
      toast({ title: `Imported ${data.count} files` });
      onSuccess();
    } catch (error) {
      toast({ title: 'Import failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="max-h-96 overflow-y-auto space-y-2">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No files found</div>
        ) : (
          files.map((file) => (
            <div key={file.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
              <Checkbox
                checked={selected.includes(file.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelected([...selected, file.id]);
                  } else {
                    setSelected(selected.filter((id) => id !== file.id));
                  }
                }}
              />
              <div className="flex-1">
                <div className="font-medium">{file.name}</div>
                <div className="text-sm text-gray-500">{file.mimeType}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onSuccess()}>
          Cancel
        </Button>
        <Button onClick={handleImport} disabled={selected.length === 0 || loading}>
          Import {selected.length} file{selected.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}

function YouTubeImportDialog({ onSuccess }: { onSuccess: () => void }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleImport() {
    if (!url) return;

    setLoading(true);
    try {
      const eventId = 'your-event-id'; // TODO: Get from context/session

      const res = await fetch('/api/training/import/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, eventId }),
      });

      if (!res.ok) throw new Error('Import failed');

      toast({ title: 'YouTube video imported' });
      onSuccess();
    } catch (error) {
      toast({ title: 'Failed to import video' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="https://youtube.com/watch?v=..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onSuccess()}>
          Cancel
        </Button>
        <Button onClick={handleImport} disabled={!url || loading}>
          Import
        </Button>
      </div>
    </div>
  );
}

function HubSpotImportDialog({ onSuccess }: { onSuccess: () => void }) {
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);

  async function handleImport() {
    setLoading(true);
    try {
      const eventId = 'your-event-id'; // TODO: Get from context/session

      const res = await fetch('/api/training/import/hubspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, limit }),
      });

      const data = await res.json();
      toast({ title: `Imported ${data.count} call recordings` });
      onSuccess();
    } catch (error) {
      toast({ title: 'Import failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Number of calls to import</label>
        <Input
          type="number"
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value))}
          min={1}
          max={100}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onSuccess()}>
          Cancel
        </Button>
        <Button onClick={handleImport} disabled={loading}>
          Import Recordings
        </Button>
      </div>
    </div>
  );
}
