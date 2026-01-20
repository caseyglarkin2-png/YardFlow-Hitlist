import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import type { TargetAccount } from '@prisma/client';
import { AccountsFilters } from '@/components/accounts-filters';

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: { search?: string; icpMin?: string; sort?: string };
}) {
  const session = await auth();
  
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    include: { activeEvent: true },
  });

  if (!user?.activeEventId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Target Accounts</h1>
        <div className="rounded-lg bg-yellow-50 p-6">
          <h3 className="text-sm font-medium text-yellow-800">No Active Event</h3>
          <p className="mt-2 text-sm text-yellow-700">
            Please select an active event first to manage accounts.
          </p>
          <Link
            href="/dashboard/events"
            className="mt-3 inline-flex items-center rounded-md bg-yellow-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-500"
          >
            Go to Events
          </Link>
        </div>
      </div>
    );
  }

  // Build where clause with filters
  const where: any = { eventId: user.activeEventId };
  
  if (searchParams.search) {
    where.name = { contains: searchParams.search, mode: 'insensitive' };
  }
  
  if (searchParams.icpMin) {
    where.icpScore = { gte: Number(searchParams.icpMin) };
  }

  // Build orderBy clause
  let orderBy: any = { name: 'asc' };
  if (searchParams.sort === 'icp-desc') {
    orderBy = { icpScore: 'desc' };
  } else if (searchParams.sort === 'icp-asc') {
    orderBy = { icpScore: 'asc' };
  } else if (searchParams.sort === 'name-desc') {
    orderBy = { name: 'desc' };
  }

  const accounts = await prisma.targetAccount.findMany({
    where,
    include: {
      _count: {
        select: { people: true },
      },
    },
    orderBy,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Target Accounts</h1>
          <p className="mt-1 text-sm text-gray-600">
            Managing {accounts.length} account{accounts.length !== 1 ? 's' : ''} for <strong>{user.activeEvent.name}</strong>
          </p>
        </div>
        <Link
          href="/dashboard/accounts/new"
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Add Account
        </Link>
      </div>

      <AccountsFilters />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account: TargetAccount & { _count: { people: number } }) => (
          <div
            key={account.id}
            className="relative flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900">{account.name}</h3>
              {account.website && (
                <a
                  href={account.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-sm text-blue-600 hover:text-blue-500"
                >
                  {account.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              <div className="mt-4 space-y-2">
                {account.industry && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Industry:</span> {account.industry}
                  </p>
                )}
                {account.headquarters && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">HQ:</span> {account.headquarters}
                  </p>
                )}
                <p className="text-sm text-gray-600">
                  <span className="font-medium">People:</span> {account._count.people}
                </p>
                {account.icpScore !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">ICP Score:</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      account.icpScore >= 80 ? 'bg-green-100 text-green-800' :
                      account.icpScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {account.icpScore}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/dashboard/accounts/${account.id}`}
                className="flex-1 rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                View
              </Link>
              <Link
                href={`/dashboard/accounts/${account.id}/edit`}
                className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Edit
              </Link>
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
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
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No accounts</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first target account.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/accounts/new"
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Add Account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
