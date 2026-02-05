'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  targetPersonas: string | null;
  minIcpScore: number | null;
  goals: string | null;
  createdAt: string;
  _count: {
    outreach: number;
    sequences: number;
  };
}

export default function CampaignsPage() {
  const _router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetPersonas: [] as string[],
    minIcpScore: '',
    startDate: '',
    endDate: '',
    goals: { meetings: '', emails: '', responses: '' },
  });

  const personas = [
    { value: 'isExecOps', label: 'Exec/Ops' },
    { value: 'isOps', label: 'Ops' },
    { value: 'isProcurement', label: 'Procurement' },
    { value: 'isSales', label: 'Sales' },
    { value: 'isTech', label: 'Tech' },
    { value: 'isNonOps', label: 'Non-Ops' },
  ];

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          minIcpScore: formData.minIcpScore ? parseInt(formData.minIcpScore) : null,
          goals: {
            meetings: formData.goals.meetings ? parseInt(formData.goals.meetings) : null,
            emails: formData.goals.emails ? parseInt(formData.goals.emails) : null,
            responses: formData.goals.responses ? parseInt(formData.goals.responses) : null,
          },
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setFormData({
          name: '',
          description: '',
          targetPersonas: [],
          minIcpScore: '',
          startDate: '',
          endDate: '',
          goals: { meetings: '', emails: '', responses: '' },
        });
        fetchCampaigns();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign');
    }
  };

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

  if (isLoading) {
    return <div className="p-6">Loading campaigns...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="mt-1 text-gray-600">Organize and track multi-touch outreach campaigns</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Create Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <h3 className="mb-2 text-lg font-medium text-gray-900">No campaigns yet</h3>
          <p className="mb-4 text-gray-600">
            Get started by creating your first campaign to organize outreach efforts
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Create First Campaign
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/dashboard/campaigns/${campaign.id}`}
              className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${getStatusBadge(campaign.status)}`}
                    >
                      {campaign.status}
                    </span>
                  </div>
                  {campaign.description && (
                    <p className="mb-3 text-gray-600">{campaign.description}</p>
                  )}
                  <div className="flex gap-6 text-sm text-gray-500">
                    <div>
                      <span className="font-medium text-gray-700">{campaign._count.outreach}</span>{' '}
                      outreach messages
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">{campaign._count.sequences}</span>{' '}
                      sequences
                    </div>
                    {campaign.minIcpScore && (
                      <div>
                        Min ICP:{' '}
                        <span className="font-medium text-gray-700">{campaign.minIcpScore}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div>Created {new Date(campaign.createdAt).toLocaleDateString()}</div>
                  {campaign.startDate && (
                    <div className="mt-1">
                      Starts {new Date(campaign.startDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
            <h2 className="mb-4 text-xl font-bold">Create New Campaign</h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="e.g., Top Tier Outreach - Q1 2026"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  rows={3}
                  placeholder="Campaign goals and strategy..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Target Personas
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {personas.map((persona) => (
                    <label key={persona.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.targetPersonas.includes(persona.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              targetPersonas: [...formData.targetPersonas, persona.value],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              targetPersonas: formData.targetPersonas.filter(
                                (p) => p !== persona.value
                              ),
                            });
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{persona.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Minimum ICP Score
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.minIcpScore}
                  onChange={(e) => setFormData({ ...formData, minIcpScore: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="e.g., 75"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Campaign Goals
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <input
                      type="number"
                      placeholder="Meetings"
                      value={formData.goals.meetings}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          goals: { ...formData.goals, meetings: e.target.value },
                        })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <span className="text-xs text-gray-500">Meetings</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Emails"
                      value={formData.goals.emails}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          goals: { ...formData.goals, emails: e.target.value },
                        })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <span className="text-xs text-gray-500">Emails Sent</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Responses"
                      value={formData.goals.responses}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          goals: { ...formData.goals, responses: e.target.value },
                        })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <span className="text-xs text-gray-500">Responses</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
