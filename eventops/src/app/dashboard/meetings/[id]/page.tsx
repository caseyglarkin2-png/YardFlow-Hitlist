'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Meeting {
  id: string;
  personId: string;
  scheduledAt: string;
  duration: number;
  location?: string;
  status: string;
  meetingType?: string;
  outcome?: string;
  nextSteps?: string;
  followUpDate?: string;
  dealStage?: string;
  notes?: string;
  people: {
    name: string;
    title?: string;
    email?: string;
    target_accounts: {
      name: string;
      icpScore?: number;
      dossier?: {
        companyOverview?: string;
        keyPainPoints?: string;
      };
    };
    insights?: {
      suggestedApproach?: string;
      roiOpportunity?: string;
    };
  };
}

export default function MeetingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [prepDoc, setPrepDoc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generatingPrep, setGeneratingPrep] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Meeting>>({});

  useEffect(() => {
    fetchMeeting();
  }, [params.id]);

  async function fetchMeeting() {
    try {
      const res = await fetch(`/api/meetings/${params.id}`);
      const data = await res.json();
      setMeeting(data);
      setFormData(data);
    } catch (error) {
      console.error('Error fetching meeting:', error);
    } finally {
      setLoading(false);
    }
  }

  async function generatePrep() {
    setGeneratingPrep(true);
    try {
      const res = await fetch(`/api/meetings/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-prep' }),
      });
      const data = await res.json();
      setPrepDoc(data.prepDocument);
    } catch (error) {
      console.error('Error generating prep:', error);
      alert('Failed to generate prep document');
    } finally {
      setGeneratingPrep(false);
    }
  }

  async function updateMeeting() {
    try {
      const res = await fetch(`/api/meetings/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      setMeeting(data);
      setEditing(false);
    } catch (error) {
      console.error('Error updating meeting:', error);
      alert('Failed to update meeting');
    }
  }

  async function deleteMeeting() {
    if (!confirm('Are you sure you want to delete this meeting?')) return;

    try {
      await fetch(`/api/meetings/${params.id}`, { method: 'DELETE' });
      router.push('/dashboard/meetings');
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert('Failed to delete meeting');
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!meeting) {
    return <div className="flex items-center justify-center min-h-screen">Meeting not found</div>;
  }

  const isPast = new Date(meeting.scheduledAt) < new Date();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-800 mb-4">
          ← Back to Meetings
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Meeting with {meeting.people.name}</h1>
            <p className="text-gray-600">
              {meeting.people.title} at {meeting.people.target_accounts.name}
            </p>
          </div>
          <div className="flex gap-2">
            {!editing && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={deleteMeeting}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meeting Details */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Meeting Details</h2>
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="NO_SHOW">No Show</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Scheduled Time</label>
                <input
                  type="datetime-local"
                  value={
                    formData.scheduledAt
                      ? new Date(formData.scheduledAt).toISOString().slice(0, 16)
                      : ''
                  }
                  onChange={(e) =>
                    setFormData({ ...formData, scheduledAt: new Date(e.target.value).toISOString() })
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Booth #123, Conference Room A, Zoom link..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Meeting Type</label>
                <select
                  value={formData.meetingType || ''}
                  onChange={(e) => setFormData({ ...formData, meetingType: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">Select type...</option>
                  <option value="INTRO">Introduction</option>
                  <option value="DEMO">Demo</option>
                  <option value="NEGOTIATION">Negotiation</option>
                  <option value="FOLLOW_UP">Follow-up</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={updateMeeting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setFormData(meeting);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium">{meeting.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Scheduled</p>
                <p className="font-medium">
                  {new Date(meeting.scheduledAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-medium">{meeting.duration} minutes</p>
              </div>
              {meeting.location && (
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{meeting.location}</p>
                </div>
              )}
              {meeting.meetingType && (
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{meeting.meetingType}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Contact Info */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">{meeting.people.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Title</p>
              <p className="font-medium">{meeting.people.title || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Company</p>
              <a
                href={`/dashboard/accounts/${meeting.people.account}`}
                className="font-medium text-blue-600 hover:underline"
              >
                {meeting.people.target_accounts.name}
              </a>
            </div>
            {meeting.people.email && (
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <a href={`mailto:${meeting.people.email}`} className="text-blue-600">
                  {meeting.people.email}
                </a>
              </div>
            )}
            <div className="pt-4">
              <button
                onClick={() => router.push(`/dashboard/people/${meeting.personId}`)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                View Full Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Meeting Prep */}
      {!isPast && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Meeting Preparation</h2>
            <button
              onClick={generatePrep}
              disabled={generatingPrep}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
            >
              {generatingPrep ? 'Generating...' : prepDoc ? 'Regenerate' : 'Generate Prep Doc'}
            </button>
          </div>
          {prepDoc ? (
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded">{prepDoc}</pre>
              <button
                onClick={() => window.print()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Print / Save as PDF
              </button>
            </div>
          ) : (
            <p className="text-gray-500">
              Generate an AI-powered prep document with talking points, ROI data, and discovery
              questions.
            </p>
          )}
        </div>
      )}

      {/* Post-Meeting Outcome */}
      {isPast && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Meeting Outcome</h2>
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Outcome</label>
                <select
                  value={formData.outcome || ''}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">Select outcome...</option>
                  <option value="Interested - Will Follow Up">Interested - Will Follow Up</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Needs More Info">Needs More Info</option>
                  <option value="Deal Opportunity">Deal Opportunity</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Next Steps</label>
                <textarea
                  value={formData.nextSteps || ''}
                  onChange={(e) => setFormData({ ...formData, nextSteps: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                  placeholder="Send pricing proposal, schedule demo, introduce to procurement team..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Follow-up Date</label>
                <input
                  type="date"
                  value={formData.followUpDate?.split('T')[0] || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      followUpDate: new Date(e.target.value).toISOString(),
                    })
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Deal Stage</label>
                <select
                  value={formData.dealStage || ''}
                  onChange={(e) => setFormData({ ...formData, dealStage: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">Select stage...</option>
                  <option value="Qualified Lead">Qualified Lead</option>
                  <option value="Discovery">Discovery</option>
                  <option value="Proposal">Proposal</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Closed Won">Closed Won</option>
                  <option value="Closed Lost">Closed Lost</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  rows={4}
                  placeholder="Meeting notes, key discussion points, concerns raised..."
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {meeting.outcome && (
                <div>
                  <p className="text-sm text-gray-500">Outcome</p>
                  <p className="font-medium">{meeting.outcome}</p>
                </div>
              )}
              {meeting.nextSteps && (
                <div>
                  <p className="text-sm text-gray-500">Next Steps</p>
                  <p className="font-medium">{meeting.nextSteps}</p>
                </div>
              )}
              {meeting.followUpDate && (
                <div>
                  <p className="text-sm text-gray-500">Follow-up Date</p>
                  <p className="font-medium">
                    {new Date(meeting.followUpDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {meeting.dealStage && (
                <div>
                  <p className="text-sm text-gray-500">Deal Stage</p>
                  <p className="font-medium">{meeting.dealStage}</p>
                </div>
              )}
              {meeting.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{meeting.notes}</p>
                </div>
              )}
              {!meeting.outcome && !meeting.notes && (
                <p className="text-gray-500 italic">
                  No outcome recorded yet. Click Edit to add meeting notes.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
