'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  campaignId: string | null;
  steps: Record<string, unknown>[] | unknown;
  createdAt: string;
  campaign?: { name: string };
  _count: { outreach: number };
}

export default function SequencesPage() {
  const _router = useRouter();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [campaigns, setCampaigns] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaignId: '',
    steps: [{ channel: 'LINKEDIN', delayDays: 0, templateId: null }],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [seqRes, campRes] = await Promise.all([
        fetch('/api/sequences'),
        fetch('/api/campaigns'),
      ]);
      const seqData = await seqRes.json();
      const campData = await campRes.json();
      setSequences(seqData.sequences || []);
      setCampaigns(campData.campaigns || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { channel: 'EMAIL', delayDays: 3, templateId: null }],
    });
  };

  const removeStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index),
    });
  };

  const updateStep = (index: number, field: string, value: string | number | null) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormData({ ...formData, steps: newSteps });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          campaignId: formData.campaignId || null,
          steps: formData.steps.map((s) => ({
            ...s,
            delayDays: parseInt(String(s.delayDays)),
          })),
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setFormData({
          name: '',
          description: '',
          campaignId: '',
          steps: [{ channel: 'LINKEDIN', delayDays: 0, templateId: null }],
        });
        fetchData();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating sequence:', error);
      alert('Failed to create sequence');
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading sequences...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sequences</h1>
          <p className="mt-1 text-gray-600">Multi-touch outreach sequences with automated timing</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Create Sequence
        </button>
      </div>

      {sequences.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <h3 className="mb-2 text-lg font-medium text-gray-900">No sequences yet</h3>
          <p className="mb-4 text-gray-600">
            Create a multi-step sequence to automate follow-up timing
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Create First Sequence
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {sequences.map((sequence) => (
            <Link
              key={sequence.id}
              href={`/dashboard/sequences/${sequence.id}`}
              className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{sequence.name}</h3>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        sequence.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {sequence.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {sequence.description && (
                    <p className="mb-3 text-gray-600">{sequence.description}</p>
                  )}
                  <div className="flex gap-6 text-sm text-gray-500">
                    <div>
                      <span className="font-medium text-gray-700">
                        {Array.isArray(sequence.steps) ? sequence.steps.length : 0}
                      </span>{' '}
                      steps
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">{sequence._count.outreach}</span>{' '}
                      messages
                    </div>
                    {sequence.campaign && (
                      <div>
                        Campaign:{' '}
                        <span className="font-medium text-gray-700">{sequence.campaign.name}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div>Created {new Date(sequence.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Sequence Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6">
            <h2 className="mb-4 text-xl font-bold">Create Multi-Touch Sequence</h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Sequence Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="e.g., Exec Outreach - 3 Touch"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  rows={2}
                  placeholder="LinkedIn intro, email follow-up, Manifest deep dive"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Campaign (Optional)
                </label>
                <select
                  value={formData.campaignId}
                  onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">No campaign</option>
                  {campaigns.map((camp) => (
                    <option key={camp.id} value={camp.id}>
                      {camp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Sequence Steps *
                  </label>
                  <button
                    type="button"
                    onClick={addStep}
                    className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200"
                  >
                    + Add Step
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.steps.map((step, index) => (
                    <div key={index} className="rounded-lg border border-gray-200 p-4">
                      <div className="mb-3 flex items-start justify-between">
                        <span className="text-sm font-medium text-gray-700">Step {index + 1}</span>
                        {formData.steps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStep(index)}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs text-gray-600">Channel</label>
                          <select
                            value={step.channel}
                            onChange={(e) => updateStep(index, 'channel', e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          >
                            <option value="LINKEDIN">LinkedIn</option>
                            <option value="EMAIL">Email</option>
                            <option value="MANIFEST">Manifest App</option>
                            <option value="PHONE">Phone</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-600">
                            Delay (days) {index === 0 ? '(0 = immediate)' : ''}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={step.delayDays}
                            onChange={(e) => updateStep(index, 'delayDays', e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  Delays are calculated from the previous step. Example: Step 1 (Day 0), Step 2 (Day
                  3), Step 3 (Day 7)
                </p>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
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
                  Create Sequence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
