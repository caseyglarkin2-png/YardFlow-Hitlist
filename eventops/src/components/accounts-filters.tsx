'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function AccountsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [icpMin, setIcpMin] = useState(searchParams.get('icpMin') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'name-asc');

  function applyFilters() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (icpMin) params.set('icpMin', icpMin);
    if (sort && sort !== 'name-asc') params.set('sort', sort);
    
    router.push(`/dashboard/accounts${params.toString() ? '?' + params.toString() : ''}`);
  }

  function clearFilters() {
    setSearch('');
    setIcpMin('');
    setSort('name-asc');
    router.push('/dashboard/accounts');
  }

  return (
    <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
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
            placeholder="Search by company name..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        
        <div>
          <label htmlFor="icpMin" className="block text-sm font-medium text-gray-700">
            Min ICP Score
          </label>
          <select
            id="icpMin"
            value={icpMin}
            onChange={(e) => setIcpMin(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">All scores</option>
            <option value="80">80+</option>
            <option value="60">60+</option>
            <option value="40">40+</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="sort" className="block text-sm font-medium text-gray-700">
            Sort by
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="icp-desc">ICP Score (High-Low)</option>
            <option value="icp-asc">ICP Score (Low-High)</option>
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
