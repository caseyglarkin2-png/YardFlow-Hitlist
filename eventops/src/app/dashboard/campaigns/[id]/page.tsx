'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CampaignDetails {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  targetPersonas: string[] | null;
  minIcpScore: number | null;
  goals: {
    meetings?: number;
    emails?: number;
    responses?: number;
  } | null;
  createdAt: string;
  metrics: {
    total: number;
    draft: number;
    sent: number;
    opened: number;
    responded: number;
    responseRate: number;
  };
}

export default function CampaignDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    status: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchCampaign();
  }, [params.id]);

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/${params.id}`);
      const data = await res.json();
      setCampaign(data.campaign);
      setEditData({
        status: data.campaign.status,
        startDate: data.campaign.startDate || '',
        endDate: data.campaign.endDate || '',
      });
    } catch (error) {
      console.error('Error fetching campaign:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/campaigns/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editData.status,
          startDate: editData.startDate || null,
          endDate: editData.endDate || null,
        }),
      });

      if (res.ok) {
        setIsEditing(false);
        fetchCampaign();
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure? This will unlink all outreach from this campaign.')) return;

    try {
      const res = await fetch(`/api/campaigns/${params.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/dashboard/campaigns');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading campaign...</div>;
  }

  if (!campaign) {
    return <div className="p-6">Campaign not found</div>;
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      ACTIVE: 'bg-green-100 text-green-800',
      PAUSED: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      ARCHIVED: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const personaLabels: Record<string, string> = {
    isExecOps: 'Exec/Ops',
    isOps: 'Ops',
    isProcurement: 'Procurement',
    isSales: 'Sales',
    isTech: 'Tech',
    isNonOps: 'Non-Ops',
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/campaigns" className="text-blue-600 hover:text-blue-700 mb-2 inline-block">
          ← Back to Campaigns
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <span className={`px-3 py-1 text-sm rounded-full ${getStatusBadge(campaign.status)}`}>
                {campaign.status}
              </span>
            </div>
            {campaign.description && (
              <p className="text-gray-600">{campaign.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Edit Campaign</h2>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={editData.status}
                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={editData.startDate}
                  onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={editData.endDate}
                  onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metrics Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Total Outreach</div>
            <div className="text-2xl font-bold text-gray-900">{campaign.metrics.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Sent</div>
            <div className="text-2xl font-bold text-green-600">{campaign.metrics.sent}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Opened</div>
            <div className="text-2xl font-bold text-blue-600">{campaign.metrics.opened}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Responded</div>
            <div className="text-2xl font-bold text-purple-600">{campaign.metrics.responded}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Response Rate</div>
            <div className="text-2xl font-bold text-indigo-600">
              {campaign.metrics.responseRate.toFixed(1)}%
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Draft</div>
            <div className="text-2xl font-bold text-gray-500">{campaign.metrics.draft}</div>
          </div>
        </div>

        {/* Campaign Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Campaign Details</h3>
          <div className="space-y-3 text-sm">
            {campaign.targetPersonas && campaign.targetPersonas.length > 0 && (
              <div>
                <div className="text-gray-600 mb-1">Target Personas</div>
                <div className="flex flex-wrap gap-2">
                  {campaign.targetPersonas.map((p) => (
                    <span key={p} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {personaLabels[p] || p}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {campaign.minIcpScore && (
              <div>
                <div className="text-gray-600 mb-1">Min ICP Score</div>
                <div className="font-medium">{campaign.minIcpScore}</div>
              </div>
            )}
            {campaign.startDate && (
              <div>
                <div className="text-gray-600 mb-1">Start Date</div>
                <div className="font-medium">
                  {new Date(campaign.startDate).toLocaleDateString()}
                </div>
              </div>
            )}
            {campaign.endDate && (
              <div>
                <div className="text-gray-600 mb-1">End Date</div>
                <div className="font-medium">
                  {new Date(campaign.endDate).toLocaleDateString()}
                </div>
              </div>
            )}
            <div>
              <div className="text-gray-600 mb-1">Created</div>
              <div className="font-medium">
                {new Date(campaign.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Goals Progress */}
      {campaign.goals && Object.keys(campaign.goals).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Goal Progress</h3>
          <div className="space-y-4">
            {campaign.goals.meetings && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Meetings Booked</span>
                  <span className="font-medium">
                    {campaign.metrics.responded} / {campaign.goals.meetings}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min((campaign.metrics.responded / campaign.goals.meetings) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {campaign.goals.emails && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Emails Sent</span>
                  <span className="font-medium">
                    {campaign.metrics.sent} / {campaign.goals.emails}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min((campaign.metrics.sent / campaign.goals.emails) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {campaign.goals.responses && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Responses Received</span>
                  <span className="font-medium">
                    {campaign.metrics.responded} / {campaign.goals.responses}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min((campaign.metrics.responded / campaign.goals.responses) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="flex gap-3">
          <Link
            href={`/dashboard/outreach?campaign=${params.id}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            View Outreach
          </Link>
          <Link
            href={`/dashboard/outreach/new?campaign=${params.id}`}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Add Outreach
          </Link>
        </div>
      </div>
    </div>
  );
}
