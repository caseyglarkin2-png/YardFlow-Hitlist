'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Meeting {
  id: string;
  personId: string;
  scheduledAt: string;
  duration: number;
  location: string;
  status: string;
  meetingType: string;
  outcome?: string;
  notes?: string;
  people: {
    name: string;
    title: string;
    target_accounts: {
      name: string;
      icpScore: number;
    };
  };
}

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('status', filter);
      }

      const res = await fetch(`/api/meetings?${params}`);
      const data = await res.json();
      setMeetings(data);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    NO_SHOW: 'bg-gray-100 text-gray-800',
  };

  const upcomingMeetings = meetings.filter(
    (m) => new Date(m.scheduledAt) > new Date() && m.status === 'SCHEDULED'
  );
  const pastMeetings = meetings.filter(
    (m) => new Date(m.scheduledAt) <= new Date() || m.status !== 'SCHEDULED'
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Meetings</h1>
          <p className="text-gray-600 mt-1">
            {upcomingMeetings.length} upcoming • {meetings.length} total
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Schedule Meeting
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('SCHEDULED')}
          className={`px-4 py-2 rounded ${
            filter === 'SCHEDULED'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Scheduled
        </button>
        <button
          onClick={() => setFilter('COMPLETED')}
          className={`px-4 py-2 rounded ${
            filter === 'COMPLETED'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setFilter('CANCELLED')}
          className={`px-4 py-2 rounded ${
            filter === 'CANCELLED'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Cancelled
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading meetings...</div>
      ) : (
        <>
          {/* Upcoming Meetings */}
          {upcomingMeetings.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Upcoming</h2>
              <div className="grid gap-4">
                {upcomingMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => router.push(`/dashboard/meetings/${meeting.id}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{meeting.people.name}</h3>
                        <p className="text-gray-600 text-sm">
                          {meeting.people.title} at {meeting.people.target_accounts.name}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded text-sm ${
                          statusColors[meeting.status]
                        }`}
                      >
                        {meeting.status}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Date</p>
                        <p className="font-medium">
                          {new Date(meeting.scheduledAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Time</p>
                        <p className="font-medium">
                          {new Date(meeting.scheduledAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Duration</p>
                        <p className="font-medium">{meeting.duration} min</p>
                      </div>
                    </div>
                    {meeting.location && (
                      <p className="mt-2 text-sm text-gray-600">
                        📍 {meeting.location}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past Meetings */}
          {pastMeetings.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Past</h2>
              <div className="grid gap-4">
                {pastMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="bg-gray-50 p-4 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => router.push(`/dashboard/meetings/${meeting.id}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{meeting.people.name}</h3>
                        <p className="text-gray-600 text-sm">
                          {meeting.people.title} at {meeting.people.target_accounts.name}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded text-sm ${
                          statusColors[meeting.status]
                        }`}
                      >
                        {meeting.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      {new Date(meeting.scheduledAt).toLocaleDateString()} at{' '}
                      {new Date(meeting.scheduledAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {meeting.outcome && (
                      <p className="mt-2 text-sm">
                        <span className="font-medium">Outcome:</span> {meeting.outcome}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {meetings.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No meetings scheduled yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Schedule Your First Meeting
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Meeting Modal - Simplified */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Schedule Meeting</h2>
            <p className="text-gray-600 mb-4">
              To schedule a meeting, navigate to a person&apos;s profile and use the &quot;Schedule Meeting&quot;
              button there.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/dashboard/people')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Go to People
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
