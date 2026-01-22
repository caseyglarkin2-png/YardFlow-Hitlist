import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DeleteAccountButton } from '@/components/delete-account-button';
import { ScoreManager } from '@/components/score-manager';
import { ScoreHistory } from '@/components/score-history';
import { ResearchPanel } from '@/components/research-panel';

export default async function AccountDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  
  const account = await prisma.target_accounts.findUnique({
    where: { id: params.id },
    include: {
      event: true,
      people: {
        orderBy: { name: 'asc' },
      },
    },
  });

  const companyDossier = await prisma.company_dossiers.findFirst({
    where: { accountId: params.id },
  });

  if (!account) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{account.name}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Event: <strong>{account.event.name}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/accounts/${account.id}/edit`}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Edit Account
          </Link>
          <DeleteAccountButton accountId={account.id} accountName={account.name} />
        </div>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
        <div className="px-4 py-6 sm:p-8">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            {account.website && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Website</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a
                    href={account.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-500"
                  >
                    {account.website}
                  </a>
                </dd>
              </div>
            )}
            
            {account.industry && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Industry</dt>
                <dd className="mt-1 text-sm text-gray-900">{account.industry}</dd>
              </div>
            )}
            
            {account.headquarters && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Headquarters</dt>
                <dd className="mt-1 text-sm text-gray-900">{account.headquarters}</dd>
              </div>
            )}
            
            {account.icpScore !== null && (
              <div>
                <dt className="text-sm font-medium text-gray-500">ICP Score</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    account.icpScore >= 80 ? 'bg-green-100 text-green-800' :
                    account.icpScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {account.icpScore}
                  </span>
                </dd>
              </div>
            )}
            
            {account.notes && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{account.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <ScoreManager accountId={account.id} currentScore={account.icpScore} />

      <ScoreHistory accountId={account.id} />

      <ResearchPanel 
        accountId={account.id} 
        companyDossierId={companyDossier?.id || null} 
      />

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">People ({account.people.length})</h2>
            <Link
              href={`/dashboard/people/new?accountId=${account.id}`}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Add Person
            </Link>
          </div>
          
          {account.people.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {account.people.map((person: any) => (
                <li key={person.id} className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{person.name}</p>
                      {person.title && (
                        <p className="text-sm text-gray-500">{person.title}</p>
                      )}
                      {person.email && (
                        <p className="text-sm text-gray-500">{person.email}</p>
                      )}
                      <div className="mt-1 flex gap-1">
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
                    </div>
                    <Link
                      href={`/dashboard/people/${person.id}/edit`}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      Edit
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No people added yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
