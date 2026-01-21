'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SequenceStep {
  channel: string;
  delayDays: number;
  templateId?: string | null;
}

interface SequenceDetails {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  campaignId: string | null;
  steps: SequenceStep[];
  createdAt: string;
  campaign?: { name: string; id: string };
  _count: { outreach: number };
}

export default function SequenceDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [sequence, setSequence] = useState<SequenceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    isActive: true,
    steps: [] as SequenceStep[],
  });

  useEffect(() => {
    fetchSequence();
  }, [params.id]);

  const fetchSequence = async () => {
    try {
      const res = await fetch(`/api/sequences/${params.id}`);
      const data = await res.json();
      setSequence(data.sequence);
      setEditData({
        name: data.sequence.name,
        description: data.sequence.description || '',
        isActive: data.sequence.isActive,
        steps: data.sequence.steps || [],
      });
    } catch (error) {
      console.error('Error fetching sequence:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/sequences/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (res.ok) {
        setIsEditing(false);
        fetchSequence();
      }
    } catch (error) {
      console.error('Error updating sequence:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this sequence? Outreach will not be deleted.')) return;

    try {
      const res = await fetch(`/api/sequences/${params.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/dashboard/sequences');
      }
    } catch (error) {
      console.error('Error deleting sequence:', error);
    }
  };

  const addStep = () => {
    setEditData({
      ...editData,
      steps: [...editData.steps, { channel: 'EMAIL', delayDays: 3, templateId: null }],
    });
  };

  const removeStep = (index: number) => {
    setEditData({
      ...editData,
      steps: editData.steps.filter((_, i) => i !== index),
    });
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...editData.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setEditData({ ...editData, steps: newSteps });
  };

  if (isLoading) {
    return <div className="p-6">Loading sequence...</div>;
  }

  if (!sequence) {
    return <div className="p-6">Sequence not found</div>;
  }

  const channelIcons: Record<string, string> = {
    LINKEDIN: '🔗',
    EMAIL: '📧',
    MANIFEST: '📱',
    PHONE: '📞',
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/dashboard/sequences" className="text-blue-600 hover:text-blue-700 mb-2 inline-block">
          ← Back to Sequences
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{sequence.name}</h1>
              <span className={`px-3 py-1 text-sm rounded-full ${
                sequence.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {sequence.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {sequence.description && (
              <p className="text-gray-600">{sequence.description}</p>
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
          <h2 className="text-lg font-semibold mb-4">Edit Sequence</h2>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={2}
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={editData.isActive}
                onChange={(e) => setEditData({ ...editData, isActive: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active (can be used for new outreach)
              </label>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">Steps</label>
                <button
                  type="button"
                  onClick={addStep}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  + Add Step
                </button>
              </div>
              
              <div className="space-y-3">
                {editData.steps.map((step, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-medium text-sm text-gray-700">Step {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="text-red-600 text-sm hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Channel</label>
                        <select
                          value={step.channel}
                          onChange={(e) => updateStep(index, 'channel', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="LINKEDIN">LinkedIn</option>
                          <option value="EMAIL">Email</option>
                          <option value="MANIFEST">Manifest App</option>
                          <option value="PHONE">Phone</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Delay (days)</label>
                        <input
                          type="number"
                          min="0"
                          value={step.delayDays}
                          onChange={(e) => updateStep(index, 'delayDays', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
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

      {/* Sequence Timeline */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Sequence Timeline</h3>
        <div className="space-y-4">
          {sequence.steps.map((step, index) => (
            <div key={index} className="flex items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-lg">
                {channelIcons[step.channel] || '📋'}
              </div>
              <div className="ml-4 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Step {index + 1}: {step.channel}</span>
                  <span className="text-sm text-gray-500">
                    {step.delayDays === 0 ? 'Immediate' : `Day ${step.delayDays}`}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {step.delayDays === 0 
                    ? 'Sent immediately when sequence starts' 
                    : `Sent ${step.delayDays} days after previous step`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Total Steps</div>
          <div className="text-2xl font-bold text-gray-900">{sequence.steps.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Outreach Messages</div>
          <div className="text-2xl font-bold text-blue-600">{sequence._count.outreach}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Total Duration</div>
          <div className="text-2xl font-bold text-purple-600">
            {sequence.steps.reduce((sum, s) => sum + s.delayDays, 0)} days
          </div>
        </div>
      </div>

      {/* Campaign Link */}
      {sequence.campaign && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium mb-2">Part of Campaign</h3>
          <Link
            href={`/dashboard/campaigns/${sequence.campaign.id}`}
            className="text-blue-600 hover:text-blue-700"
          >
            {sequence.campaign.name} →
          </Link>
        </div>
      )}
    </div>
  );
}
