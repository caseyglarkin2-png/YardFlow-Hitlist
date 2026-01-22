'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { UserPlus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  name?: string;
  email: string;
}

interface AssignDropdownProps {
  entityType: 'account' | 'person';
  entityId: string;
  currentAssignee?: User;
  onAssigned?: () => void;
}

export function AssignDropdown({
  entityType,
  entityId,
  currentAssignee,
  onAssigned,
}: AssignDropdownProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(
    currentAssignee?.id
  );
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/team')
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch((error) => console.error('Error fetching users:', error));
  }, []);

  const handleAssign = async (userId: string) => {
    setIsLoading(true);
    try {
      const endpoint =
        entityType === 'account'
          ? `/api/accounts/${entityId}/assign`
          : `/api/people/${entityId}/assign`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        setSelectedUserId(userId);
        const user = users.find((u) => u.id === userId);
        toast({
          title: 'Assigned successfully',
          description: `Assigned to ${user?.name || user?.email}`,
        });
        onAssigned?.();
      } else {
        throw new Error('Failed to assign');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassign = async () => {
    setIsLoading(true);
    try {
      const endpoint =
        entityType === 'account'
          ? `/api/accounts/${entityId}/assign`
          : `/api/people/${entityId}/assign`;

      const res = await fetch(endpoint, { method: 'DELETE' });

      if (res.ok) {
        setSelectedUserId(undefined);
        toast({
          title: 'Unassigned',
          description: 'Assignment removed successfully',
        });
        onAssigned?.();
      } else {
        throw new Error('Failed to unassign');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to unassign. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedUserId}
        onValueChange={handleAssign}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Assign to...">
            {selectedUserId ? (
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                {users.find((u) => u.id === selectedUserId)?.name ||
                  users.find((u) => u.id === selectedUserId)?.email}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <UserPlus className="h-4 w-4" />
                Unassigned
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name || user.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedUserId && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleUnassign}
          disabled={isLoading}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
