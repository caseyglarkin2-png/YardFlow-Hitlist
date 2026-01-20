import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { GenerateAIOutreachForm } from "@/components/generate-ai-outreach-form";

export default async function GenerateOutreachPage() {
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
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Generate AI Outreach</h1>
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            Please select an active event to generate outreach.
          </p>
        </div>
      </div>
    );
  }

  const accounts = await db.targetAccount.findMany({
    where: { eventId: user.activeEventId },
    include: {
      people: true,
    },
    orderBy: { icpScore: "desc" },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Generate AI Outreach</h1>
        <p className="text-muted-foreground">
          AI-powered personalized outreach with company research and context
        </p>
      </div>

      <GenerateAIOutreachForm
        accounts={accounts}
        eventId={user.activeEventId}
      />
    </div>
  );
}
