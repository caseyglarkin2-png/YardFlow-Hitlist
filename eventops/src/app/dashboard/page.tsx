import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { QuickActions } from '@/components/quick-actions';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();
  
  // Type guard - middleware should prevent this, but be defensive
  if (!session?.user?.id) {
    redirect('/login');
  }
  
  // Get active event for user
  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    include: {
      events: true,
    },
  });

  const stats = user?.activeEventId
    ? await Promise.all([
        prisma.target_accounts.count({
          where: { eventId: user.activeEventId },
        }),
        prisma.people.count({
          where: { target_accounts: { eventId: user.activeEventId } },
        }),
      ])
    : [0, 0];

  const [accountCount, personCount] = stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome back, {session.user.name || session.user.email}
        </p>
      </div>

      {user?.events ? (
        <>
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-gray-900">Active Event</h2>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {user.events.name}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {user.events.location} •{' '}
              {new Date(user.events.startDate).toLocaleDateString()} -{' '}
              {new Date(user.events.endDate).toLocaleDateString()}
            </p>
          </div>

          <div className="mb-6">
            <QuickActions />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="overflow-hidden rounded-lg bg-white shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-gray-400"
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
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-gray-500">
                        Target Accounts
                      </dt>
                      <dd className="text-3xl font-semibold text-gray-900">
                        {accountCount}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <a
                  href="/dashboard/accounts"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  View all accounts
                </a>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg bg-white shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-gray-400"
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
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-gray-500">
                        People
                      </dt>
                      <dd className="text-3xl font-semibold text-gray-900">
                        {personCount}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <a
                  href="/dashboard/people"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  View all people
                </a>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg bg-yellow-50 p-6">
          <h3 className="text-sm font-medium text-yellow-800">
            No Active Event
          </h3>
          <p className="mt-2 text-sm text-yellow-700">
            You don&apos;t have an active event selected. Create or select an event to get
            started.
          </p>
          <a
            href="/dashboard/events"
            className="mt-3 inline-flex items-center rounded-md bg-yellow-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-500"
          >
            Go to Events
          </a>
        </div>
      )}
    </div>
  );
}
