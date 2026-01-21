'use client';

import { useState, useEffect } from 'react';

interface Activity {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: any;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface UserPresence {
  userId: string;
  page: string | null;
  status: string;
  lastSeen: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [filter, setFilter] = useState<{
    entityType?: string;
    userId?: string;
  }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
    loadActiveUsers();

    // Poll for updates every 10 seconds
    const interval = setInterval(() => {
      loadActivities();
      loadActiveUsers();
    }, 10000);

    return () => clearInterval(interval);
  }, [filter]);

  const loadActivities = async () => {
    const params = new URLSearchParams();
    if (filter.entityType) params.set('entityType', filter.entityType);
    if (filter.userId) params.set('userId', filter.userId);

    const response = await fetch(`/api/activity?${params}`);
    if (response.ok) {
      const data = await response.json();
      setActivities(data);
    }
    setLoading(false);
  };

  const loadActiveUsers = async () => {
    const response = await fetch('/api/presence');
    if (response.ok) {
      const data = await response.json();
      setActiveUsers(data);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'text-green-600';
    if (action.includes('update') || action.includes('edit')) return 'text-blue-600';
    if (action.includes('delete')) return 'text-red-600';
    return 'text-gray-600';
  };

  const getActionIcon = (action: string) => {
    if (action.includes('create')) return '➕';
    if (action.includes('update') || action.includes('edit')) return '✏️';
    if (action.includes('delete')) return '🗑️';
    if (action.includes('view')) return '👁️';
    if (action.includes('email')) return '📧';
    if (action.includes('meeting')) return '📅';
    return '📝';
  };

  const formatTimeAgo = (dateString: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Team Activity</h1>
        <p className="text-gray-600">Real-time activity feed and user presence</p>
      </div>

      {/* Active Users */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Active Now ({activeUsers.length})</h2>
        <div className="flex flex-wrap gap-3">
          {activeUsers.map((presence) => (
            <div
              key={presence.userId}
              className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg"
            >
              <div className="relative">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {presence.user.name?.charAt(0) || presence.user.email?.charAt(0) || 'U'}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${getStatusColor(presence.status)} rounded-full border-2 border-white`} />
              </div>
              <div>
                <div className="text-sm font-medium">
                  {presence.user.name || presence.user.email}
                </div>
                <div className="text-xs text-gray-500">
                  {presence.page || 'Dashboard'} • {formatTimeAgo(presence.lastSeen)}
                </div>
              </div>
            </div>
          ))}
          {activeUsers.length === 0 && (
            <p className="text-gray-500 text-sm">No active users</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entity Type
            </label>
            <select
              value={filter.entityType || ''}
              onChange={(e) => setFilter({ ...filter, entityType: e.target.value || undefined })}
              className="border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="">All Types</option>
              <option value="account">Accounts</option>
              <option value="person">People</option>
              <option value="outreach">Outreach</option>
              <option value="campaign">Campaigns</option>
              <option value="meeting">Meetings</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User
            </label>
            <select
              value={filter.userId || ''}
              onChange={(e) => setFilter({ ...filter, userId: e.target.value || undefined })}
              className="border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="">All Users</option>
              {activeUsers.map((presence) => (
                <option key={presence.userId} value={presence.userId}>
                  {presence.user.name || presence.user.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Activity Feed</h2>
        </div>
        <div className="divide-y max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading activities...</div>
          ) : activities.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No activities found</div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{getActionIcon(activity.action)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {activity.user.name || activity.user.email}
                      </span>
                      <span className={`text-sm ${getActionColor(activity.action)}`}>
                        {activity.action}
                      </span>
                      <span className="text-sm text-gray-600">
                        {activity.entityType}
                      </span>
                      {activity.entityId && (
                        <span className="text-xs text-gray-500 font-mono">
                          #{activity.entityId.slice(0, 8)}
                        </span>
                      )}
                    </div>
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="text-sm text-gray-600 mb-1">
                        {Object.entries(activity.metadata).map(([key, value]) => (
                          <span key={key} className="mr-3">
                            <span className="font-medium">{key}:</span> {String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      {formatTimeAgo(activity.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
