import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { GoogleIntegrationCard } from '@/components/integrations/google-integration-card';
import { redirect } from 'next/navigation';

export default async function IntegrationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: {
      googleSyncEnabled: true,
      googleSyncPaused: true,
      googleSyncDryRun: true,
      lastGoogleSync: true,
      googleSyncAuditLog: true,
    },
  });

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-8">Integrations</h1>
      
      <div className="space-y-6">
        <GoogleIntegrationCard 
          user={user}
          onUpdate={() => {
            window.location.reload();
          }}
        />
      </div>
    </div>
  );
}
