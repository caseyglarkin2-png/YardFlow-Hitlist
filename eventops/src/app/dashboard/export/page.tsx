'use client';

import { useState } from 'react';

export default function ExportPage() {
  const [type, setType] = useState('accounts');
  const [format, setFormat] = useState('csv');
  const [minIcpScore, setMinIcpScore] = useState('75');
  const [outreachStatus, setOutreachStatus] = useState('');
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          format,
          filters: {
            minIcpScore: parseInt(minIcpScore),
            ...(outreachStatus && { status: outreachStatus }),
          },
        }),
      });

      if (format === 'csv') {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-export-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        alert('Export downloaded successfully!');
      } else {
        const data = await res.json();
        alert(`Exported ${data.count} records`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Data Export</h1>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Export Type</label>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setType('accounts')}
              className={`p-4 border rounded ${
                type === 'accounts' ? 'bg-blue-600 text-white' : 'bg-white'
              }`}
            >
              <div className="text-2xl mb-2">🏢</div>
              <div className="font-semibold">Accounts</div>
              <div className="text-sm">Company data</div>
            </button>
            <button
              onClick={() => setType('people')}
              className={`p-4 border rounded ${
                type === 'people' ? 'bg-blue-600 text-white' : 'bg-white'
              }`}
            >
              <div className="text-2xl mb-2">👤</div>
              <div className="font-semibold">People</div>
              <div className="text-sm">Contact data</div>
            </button>
            <button
              onClick={() => setType('outreach')}
              className={`p-4 border rounded ${
                type === 'outreach' ? 'bg-blue-600 text-white' : 'bg-white'
              }`}
            >
              <div className="text-2xl mb-2">📧</div>
              <div className="font-semibold">Outreach</div>
              <div className="text-sm">Email campaigns</div>
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Export Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="csv">CSV (Excel compatible)</option>
            <option value="json">JSON</option>
          </select>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold mb-3">Filters</h3>

          {type === 'accounts' && (
            <div>
              <label className="block text-sm font-medium mb-1">Minimum ICP Score</label>
              <input
                type="number"
                value={minIcpScore}
                onChange={(e) => setMinIcpScore(e.target.value)}
                min="0"
                max="100"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          )}

          {type === 'outreach' && (
            <div>
              <label className="block text-sm font-medium mb-1">Outreach Status</label>
              <select
                value={outreachStatus}
                onChange={(e) => setOutreachStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="OPENED">Opened</option>
                <option value="RESPONDED">Responded</option>
              </select>
            </div>
          )}
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {exporting ? 'Exporting...' : `Export ${type.charAt(0).toUpperCase() + type.slice(1)}`}
        </button>
      </div>

      <div className="mt-6 bg-blue-50 p-6 rounded-lg">
        <h3 className="font-semibold mb-2">Export Includes</h3>
        {type === 'accounts' && (
          <ul className="text-sm space-y-1">
            <li>• Account name, industry, domain</li>
            <li>• ICP score and tier</li>
            <li>• Number of contacts</li>
            <li>• Creation date</li>
          </ul>
        )}
        {type === 'people' && (
          <ul className="text-sm space-y-1">
            <li>• Name, title, email, LinkedIn</li>
            <li>• Account and industry</li>
            <li>• Persona tags</li>
            <li>• Creation date</li>
          </ul>
        )}
        {type === 'outreach' && (
          <ul className="text-sm space-y-1">
            <li>• Person and account name</li>
            <li>• Email subject and status</li>
            <li>• Channel (email, LinkedIn)</li>
            <li>• Sent, opened, responded timestamps</li>
          </ul>
        )}
      </div>
    </div>
  );
}
