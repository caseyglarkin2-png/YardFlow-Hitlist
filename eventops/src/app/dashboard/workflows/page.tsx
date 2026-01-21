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

  async function createWorkflow(formData: any) {
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading workflows...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Workflow Automation</h1>
          <p className="text-gray-600 mt-1">Automate repetitive tasks</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + New Workflow
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <div className="text-6xl mb-4">⚙️</div>
          <h2 className="text-2xl font-semibold mb-2">No Workflows Yet</h2>
          <p className="text-gray-600 mb-6">Create automated workflows to streamline your work</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create First Workflow
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{workflow.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Created {new Date(workflow.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    workflow.enabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {workflow.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-gray-600">Trigger</p>
                  <p className="font-medium">
                    {JSON.parse(workflow.trigger).type || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Actions</p>
                  <p className="font-medium">
                    {JSON.parse(workflow.actions).length} action(s)
                  </p>
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
                  className={`px-4 py-2 rounded ${
                    workflow.enabled
                      ? 'bg-gray-600 text-white hover:bg-gray-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {workflow.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => executeWorkflow(workflow.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Test Run
                </button>
                <button
                  onClick={() => deleteWorkflow(workflow.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full">
            <h2 className="text-2xl font-bold mb-4">Create Workflow</h2>
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
                <label className="block text-sm font-medium mb-1">Workflow Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g., Auto-follow-up on email open"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Trigger Event</label>
                <select name="trigger" className="w-full px-3 py-2 border rounded">
                  <option value="email_opened">Email Opened</option>
                  <option value="email_responded">Email Responded</option>
                  <option value="meeting_scheduled">Meeting Scheduled</option>
                  <option value="campaign_completed">Campaign Completed</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Action</label>
                <select name="actionType" className="w-full px-3 py-2 border rounded">
                  <option value="send_notification">Send Notification</option>
                  <option value="update_status">Update Status</option>
                  <option value="assign_campaign">Assign to Campaign</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
