'use client';

import { useEffect, useState } from 'react';

interface Widget {
  id: string;
  type: string;
  title: string;
  config: Record<string, unknown>;
}

interface Dashboard {
  id: string;
  name: string;
  layout: string;
  widgets: Widget[];
}

export default function CustomDashboardsPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);

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
    const name = prompt('Dashboard name:');
    if (!name) return;

    try {
      const res = await fetch('/api/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          layout: 'grid',
          widgets: [
            { id: '1', type: 'stats', title: 'Overview', config: {} },
            { id: '2', type: 'chart', title: 'Activity', config: {} },
          ],
        }),
      });

      if (res.ok) {
        loadDashboards();
      }
    } catch (error) {
      console.error('Error creating dashboard:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Custom Dashboards</h1>
          <p className="text-gray-600">Create personalized views and widgets</p>
        </div>
        <button
          onClick={createDashboard}
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
              <h3 className="text-lg font-semibold mb-2">{dashboard.name}</h3>
              <p className="text-sm text-gray-600 mb-4">
                {dashboard.widgets.length} widgets • {dashboard.layout} layout
              </p>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm">
                  Edit
                </button>
                <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                  View
                </button>
              </div>
            </div>
          ))}
          {dashboards.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No dashboards yet. Create your first one!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
