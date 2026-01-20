'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function EditAccountPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<any>(null);

  useEffect(() => {
    async function fetchAccount() {
      try {
        const response = await fetch(`/api/accounts/${params.id}`);
        if (!response.ok) throw new Error('Failed to fetch account');
        const data = await response.json();
        setAccount(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load account');
      } finally {
        setIsFetching(false);
      }
    }
    fetchAccount();
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await fetch(`/api/accounts/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          website: formData.get('website') || undefined,
          industry: formData.get('industry') || undefined,
          headquarters: formData.get('headquarters') || undefined,
          icpScore: formData.get('icpScore') ? Number(formData.get('icpScore')) : undefined,
          notes: formData.get('notes') || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update account');
      }

      router.push(`/dashboard/accounts/${params.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-sm text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center">
        <p className="text-red-600">Account not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Account</h1>
        <p className="mt-1 text-sm text-gray-600">Update account information</p>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
        <form onSubmit={handleSubmit} className="space-y-6 px-4 py-6 sm:p-8">
          <div>
            <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
              Company Name *
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="name"
                id="name"
                required
                defaultValue={account.name}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div>
            <label htmlFor="website" className="block text-sm font-medium leading-6 text-gray-900">
              Website
            </label>
            <div className="mt-2">
              <input
                type="url"
                name="website"
                id="website"
                defaultValue={account.website || ''}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="industry" className="block text-sm font-medium leading-6 text-gray-900">
                Industry
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  name="industry"
                  id="industry"
                  defaultValue={account.industry || ''}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <label htmlFor="headquarters" className="block text-sm font-medium leading-6 text-gray-900">
                Headquarters
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  name="headquarters"
                  id="headquarters"
                  defaultValue={account.headquarters || ''}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="icpScore" className="block text-sm font-medium leading-6 text-gray-900">
              ICP Score (0-100)
            </label>
            <div className="mt-2">
              <input
                type="number"
                name="icpScore"
                id="icpScore"
                min="0"
                max="100"
                defaultValue={account.icpScore ?? ''}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium leading-6 text-gray-900">
              Notes
            </label>
            <div className="mt-2">
              <textarea
                name="notes"
                id="notes"
                rows={4}
                defaultValue={account.notes || ''}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-x-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm font-semibold leading-6 text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
