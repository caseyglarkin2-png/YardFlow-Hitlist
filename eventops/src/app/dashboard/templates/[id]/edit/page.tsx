import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { TemplateForm } from "@/components/template-form";
import { notFound } from "next/navigation";

export default async function EditTemplatePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const template = await prisma.message_templates.findUnique({
    where: { id: params.id },
  });

  if (!template) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Template</h1>
        <p className="text-muted-foreground">
          Update your message template
        </p>
      </div>

      <TemplateForm template={template} />
    </div>
  );
}
