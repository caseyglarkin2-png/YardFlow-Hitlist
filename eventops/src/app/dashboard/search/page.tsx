'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdvancedSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [minIcpScore, setMinIcpScore] = useState('0');
  const [maxIcpScore, setMaxIcpScore] = useState('100');
  const [outreachStatus, setOutreachStatus] = useState('');
  const [hasEmail, setHasEmail] = useState('');
  const [results, setResults] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);

    try {
      const params = new URLSearchParams({
        q: query,
        type,
        minIcpScore,
        maxIcpScore,
        ...(outreachStatus && { outreachStatus }),
        ...(hasEmail && { hasEmail }),
      });

      const res = await fetch(`/api/search/advanced?${params}`);
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Advanced Search</h1>

      <form onSubmit={handleSearch} className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search Query</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Company name, email, title..."
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Search Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="all">All</option>
              <option value="accounts">Accounts Only</option>
              <option value="people">People Only</option>
              <option value="outreach">Outreach Only</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Min ICP Score</label>
            <input
              type="number"
              value={minIcpScore}
              onChange={(e) => setMinIcpScore(e.target.value)}
              min="0"
              max="100"
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max ICP Score</label>
            <input
              type="number"
              value={maxIcpScore}
              onChange={(e) => setMaxIcpScore(e.target.value)}
              min="0"
              max="100"
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Has Email</label>
            <select
              value={hasEmail}
              onChange={(e) => setHasEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">Any</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Outreach Status</label>
            <select
              value={outreachStatus}
              onChange={(e) => setOutreachStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">Any</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="OPENED">Opened</option>
              <option value="RESPONDED">Responded</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={searching}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {results && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Search Results</h2>
            <p className="text-gray-600">
              Found {results.totalResults} result{results.totalResults !== 1 ? 's' : ''}
            </p>
          </div>

          {results.accounts?.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">
                Accounts ({results.accounts.length})
              </h3>
              <div className="space-y-2">
                {results.accounts.map((account: any) => (
                  <div
                    key={account.id}
                    className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/accounts/${account.id}`)}
                  >
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-sm text-gray-600">{account.industry}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">ICP: {account.icpScore}</p>
                        <p className="text-sm text-gray-600">
                          {account.peopleCount} contact{account.peopleCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.people?.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">People ({results.people.length})</h3>
              <div className="space-y-2">
                {results.people.map((person: any) => (
                  <div key={person.id} className="p-3 border rounded hover:bg-gray-50">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{person.name}</p>
                        <p className="text-sm text-gray-600">{person.title}</p>
                        <p className="text-sm text-gray-600">{person.accountName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{person.email || 'No email'}</p>
                        <p className="text-sm text-gray-600">ICP: {person.icpScore}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.outreach?.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">
                Outreach ({results.outreach.length})
              </h3>
              <div className="space-y-2">
                {results.outreach.map((outreach: any) => (
                  <div key={outreach.id} className="p-3 border rounded hover:bg-gray-50">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{outreach.subject}</p>
                        <p className="text-sm text-gray-600">
                          {outreach.personName} • {outreach.accountName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{outreach.status}</p>
                        <p className="text-sm text-gray-600">
                          {outreach.sentAt
                            ? new Date(outreach.sentAt).toLocaleDateString()
                            : 'Not sent'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
