'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  actionUrl: string | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = useCallback(async () => {
    try {
      const url = filter === 'unread' ? '/api/notifications?unreadOnly=true' : '/api/notifications';
      const res = await fetch(url);
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function markAsRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }

  async function markAllAsRead() {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  async function deleteNotification(id: string) {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      fetchNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 border-red-500';
      case 'HIGH':
        return 'bg-orange-100 border-orange-500';
      case 'NORMAL':
        return 'bg-blue-100 border-blue-500';
      default:
        return 'bg-gray-100 border-gray-500';
    }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'SUCCESS':
        return '✅';
      case 'WARNING':
        return '⚠️';
      case 'ERROR':
        return '❌';
      case 'ENGAGEMENT':
        return '🎯';
      case 'MEETING':
        return '📅';
      case 'CAMPAIGN':
        return '📊';
      default:
        return 'ℹ️';
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="mt-1 text-gray-600">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`rounded px-4 py-2 ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`rounded px-4 py-2 ${
              filter === 'unread' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            Unread ({unreadCount})
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <div className="mb-4 text-6xl">🔔</div>
          <h2 className="mb-2 text-2xl font-semibold">No Notifications</h2>
          <p className="text-gray-600">You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-lg border-l-4 p-4 shadow ${
                !notification.read ? 'bg-white' : 'bg-gray-50'
              } ${getPriorityColor(notification.priority)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-2xl">{getTypeIcon(notification.type)}</span>
                    <h3 className={`text-lg ${!notification.read ? 'font-bold' : 'font-medium'}`}>
                      {notification.title}
                    </h3>
                    {!notification.read && (
                      <span className="rounded bg-blue-600 px-2 py-1 text-xs text-white">NEW</span>
                    )}
                  </div>
                  <p className="mb-2 text-gray-700">{notification.message}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="ml-4 flex gap-2">
                  {notification.actionUrl && (
                    <button
                      onClick={() => {
                        markAsRead(notification.id);
                        router.push(notification.actionUrl!);
                      }}
                      className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                    >
                      View
                    </button>
                  )}
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="rounded bg-gray-600 px-3 py-1 text-sm text-white hover:bg-gray-700"
                    >
                      Mark Read
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
