'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';

type ImportType = 'accounts' | 'people' | null;

export default function ImportPage() {
  const router = useRouter();
  const [importType, setImportType] = useState<ImportType>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    Papa.parse(selectedFile, {
      header: true,
      preview: 5,
      complete: (results) => {
        if (results.data.length === 0) {
          setError('CSV file appears to be empty');
          return;
        }
        setHeaders(results.meta.fields || []);
        setPreview(results.data);
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
      },
    });
  }

  function handleContinue() {
    if (!file || !importType) return;
    
    // Store file in sessionStorage for next step (limited size, but works for demo)
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      sessionStorage.setItem('importFile', content);
      sessionStorage.setItem('importType', importType);
      router.push('/dashboard/import/map');
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Data</h1>
        <p className="mt-1 text-sm text-gray-600">
          Upload CSV files to bulk import accounts or people
        </p>
      </div>

      {!importType ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <button
            onClick={() => setImportType('accounts')}
            className="relative flex flex-col items-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <span className="mt-2 block text-sm font-semibold text-gray-900">
              Import Accounts
            </span>
            <span className="mt-1 block text-sm text-gray-500">
              Upload a CSV of companies
            </span>
          </button>

          <button
            onClick={() => setImportType('people')}
            className="relative flex flex-col items-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="mt-2 block text-sm font-semibold text-gray-900">
              Import People
            </span>
            <span className="mt-1 block text-sm text-gray-500">
              Upload a CSV of contacts
            </span>
          </button>
        </div>
      ) : (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
          <div className="px-4 py-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Import {importType === 'accounts' ? 'Accounts' : 'People'}
              </h2>
              <button
                onClick={() => {
                  setImportType(null);
                  setFile(null);
                  setPreview([]);
                  setHeaders([]);
                  setError(null);
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Change type
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Upload CSV File
              </label>
              <div className="mt-2">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer bg-gray-50 focus:outline-none"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                CSV file with {importType === 'accounts' ? 'company' : 'contact'} information
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {preview.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Preview ({preview.length} rows shown)
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-300 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {headers.slice(0, 5).map((header, idx) => (
                          <th
                            key={idx}
                            className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {header}
                          </th>
                        ))}
                        {headers.length > 5 && (
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                            +{headers.length - 5} more
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {preview.map((row: any, idx) => (
                        <tr key={idx}>
                          {headers.slice(0, 5).map((header, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="px-3 py-2 whitespace-nowrap text-sm text-gray-900"
                            >
                              {row[header] || '-'}
                            </td>
                          ))}
                          {headers.length > 5 && (
                            <td className="px-3 py-2 text-sm text-gray-400">...</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Found {headers.length} columns. Next step: map columns to fields.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => router.back()}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={!file || preview.length === 0}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Mapping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
