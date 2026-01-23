'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export function GoogleIntegrationCard({ user, onUpdate }: {
  user: any;
  onUpdate: () => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const handleConnect = () => {
    window.location.href = '/api/google/connect';
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google account? Synced data will be preserved but future syncs disabled.')) return;
    
    const res = await fetch('/api/google/disconnect', { method: 'POST' });
    if (res.ok) {
      toast({ title: 'Google account disconnected' });
      onUpdate();
    } else {
      toast({ title: 'Disconnect failed', variant: 'destructive' });
    }
  };

  const handleSyncCalendar = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/google/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: user.googleSyncDryRun }),
      });
      
      const data = await res.json();
      
      if (data.dryRun) {
        toast({
          title: `Dry-run complete`,
          description: `Would import ${data.imported}, update ${data.updated}, skip ${data.skipped}`,
        });
      } else {
        toast({
          title: 'Calendar synced',
          description: `Imported ${data.imported}, updated ${data.updated}`,
        });
      }
      
      onUpdate();
    } catch (error) {
      toast({ title: 'Sync failed', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const handleCheckReplies = async () => {
    try {
      const res = await fetch('/api/google/gmail/check-replies', { method: 'POST' });
      const data = await res.json();
      
      toast({
        title: 'Email check complete',
        description: `Checked ${data.checked} emails, found ${data.updated} replies`,
      });
      
      onUpdate();
    } catch (error) {
      toast({ title: 'Check failed', variant: 'destructive' });
    }
  };

  const handleImportContacts = async () => {
    const eventId = prompt('Enter Event ID to import contacts into:');
    if (!eventId) return;

    setImporting(true);
    try {
      const res = await fetch('/api/google/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, dryRun: user.googleSyncDryRun }),
      });
      
      const data = await res.json();
      
      if (data.dryRun) {
        toast({
          title: 'Dry-run complete',
          description: `Would import ${data.imported} contacts (${data.skipped} skipped)`,
        });
      } else {
        toast({
          title: 'Contacts imported',
          description: `Imported ${data.imported} contacts`,
        });
      }
      
      onUpdate();
    } catch (error) {
      toast({ title: 'Import failed', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const handleTogglePause = async () => {
    const res = await fetch('/api/google/sync/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: user.googleSyncPaused ? 'resume' : 'pause' }),
    });

    if (res.ok) {
      toast({
        title: user.googleSyncPaused ? 'Sync resumed' : 'Sync paused',
      });
      onUpdate();
    }
  };

  const handleToggleDryRun = async () => {
    const res = await fetch('/api/google/sync/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: user.googleSyncDryRun ? 'live' : 'dry-run' }),
    });

    if (res.ok) {
      toast({
        title: user.googleSyncDryRun ? 'Live mode enabled' : 'Dry-run mode enabled',
        description: user.googleSyncDryRun 
          ? 'Changes will now be saved to database'
          : 'Changes will be previewed only',
      });
      onUpdate();
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Google Workspace</h3>
          <p className="text-sm text-gray-600">
            Sync Calendar, Gmail, and Contacts
          </p>
        </div>
        {user?.googleSyncEnabled ? (
          <div className="flex gap-2">
            <Badge variant={user.googleSyncPaused ? "destructive" : "default"}>
              {user.googleSyncPaused ? 'Paused' : 'Connected'}
            </Badge>
            {user.googleSyncDryRun && (
              <Badge variant="secondary">Dry-run Mode</Badge>
            )}
          </div>
        ) : (
          <Badge variant="secondary">Not Connected</Badge>
        )}
      </div>

      {user?.googleSyncEnabled ? (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 space-y-1">
            <p>Last synced: {user.lastGoogleSync 
              ? new Date(user.lastGoogleSync).toLocaleString() 
              : 'Never'}</p>
            <p>Syncs: {user.googleSyncAuditLog?.length || 0} total</p>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-sync enabled</Label>
                <p className="text-xs text-gray-500">Hourly background sync</p>
              </div>
              <Switch
                checked={!user.googleSyncPaused}
                onCheckedChange={handleTogglePause}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Dry-run mode</Label>
                <p className="text-xs text-gray-500">Preview changes without saving</p>
              </div>
              <Switch
                checked={user.googleSyncDryRun}
                onCheckedChange={handleToggleDryRun}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button 
              onClick={handleSyncCalendar} 
              disabled={syncing}
              size="sm"
            >
              {syncing ? 'Syncing...' : 'Sync Calendar'}
            </Button>
            
            <Button 
              onClick={handleCheckReplies}
              size="sm"
              variant="outline"
            >
              Check Email Replies
            </Button>
            
            <Button 
              onClick={handleImportContacts}
              disabled={importing}
              size="sm"
              variant="outline"
            >
              {importing ? 'Importing...' : 'Import Contacts'}
            </Button>
            
            <Button 
              onClick={handleDisconnect}
              size="sm"
              variant="destructive"
            >
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={handleConnect} className="w-full">
          Connect Google Account
        </Button>
      )}
    </Card>
  );
}
