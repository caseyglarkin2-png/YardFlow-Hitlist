'use client';

import { useEffect, useState } from 'react';

interface Workflow {
  id: string;
  name: string;
  trigger: string;
  conditions: string;
  actions: string;
  enabled: boolean;
  createdAt: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  async function fetchWorkflows() {
    try {
      const res = await fetch('/api/workflows');
      const data = await res.json();
      setWorkflows(data.workflows || []);
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleWorkflow(id: string, enabled: boolean) {
    try {
      await fetch(`/api/workflows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      fetchWorkflows();
    } catch (error) {
      console.error('Error toggling workflow:', error);
    }
  }

  async function executeWorkflow(id: string) {
    try {
      const res = await fetch(`/api/workflows/${id}/execute`, { method: 'POST' });
      const data = await res.json();
      alert(`Workflow executed: ${data.executedActions} action(s) completed`);
    } catch (error) {
      console.error('Error executing workflow:', error);
      alert('Failed to execute workflow');
    }
  }

  async function deleteWorkflow(id: string) {
    if (!confirm('Delete this workflow?')) return;

    try {
      await fetch(`/api/workflows/${id}`, { method: 'DELETE' });
      fetchWorkflows();
    } catch (error) {
      console.error('Error deleting workflow:', error);
    }
  }

  async function createWorkflow(formData: Record<string, unknown>) {
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowCreateModal(false);
        fetchWorkflows();
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
      alert('Failed to create workflow');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading workflows...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Automation</h1>
          <p className="mt-1 text-gray-600">Automate repetitive tasks</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          + New Workflow
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <div className="mb-4 text-6xl">⚙️</div>
          <h2 className="mb-2 text-2xl font-semibold">No Workflows Yet</h2>
          <p className="mb-6 text-gray-600">Create automated workflows to streamline your work</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            Create First Workflow
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="rounded-lg bg-white p-6 shadow">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{workflow.name}</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Created {new Date(workflow.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`rounded px-3 py-1 text-sm font-medium ${
                    workflow.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {workflow.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Trigger</p>
                  <p className="font-medium">{JSON.parse(workflow.trigger).type || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Actions</p>
                  <p className="font-medium">{JSON.parse(workflow.actions).length} action(s)</p>
                </div>
                <div>
                  <p className="text-gray-600">Conditions</p>
                  <p className="font-medium">
                    {Object.keys(JSON.parse(workflow.conditions)).length} condition(s)
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleWorkflow(workflow.id, workflow.enabled)}
                  className={`rounded px-4 py-2 ${
                    workflow.enabled
                      ? 'bg-gray-600 text-white hover:bg-gray-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {workflow.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => executeWorkflow(workflow.id)}
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Test Run
                </button>
                <button
                  onClick={() => deleteWorkflow(workflow.id)}
                  className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Workflow Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-2xl font-bold">Create Workflow</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createWorkflow({
                  name: formData.get('name'),
                  trigger: { type: formData.get('trigger') },
                  conditions: {},
                  actions: [
                    {
                      type: formData.get('actionType'),
                      title: 'Workflow Notification',
                      message: 'Automated action executed',
                    },
                  ],
                  enabled: true,
                });
              }}
            >
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium">Workflow Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full rounded border px-3 py-2"
                  placeholder="e.g., Auto-follow-up on email open"
                />
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium">Trigger Event</label>
                <select name="trigger" className="w-full rounded border px-3 py-2">
                  <option value="email_opened">Email Opened</option>
                  <option value="email_responded">Email Responded</option>
                  <option value="meeting_scheduled">Meeting Scheduled</option>
                  <option value="campaign_completed">Campaign Completed</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium">Action</label>
                <select name="actionType" className="w-full rounded border px-3 py-2">
                  <option value="send_notification">Send Notification</option>
                  <option value="update_status">Update Status</option>
                  <option value="assign_campaign">Assign to Campaign</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded border px-4 py-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Create Workflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
