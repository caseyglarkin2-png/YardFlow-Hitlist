import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TemplateForm } from "@/components/template-form";

export default async function NewTemplatePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Message Template</h1>
        <p className="text-muted-foreground">
          Create a reusable template with variable placeholders
        </p>
      </div>

      <TemplateForm />
    </div>
  );
}
