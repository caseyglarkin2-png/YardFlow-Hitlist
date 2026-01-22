import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { OutreachEditor } from "@/components/outreach-editor";

export default async function OutreachDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const outreach = await prisma.outreach.findUnique({
    where: { id: params.id },
    include: {
      people: {
        include: {
          target_accounts: true,
        },
      },
    },
  });

  if (!outreach) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Outreach: {outreach.people.name}
        </h1>
        <p className="text-muted-foreground">
          {outreach.people.target_accounts.name} • {outreach.people.title || "No title"}
        </p>
      </div>

      <OutreachEditor outreach={outreach} />
    </div>
  );
}
