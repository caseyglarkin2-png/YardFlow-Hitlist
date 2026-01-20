'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';

type ImportRow = {
  data: any;
  status: 'new' | 'duplicate' | 'error';
  message?: string;
  matchedId?: string;
};

export default function PreviewImportPage() {
  const router = useRouter();
  const [importType, setImportType] = useState<'accounts' | 'people' | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [stats, setStats] = useState({ new: 0, duplicates: 0, errors: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAndCheck() {
      const fileContent = sessionStorage.getItem('importFile');
      const type = sessionStorage.getItem('importType') as 'accounts' | 'people';
      const mappingStr = sessionStorage.getItem('columnMapping');
      
      if (!fileContent || !type || !mappingStr) {
        router.push('/dashboard/import');
        return;
      }

      setImportType(type);
      const mapping = JSON.parse(mappingStr);

      Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const mappedData = results.data.map((row: any) => {
              const mapped: any = {};
              Object.keys(mapping).forEach((fieldKey) => {
                const csvColumn = mapping[fieldKey];
                if (csvColumn && row[csvColumn]) {
                  mapped[fieldKey] = row[csvColumn];
                }
              });
              return mapped;
            });

            // Check for duplicates
            const response = await fetch('/api/import/check-duplicates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type, data: mappedData }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              setError(errorData.error || 'Failed to check duplicates');
              setIsChecking(false);
              return;
            }

            const responseData = await response.json();
            const checkResults = responseData.results || [];
            
            const processedRows: ImportRow[] = checkResults.map((result: any) => ({
              data: result.data,
              status: result.isDuplicate ? 'duplicate' : 'new',
              message: result.message,
              matchedId: result.matchedId,
            }));

            setRows(processedRows);
            
            const newCount = processedRows.filter((r) => r.status === 'new').length;
            const dupCount = processedRows.filter((r) => r.status === 'duplicate').length;
            const errCount = processedRows.filter((r) => r.status === 'error').length;
            
            setStats({ new: newCount, duplicates: dupCount, errors: errCount });
            setIsChecking(false);
          } catch (err) {
            console.error('Error checking duplicates:', err);
            setError('An unexpected error occurred while checking for duplicates');
            setIsChecking(false);
          }
        },
      });
    }

    loadAndCheck();
  }, [router]);

  async function handleImport() {
    if (!importType) return;
    
    setIsImporting(true);
    
    try {
      const response = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: importType,
          rows: rows.filter((r) => r.status === 'new'),
        }),
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const { created } = await response.json();
      
      // Clear session storage
      sessionStorage.removeItem('importFile');
      sessionStorage.removeItem('importType');
      sessionStorage.removeItem('columnMapping');

      // Redirect to appropriate page
      if (importType === 'accounts') {
        router.push('/dashboard/accounts');
      } else {
        router.push('/dashboard/people');
      }
      router.refresh();
    } catch (error) {
      alert('Failed to import data. Please try again.');
      setIsImporting(false);
    }
  }

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-600">Checking for duplicates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Error</h1>
        </div>
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/import')}
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Back to Import
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Preview Import</h1>
        <p className="mt-1 text-sm text-gray-600">
          Review {importType === 'accounts' ? 'accounts' : 'people'} before importing
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg p-4">
          <dt className="text-sm font-medium text-gray-500">New Records</dt>
          <dd className="mt-1 text-3xl font-semibold text-green-600">{stats.new}</dd>
        </div>
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg p-4">
          <dt className="text-sm font-medium text-gray-500">Duplicates</dt>
          <dd className="mt-1 text-3xl font-semibold text-yellow-600">{stats.duplicates}</dd>
        </div>
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg p-4">
          <dt className="text-sm font-medium text-gray-500">Total Rows</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">{rows.length}</dd>
        </div>
      </div>

      {stats.duplicates > 0 && (
        <div className="rounded-md bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            {stats.duplicates} duplicate(s) detected and will be skipped. Review below.
          </p>
        </div>
      )}

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="py-3 pl-4 pr-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:pl-6">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {importType === 'accounts' ? 'Company' : 'Name'}
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {rows.map((row, idx) => (
                <tr key={idx} className={row.status === 'duplicate' ? 'bg-yellow-50' : ''}>
                  <td className="whitespace-nowrap py-2 pl-4 pr-3 text-sm sm:pl-6">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        row.status === 'new'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {row.status === 'new' ? 'New' : 'Duplicate'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-900">
                    {row.data.name || row.data.accountName}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {importType === 'accounts' 
                      ? row.data.website || row.data.industry || '-'
                      : row.data.title || row.data.email || '-'
                    }
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {row.message || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => router.push('/dashboard/import/map')}
          disabled={isImporting}
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          Back to Mapping
        </button>
        <button
          onClick={handleImport}
          disabled={stats.new === 0 || isImporting}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isImporting ? 'Importing...' : `Import ${stats.new} Record${stats.new !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}
