'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TodaysMeeting {
  id: string;
  scheduledAt: string;
  person: {
    name: string;
    title?: string;
    account: {
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
  person: {
    name: string;
    account: {
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
      const meetingsRes = await fetch(
        `/api/meetings?startDate=${startOfDay}&endDate=${endOfDay}`
      );
      const meetings = await meetingsRes.json();
      setTodaysMeetings(meetings);

      const completed = meetings.filter((m: TodaysMeeting) => m.status === 'COMPLETED').length;
      const remaining = meetings.filter(
        (m: TodaysMeeting) =>
          m.status === 'SCHEDULED' && new Date(m.scheduledAt) > new Date()
      ).length;

      // Fetch recent outreach
      const outreachRes = await fetch('/api/outreach?limit=10&sortBy=createdAt&sortOrder=desc');
      const outreach = await outreachRes.json();
      setRecentOutreach(outreach.outreach || []);

      const responded = outreach.outreach?.filter(
        (o: RecentOutreach) => o.status === 'RESPONDED'
      ).length || 0;

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const upcomingMeetings = todaysMeetings.filter(
    (m) => m.status === 'SCHEDULED' && new Date(m.scheduledAt) > currentTime
  );
  const completedMeetings = todaysMeetings.filter((m) => m.status === 'COMPLETED');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Event Day Dashboard</h1>
        <p className="text-gray-600 mt-1">Real-time view of today's activities</p>
        <p className="text-sm text-gray-500 mt-1">
          Last updated: {currentTime.toLocaleTimeString()}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
          <p className="text-blue-800 text-sm font-medium">Today's Meetings</p>
          <p className="text-3xl font-bold text-blue-900">{stats.totalToday}</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
          <p className="text-green-800 text-sm font-medium">Completed</p>
          <p className="text-3xl font-bold text-green-900">{stats.completed}</p>
        </div>
        <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-500">
          <p className="text-orange-800 text-sm font-medium">Remaining</p>
          <p className="text-3xl font-bold text-orange-900">{stats.remaining}</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-500">
          <p className="text-purple-800 text-sm font-medium">Responses Today</p>
          <p className="text-3xl font-bold text-purple-900">{stats.responded}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Meetings */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
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
                    className={`p-4 rounded border-l-4 ${
                      minutesUntil <= 15
                        ? 'border-red-500 bg-red-50'
                        : 'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold">{meeting.person.name}</p>
                        <p className="text-sm text-gray-600">
                          {meeting.person.title} at {meeting.person.account.name}
                        </p>
                        <p className="text-sm mt-1">
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
                          <p className="text-sm text-red-600 font-medium mt-1">
                            Starting in {minutesUntil} minutes!
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/meetings/${meeting.id}`)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          View
                        </button>
                        <button
                          onClick={() => checkInMeeting(meeting.id)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
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
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            Completed Today ({completedMeetings.length})
          </h2>
          {completedMeetings.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {completedMeetings.map((meeting) => (
                <div key={meeting.id} className="p-3 rounded bg-green-50 border-l-4 border-green-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{meeting.person.name}</p>
                      <p className="text-sm text-gray-600">{meeting.person.account.name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(meeting.scheduledAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/meetings/${meeting.id}`)}
                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
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
      <div className="mt-6 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Recent Outreach Activity</h2>
        {recentOutreach.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Contact</th>
                  <th className="text-left py-2 px-4">Company</th>
                  <th className="text-left py-2 px-4">Channel</th>
                  <th className="text-left py-2 px-4">Status</th>
                  <th className="text-left py-2 px-4">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentOutreach.slice(0, 10).map((outreach) => (
                  <tr key={outreach.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{outreach.person.name}</td>
                    <td className="py-2 px-4">{outreach.person.account.name}</td>
                    <td className="py-2 px-4">{outreach.channel}</td>
                    <td className="py-2 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
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
                    <td className="py-2 px-4 text-sm text-gray-600">
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
      <div className="mt-6 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push('/dashboard/meetings')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            View All Meetings
          </button>
          <button
            onClick={() => router.push('/dashboard/outreach')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            View All Outreach
          </button>
          <button
            onClick={() => router.push('/dashboard/analytics')}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            View Analytics
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Refresh Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
