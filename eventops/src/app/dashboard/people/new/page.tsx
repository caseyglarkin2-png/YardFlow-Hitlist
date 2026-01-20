'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function NewPersonPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountIdParam = searchParams.get('accountId');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const response = await fetch('/api/accounts');
        if (!response.ok) throw new Error('Failed to fetch accounts');
        const data = await response.json();
        setAccounts(data);
      } catch (err) {
        console.error('Error fetching accounts:', err);
      }
    }
    fetchAccounts();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: formData.get('accountId'),
          name: formData.get('name'),
          title: formData.get('title') || undefined,
          email: formData.get('email') || undefined,
          phone: formData.get('phone') || undefined,
          linkedin: formData.get('linkedin') || undefined,
          isExecOps: formData.get('isExecOps') === 'on',
          isOps: formData.get('isOps') === 'on',
          isProc: formData.get('isProc') === 'on',
          isSales: formData.get('isSales') === 'on',
          isTech: formData.get('isTech') === 'on',
          isNonOps: formData.get('isNonOps') === 'on',
          notes: formData.get('notes') || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create person');
      }

      const person = await response.json();
      router.push(`/dashboard/accounts/${person.accountId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Person</h1>
        <p className="mt-1 text-sm text-gray-600">
          Create a new contact for a target account
        </p>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
        <form onSubmit={handleSubmit} className="space-y-6 px-4 py-6 sm:p-8">
          <div>
            <label htmlFor="accountId" className="block text-sm font-medium leading-6 text-gray-900">
              Company *
            </label>
            <div className="mt-2">
              <select
                name="accountId"
                id="accountId"
                required
                defaultValue={accountIdParam || ''}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              >
                <option value="">Select a company...</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
              Full Name *
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="name"
                id="name"
                required
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="e.g., John Smith"
              />
            </div>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium leading-6 text-gray-900">
              Job Title
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="title"
                id="title"
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="e.g., VP of Operations"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                Email
              </label>
              <div className="mt-2">
                <input
                  type="email"
                  name="email"
                  id="email"
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  placeholder="john@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium leading-6 text-gray-900">
                Phone
              </label>
              <div className="mt-2">
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="linkedin" className="block text-sm font-medium leading-6 text-gray-900">
              LinkedIn URL
            </label>
            <div className="mt-2">
              <input
                type="url"
                name="linkedin"
                id="linkedin"
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="https://linkedin.com/in/username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-3">
              Persona Tags
            </label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isExecOps"
                  id="isExecOps"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <label htmlFor="isExecOps" className="ml-2 text-sm text-gray-700">
                  <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                    Exec/Ops
                  </span>
                  <span className="ml-2 text-gray-500">- Executive or Operations leadership</span>
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isOps"
                  id="isOps"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <label htmlFor="isOps" className="ml-2 text-sm text-gray-700">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                    Ops
                  </span>
                  <span className="ml-2 text-gray-500">- Operations role</span>
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isProc"
                  id="isProc"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <label htmlFor="isProc" className="ml-2 text-sm text-gray-700">
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    Procurement
                  </span>
                  <span className="ml-2 text-gray-500">- Procurement/purchasing role</span>
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isSales"
                  id="isSales"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <label htmlFor="isSales" className="ml-2 text-sm text-gray-700">
                  <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                    Sales
                  </span>
                  <span className="ml-2 text-gray-500">- Sales role</span>
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isTech"
                  id="isTech"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <label htmlFor="isTech" className="ml-2 text-sm text-gray-700">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                    Tech
                  </span>
                  <span className="ml-2 text-gray-500">- Technology/IT role</span>
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isNonOps"
                  id="isNonOps"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <label htmlFor="isNonOps" className="ml-2 text-sm text-gray-700">
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                    Non-Ops
                  </span>
                  <span className="ml-2 text-gray-500">- Not operations-related</span>
                </label>
              </div>
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
                rows={3}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="Any additional notes..."
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
              {isLoading ? 'Creating...' : 'Create Person'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
