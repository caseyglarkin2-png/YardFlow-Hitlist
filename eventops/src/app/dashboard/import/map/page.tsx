'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';

type FieldMapping = Record<string, string>;

const accountFields = {
  name: { label: 'Company Name', required: true },
  website: { label: 'Website', required: false },
  industry: { label: 'Industry', required: false },
  headquarters: { label: 'Headquarters', required: false },
  icpScore: { label: 'ICP Score', required: false },
  notes: { label: 'Notes', required: false },
};

const peopleFields = {
  accountName: { label: 'Company Name', required: true },
  name: { label: 'Full Name', required: true },
  title: { label: 'Job Title', required: false },
  email: { label: 'Email', required: false },
  phone: { label: 'Phone', required: false },
  linkedin: { label: 'LinkedIn URL', required: false },
  notes: { label: 'Notes', required: false },
};

export default function MapColumnsPage() {
  const router = useRouter();
  const [importType, setImportType] = useState<'accounts' | 'people' | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [data, setData] = useState<any[]>([]);
  const [autoMapped, setAutoMapped] = useState(false);

  useEffect(() => {
    const fileContent = sessionStorage.getItem('importFile');
    const type = sessionStorage.getItem('importType') as 'accounts' | 'people';
    
    if (!fileContent || !type) {
      router.push('/dashboard/import');
      return;
    }

    setImportType(type);

    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setData(results.data);
        
        // Auto-map columns based on header names
        const autoMapping: FieldMapping = {};
        const fields = type === 'accounts' ? accountFields : peopleFields;
        
        headers.forEach((header) => {
          const lowerHeader = header.toLowerCase().trim();
          
          // Try exact matches first
          Object.keys(fields).forEach((fieldKey) => {
            const fieldLabel = fields[fieldKey as keyof typeof fields].label.toLowerCase();
            if (lowerHeader === fieldLabel || lowerHeader === fieldKey.toLowerCase()) {
              autoMapping[fieldKey] = header;
            }
          });
          
          // Try common variations
          if (lowerHeader.includes('company') || lowerHeader.includes('account') || lowerHeader.includes('organization')) {
            if (type === 'people' && !autoMapping.accountName) {
              autoMapping.accountName = header;
            } else if (type === 'accounts' && !autoMapping.name) {
              autoMapping.name = header;
            }
          }
          if ((lowerHeader.includes('icp') || lowerHeader.includes('score')) && type === 'accounts') {
            if (!autoMapping.icpScore) autoMapping.icpScore = header;
          }
          if (lowerHeader === 'url' || lowerHeader === 'site') {
            if (!autoMapping.website) autoMapping.website = header;
          }
          if (lowerHeader.includes('location') || lowerHeader === 'hq' || lowerHeader.includes('headquarter')) {
            if (!autoMapping.headquarters) autoMapping.headquarters = header;
          }
        });
        
        setMapping(autoMapping);
        setAutoMapped(true);
      },
    });
  }, [router]);

  function handleContinue() {
    sessionStorage.setItem('columnMapping', JSON.stringify(mapping));
    router.push('/dashboard/import/preview');
  }

  if (!importType) {
    return <div>Loading...</div>;
  }

  const fields = importType === 'accounts' ? accountFields : peopleFields;
  const requiredFieldsMapped = Object.keys(fields)
    .filter((key) => fields[key as keyof typeof fields].required)
    .every((key) => mapping[key]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Map Columns</h1>
        <p className="mt-1 text-sm text-gray-600">
          Match your CSV columns to {importType === 'accounts' ? 'account' : 'person'} fields
        </p>
      </div>

      {autoMapped && (
        <div className="rounded-md bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            ✓ Auto-mapped {Object.keys(mapping).length} columns. Review and adjust as needed.
          </p>
        </div>
      )}

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
        <div className="px-4 py-6 sm:p-8">
          <div className="space-y-4">
            {Object.entries(fields).map(([fieldKey, field]) => (
              <div key={fieldKey}>
                <label className="block text-sm font-medium text-gray-700">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <select
                  value={mapping[fieldKey] || ''}
                  onChange={(e) =>
                    setMapping({ ...mapping, [fieldKey]: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">-- Select CSV column --</option>
                  {csvHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
                {mapping[fieldKey] && data[0] && (
                  <p className="mt-1 text-xs text-gray-500">
                    Example: {data[0][mapping[fieldKey]] || '(empty)'}
                  </p>
                )}
              </div>
            ))}
          </div>

          {!requiredFieldsMapped && (
            <div className="mt-4 rounded-md bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800">
                Please map all required fields (marked with *) to continue
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => router.push('/dashboard/import')}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleContinue}
              disabled={!requiredFieldsMapped}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Preview Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
