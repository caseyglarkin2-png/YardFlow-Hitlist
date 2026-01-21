'use client';

import { useEffect, useState } from 'react';

interface Widget {
  id: string;
  type: string;
  title: string;
  config: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
}

interface Dashboard {
  id: string;
  name: string;
  layout: string;
  widgets: Widget[];
  isDefault: boolean;
}

export default function CustomDashboardsPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDashboard, setNewDashboard] = useState({ name: '', layout: 'grid' });

  useEffect(() => {
    loadDashboards();
  }, []);

  const loadDashboards = async () => {
    try {
      const res = await fetch('/api/dashboards');
      if (res.ok) {
        const data = await res.json();
        setDashboards(data);
      }
    } catch (error) {
      console.error('Error loading dashboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDashboard = async () => {
    if (!newDashboard.name) return;

    try {
      const res = await fetch('/api/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDashboard.name,
          layout: newDashboard.layout,
          widgets: [],
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewDashboard({ name: '', layout: 'grid' });
        loadDashboards();
      }
    } catch (error) {
      console.error('Error creating dashboard:', error);
    }
  };

  const deleteDashboard = async (id: string) => {
    if (!confirm('Delete this dashboard?')) return;

    try {
      const res = await fetch(`/api/dashboards/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadDashboards();
      }
    } catch (error) {
      console.error('Error deleting dashboard:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Custom Dashboards</h1>
          <p className="text-gray-600">Create personalized dashboard views with custom widgets</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          New Dashboard
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading dashboards...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboards.map((dashboard) => (
            <div key={dashboard.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{dashboard.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {dashboard.widgets?.length || 0} widgets • {dashboard.layout} layout
                  </p>
                </div>
                {dashboard.isDefault && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    Default
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => window.location.href = `/dashboard?custom=${dashboard.id}`}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 text-sm"
                >
                  View
                </button>
                <button
                  onClick={() => deleteDashboard(dashboard.id)}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {dashboards.length === 0 && (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-4">No custom dashboards yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Your First Dashboard
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Create Dashboard</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dashboard Name
                </label>
                <input
                  type="text"
                  value={newDashboard.name}
                  onChange={(e) => setNewDashboard({ ...newDashboard, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="My Custom Dashboard"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Layout Style
                </label>
                <select
                  value={newDashboard.layout}
                  onChange={(e) => setNewDashboard({ ...newDashboard, layout: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="grid">Grid</option>
                  <option value="flex">Flexible</option>
                  <option value="masonry">Masonry</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createDashboard}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={!newDashboard.name}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
