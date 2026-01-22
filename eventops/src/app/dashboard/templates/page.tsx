import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Mail, Send } from "lucide-react";
import { DeleteTemplateButton } from "@/components/delete-template-button";

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const templates = await prisma.message_templates.findMany({
    orderBy: { updatedAt: "desc" },
  });

  const channelIcons = {
    EMAIL: <Mail className="h-4 w-4" />,
    LINKEDIN: <Send className="h-4 w-4" />,
    PHONE: null,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Message Templates</h1>
          <p className="text-muted-foreground">
            Create reusable templates for outreach messages
          </p>
        </div>
        <Link href="/dashboard/templates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first message template to start generating outreach
          </p>
          <Link href="/dashboard/templates/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="border rounded-lg p-6 space-y-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{template.name}</h3>
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700">
                      {channelIcons[template.channel]}
                      {template.channel}
                    </span>
                    {!template.isActive && (
                      <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700">
                        Inactive
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {template.description}
                    </p>
                  )}
                  {template.subject && (
                    <p className="text-sm font-medium mb-2">
                      Subject: {template.subject}
                    </p>
                  )}
                  <div className="bg-gray-50 rounded p-3 text-sm font-mono whitespace-pre-wrap">
                    {template.template.slice(0, 200)}
                    {template.template.length > 200 && "..."}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Link href={`/dashboard/templates/${template.id}/edit`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <DeleteTemplateButton templateId={template.id} />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Updated {new Date(template.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
