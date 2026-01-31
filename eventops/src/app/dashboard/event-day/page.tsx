'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WarRoomToggle } from '@/components/war-room-mode';

interface TodaysMeeting {
  id: string;
  scheduledAt: string;
  people: {
    name: string;
    title?: string;
    target_accounts: {
      name: string;
    };
  };
  location?: string;
  duration: number;
  status: string;
}

interface RecentOutreach {
  id: string;
  channel: string;
  status: string;
  people: {
    name: string;
    target_accounts: {
      name: string;
    };
  };
  createdAt: string;
}

export default function EventDayDashboard() {
  const router = useRouter();
  const [todaysMeetings, setTodaysMeetings] = useState<TodaysMeeting[]>([]);
  const [recentOutreach, setRecentOutreach] = useState<RecentOutreach[]>([]);
  const [stats, setStats] = useState({
    totalToday: 0,
    completed: 0,
    remaining: 0,
    responded: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);

  async function fetchDashboardData() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      // Fetch today's meetings
      const meetingsRes = await fetch(`/api/meetings?startDate=${startOfDay}&endDate=${endOfDay}`);
      const meetings = await meetingsRes.json();
      setTodaysMeetings(meetings);

      const completed = meetings.filter((m: TodaysMeeting) => m.status === 'COMPLETED').length;
      const remaining = meetings.filter(
        (m: TodaysMeeting) => m.status === 'SCHEDULED' && new Date(m.scheduledAt) > new Date()
      ).length;

      // Fetch recent outreach
      const outreachRes = await fetch('/api/outreach?limit=10&sortBy=createdAt&sortOrder=desc');
      const outreach = await outreachRes.json();
      setRecentOutreach(outreach.outreach || []);

      const responded =
        outreach.outreach?.filter((o: RecentOutreach) => o.status === 'RESPONDED').length || 0;

      setStats({
        totalToday: meetings.length,
        completed,
        remaining,
        responded,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function checkInMeeting(meetingId: string) {
    try {
      await fetch(`/api/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      fetchDashboardData();
    } catch (error) {
      console.error('Error checking in:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const upcomingMeetings = todaysMeetings.filter(
    (m) => m.status === 'SCHEDULED' && new Date(m.scheduledAt) > currentTime
  );
  const completedMeetings = todaysMeetings.filter((m) => m.status === 'COMPLETED');

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 xl:max-w-[1600px]">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Event Day Dashboard</h1>
          <p className="mt-1 text-gray-600">Real-time view of today&apos;s activities</p>
          <p className="mt-1 text-sm text-gray-500">
            Last updated: {currentTime.toLocaleTimeString()}
          </p>
        </div>
        <WarRoomToggle className="war-room-header" />
      </div>

      {/* Stats Overview */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-6">
          <p className="text-sm font-medium text-blue-800">Today&apos;s Meetings</p>
          <p className="text-3xl font-bold text-blue-900">{stats.totalToday}</p>
        </div>
        <div className="rounded-lg border-l-4 border-green-500 bg-green-50 p-6">
          <p className="text-sm font-medium text-green-800">Completed</p>
          <p className="text-3xl font-bold text-green-900">{stats.completed}</p>
        </div>
        <div className="rounded-lg border-l-4 border-orange-500 bg-orange-50 p-6">
          <p className="text-sm font-medium text-orange-800">Remaining</p>
          <p className="text-3xl font-bold text-orange-900">{stats.remaining}</p>
        </div>
        <div className="rounded-lg border-l-4 border-purple-500 bg-purple-50 p-6">
          <p className="text-sm font-medium text-purple-800">Responses Today</p>
          <p className="text-3xl font-bold text-purple-900">{stats.responded}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Meetings */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            Upcoming Meetings ({upcomingMeetings.length})
          </h2>
          {upcomingMeetings.length > 0 ? (
            <div className="space-y-3">
              {upcomingMeetings.map((meeting) => {
                const timeUntil = new Date(meeting.scheduledAt).getTime() - currentTime.getTime();
                const minutesUntil = Math.floor(timeUntil / 60000);

                return (
                  <div
                    key={meeting.id}
                    className={`rounded border-l-4 p-4 ${
                      minutesUntil <= 15 ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{meeting.people.name}</p>
                        <p className="truncate text-sm text-gray-600">
                          {meeting.people.title} at {meeting.people.target_accounts.name}
                        </p>
                        <p className="mt-1 text-sm">
                          {new Date(meeting.scheduledAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          • {meeting.duration} min
                        </p>
                        {meeting.location && (
                          <p className="text-sm text-gray-600">📍 {meeting.location}</p>
                        )}
                        {minutesUntil <= 15 && minutesUntil > 0 && (
                          <p className="mt-1 text-sm font-medium text-red-600">
                            Starting in {minutesUntil} minutes!
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/meetings/${meeting.id}`)}
                          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                        >
                          View
                        </button>
                        <button
                          onClick={() => checkInMeeting(meeting.id)}
                          className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                        >
                          Check In
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No upcoming meetings today</p>
          )}
        </div>

        {/* Completed Meetings */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            Completed Today ({completedMeetings.length})
          </h2>
          {completedMeetings.length > 0 ? (
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {completedMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="rounded border-l-4 border-green-500 bg-green-50 p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{meeting.people.name}</p>
                      <p className="truncate text-sm text-gray-600">
                        {meeting.people.target_accounts.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(meeting.scheduledAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/meetings/${meeting.id}`)}
                      className="rounded bg-gray-600 px-3 py-1 text-sm text-white hover:bg-gray-700"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No completed meetings yet today</p>
          )}
        </div>
      </div>

      {/* Recent Outreach */}
      <div className="mt-6 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold">Recent Outreach Activity</h2>
        {recentOutreach.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed">
              <thead>
                <tr className="border-b">
                  <th className="w-[25%] px-4 py-2 text-left">Contact</th>
                  <th className="w-[25%] px-4 py-2 text-left">Company</th>
                  <th className="w-[15%] px-4 py-2 text-left">Channel</th>
                  <th className="w-[15%] px-4 py-2 text-left">Status</th>
                  <th className="w-[20%] px-4 py-2 text-left">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentOutreach.slice(0, 10).map((outreach) => (
                  <tr key={outreach.id} className="border-b hover:bg-gray-50">
                    <td className="max-w-0 truncate px-4 py-2">{outreach.people.name}</td>
                    <td className="max-w-0 truncate px-4 py-2">
                      {outreach.people.target_accounts.name}
                    </td>
                    <td className="px-4 py-2">{outreach.channel}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          outreach.status === 'RESPONDED'
                            ? 'bg-green-100 text-green-800'
                            : outreach.status === 'SENT'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {outreach.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {new Date(outreach.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No recent outreach</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 rounded-lg bg-gray-50 p-6">
        <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push('/dashboard/meetings')}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            View All Meetings
          </button>
          <button
            onClick={() => router.push('/dashboard/outreach')}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            View All Outreach
          </button>
          <button
            onClick={() => router.push('/dashboard/analytics')}
            className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
          >
            View Analytics
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
          >
            Refresh Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
