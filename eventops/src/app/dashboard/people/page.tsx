import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import type { Person, TargetAccount } from '@prisma/client';
import { PeopleFilters } from '@/components/people-filters';

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: { search?: string; persona?: string };
}) {
  const session = await auth();
  
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    include: { activeEvent: true },
  });

  if (!user?.activeEventId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">People</h1>
        <div className="rounded-lg bg-yellow-50 p-6">
          <h3 className="text-sm font-medium text-yellow-800">No Active Event</h3>
          <p className="mt-2 text-sm text-yellow-700">
            Please select an active event first to manage people.
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
  const where: any = {
    account: {
      eventId: user.activeEventId,
    },
  };
  
  if (searchParams.search) {
    where.OR = [
      { name: { contains: searchParams.search, mode: 'insensitive' } },
      { title: { contains: searchParams.search, mode: 'insensitive' } },
      { email: { contains: searchParams.search, mode: 'insensitive' } },
    ];
  }
  
  if (searchParams.persona) {
    const personaField = `is${searchParams.persona}`;
    where[personaField] = true;
  }

  const people = await prisma.person.findMany({
    where,
    include: {
      account: true,
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">People</h1>
          <p className="mt-1 text-sm text-gray-600">
            Managing {people.length} contact{people.length !== 1 ? 's' : ''} for <strong>{user.activeEvent.name}</strong>
          </p>
        </div>
        <Link
          href="/dashboard/people/new"
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Add Person
        </Link>
      </div>

      <PeopleFilters />

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                Name
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Company
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Title
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Contact
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Personas
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {people.map((person: Person & { account: TargetAccount }) => (
              <tr key={person.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                  {person.name}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  <Link
                    href={`/dashboard/accounts/${person.account.id}`}
                    className="text-blue-600 hover:text-blue-500"
                  >
                    {person.account.name}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {person.title || '-'}
                </td>
                <td className="px-3 py-4 text-sm text-gray-500">
                  {person.email && (
                    <a href={`mailto:${person.email}`} className="text-blue-600 hover:text-blue-500">
                      {person.email}
                    </a>
                  )}
                  {person.phone && (
                    <div className="text-xs text-gray-400">{person.phone}</div>
                  )}
                </td>
                <td className="px-3 py-4 text-sm text-gray-500">
                  <div className="flex flex-wrap gap-1">
                    {person.isExecOps && (
                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                        Exec/Ops
                      </span>
                    )}
                    {person.isOps && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        Ops
                      </span>
                    )}
                    {person.isProc && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Procurement
                      </span>
                    )}
                    {person.isSales && (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                        Sales
                      </span>
                    )}
                    {person.isTech && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                        Tech
                      </span>
                    )}
                    {person.isNonOps && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                        Non-Ops
                      </span>
                    )}
                  </div>
                </td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                  <Link
                    href={`/dashboard/people/${person.id}/edit`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {people.length === 0 && (
          <div className="px-6 py-14 text-center text-sm text-gray-500">
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
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No people</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first contact.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard/people/new"
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Add Person
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
