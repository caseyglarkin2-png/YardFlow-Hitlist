'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function PeopleFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [persona, setPersona] = useState(searchParams.get('persona') || '');

  function applyFilters() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (persona) params.set('persona', persona);
    
    router.push(`/dashboard/people${params.toString() ? '?' + params.toString() : ''}`);
  }

  function clearFilters() {
    setSearch('');
    setPersona('');
    router.push('/dashboard/people');
  }

  return (
    <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700">
            Search
          </label>
          <input
            type="text"
            id="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            placeholder="Search by name, title, or email..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        
        <div>
          <label htmlFor="persona" className="block text-sm font-medium text-gray-700">
            Filter by Persona
          </label>
          <select
            id="persona"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">All personas</option>
            <option value="ExecOps">Exec/Ops</option>
            <option value="Ops">Ops</option>
            <option value="Proc">Procurement</option>
            <option value="Sales">Sales</option>
            <option value="Tech">Tech</option>
            <option value="NonOps">Non-Ops</option>
          </select>
        </div>
      </div>
      
      <div className="mt-4 flex gap-2">
        <button
          onClick={applyFilters}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          Apply Filters
        </button>
        <button
          onClick={clearFilters}
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
