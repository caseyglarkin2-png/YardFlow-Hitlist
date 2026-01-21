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
  const router = useRouter();
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
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-1">
            Organize and track multi-touch outreach campaigns
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
          <p className="text-gray-600 mb-4">
            Get started by creating your first campaign to organize outreach efforts
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </div>
                  {campaign.description && (
                    <p className="text-gray-600 mb-3">{campaign.description}</p>
                  )}
                  <div className="flex gap-6 text-sm text-gray-500">
                    <div>
                      <span className="font-medium text-gray-700">{campaign._count.outreach}</span> outreach messages
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">{campaign._count.sequences}</span> sequences
                    </div>
                    {campaign.minIcpScore && (
                      <div>
                        Min ICP: <span className="font-medium text-gray-700">{campaign.minIcpScore}</span>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New Campaign</h2>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Top Tier Outreach - Q1 2026"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Campaign goals and strategy..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                              targetPersonas: formData.targetPersonas.filter(p => p !== persona.value),
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum ICP Score
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.minIcpScore}
                  onChange={(e) => setFormData({ ...formData, minIcpScore: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 75"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Goals
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <input
                      type="number"
                      placeholder="Meetings"
                      value={formData.goals.meetings}
                      onChange={(e) => setFormData({
                        ...formData,
                        goals: { ...formData.goals, meetings: e.target.value },
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <span className="text-xs text-gray-500">Meetings</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Emails"
                      value={formData.goals.emails}
                      onChange={(e) => setFormData({
                        ...formData,
                        goals: { ...formData.goals, emails: e.target.value },
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <span className="text-xs text-gray-500">Emails Sent</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Responses"
                      value={formData.goals.responses}
                      onChange={(e) => setFormData({
                        ...formData,
                        goals: { ...formData.goals, responses: e.target.value },
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <span className="text-xs text-gray-500">Responses</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
