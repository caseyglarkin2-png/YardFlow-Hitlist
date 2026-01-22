import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

function fillTemplate(
  template: string,
  data: {
    name: string;
    title?: string | null;
    company: string;
    event: string;
    persona: string;
  }
): string {
  return template
    .replace(/\{\{name\}\}/g, data.name)
    .replace(/\{\{title\}\}/g, data.title || "")
    .replace(/\{\{company\}\}/g, data.company)
    .replace(/\{\{event\}\}/g, data.event)
    .replace(/\{\{persona\}\}/g, data.persona);
}

function getPersonaLabel(person: any): string {
  if (person.isExecOps) return "Executive Operations";
  if (person.isOps) return "Operations";
  if (person.isProc) return "Procurement";
  if (person.isSales) return "Sales";
  if (person.isTech) return "Technology";
  if (person.isNonOps) return "Non-Operations";
  return "Team Member";
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { templateId, personIds, eventId } = body;

    if (!templateId || !personIds || personIds.length === 0) {
      return NextResponse.json(
        { error: "Template and person IDs required" },
        { status: 400 }
      );
    }

    // Get template
    const template = await prisma.message_templates.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Get event
    const event = await prisma.events.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get people with accounts
    const people = await prisma.people.findMany({
      where: { id: { in: personIds } },
      include: { target_accounts: true },
    });

    // Generate outreach for each person
    const outreachData = people.map((person) => {
      const persona = getPersonaLabel(person);
      const message = fillTemplate(template.template, {
        name: person.name,
        title: person.title,
        company: person.target_accounts.name,
        event: event.name,
        persona,
      });

      const subject = template.subject
        ? fillTemplate(template.subject, {
            name: person.name,
            title: person.title,
            company: person.target_accounts.name,
            event: event.name,
            persona,
          })
        : null;

      return {
        id: crypto.randomUUID(),
        personId: person.id,
        channel: template.channel,
        status: "DRAFT" as const,
        subject,
        message,
        templateId: template.id,
        sentBy: session.user.email,
        updatedAt: new Date(),
      };
    });

    // Bulk create outreach
    const result = await prisma.outreach.createMany({
      data: outreachData,
    });

    return NextResponse.json({
      success: true,
      count: result.count,
    });
  } catch (error) {
    console.error("Error generating outreach:", error);
    return NextResponse.json(
      { error: "Failed to generate outreach" },
      { status: 500 }
    );
  }
}
