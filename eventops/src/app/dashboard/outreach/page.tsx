import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import { OutreachFilters } from "@/components/outreach-filters";
import { OutreachList } from "@/components/outreach-list";
import { ExportOutreachButton } from "@/components/export-outreach-button";

export default async function OutreachPage({
  searchParams,
}: {
  searchParams: { status?: string; channel?: string; personaFilter?: string };
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email! },
    select: { activeEventId: true },
  });

  if (!user?.activeEventId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Outreach</h1>
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            Please select an active event to manage outreach.
          </p>
        </div>
      </div>
    );
  }

  const whereClause: any = {
    person: {
      account: {
        eventId: user.activeEventId,
      },
    },
  };

  if (searchParams.status) {
    whereClause.status = searchParams.status;
  }
  if (searchParams.channel) {
    whereClause.channel = searchParams.channel;
  }

  const outreach = await db.outreach.findMany({
    where: whereClause,
    include: {
      person: {
        include: {
          account: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const stats = {
    total: outreach.length,
    drafts: outreach.filter((o) => o.status === "DRAFT").length,
    sent: outreach.filter((o) => o.status === "SENT").length,
    responded: outreach.filter((o) => o.status === "RESPONDED").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Outreach</h1>
          <p className="text-muted-foreground">
            Manage and track your outreach messages
          </p>
        </div>
        <div className="flex gap-2">
          <ExportOutreachButton />
          <Link href="/dashboard/outreach/generate">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Generate Outreach
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Total Outreach</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold">{stats.drafts}</div>
          <div className="text-sm text-muted-foreground">Drafts</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold">{stats.sent}</div>
          <div className="text-sm text-muted-foreground">Sent</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold">{stats.responded}</div>
          <div className="text-sm text-muted-foreground">Responded</div>
        </div>
      </div>

      <OutreachFilters />

      {outreach.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">No outreach yet</h3>
          <p className="text-muted-foreground mb-4">
            Generate personalized outreach messages for your target accounts
          </p>
          <Link href="/dashboard/outreach/generate">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Generate Outreach
            </Button>
          </Link>
        </div>
      ) : (
        <OutreachList outreach={outreach} />
      )}
    </div>
  );
}
