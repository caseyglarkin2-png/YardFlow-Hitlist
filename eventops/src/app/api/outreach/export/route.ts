import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { activeEventId: true },
    });

    if (!user?.activeEventId) {
      return NextResponse.json(
        { error: "No active event selected" },
        { status: 400 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const channel = searchParams.get("channel");

    const whereClause: any = {
      person: {
        account: {
          eventId: user.activeEventId,
        },
      },
    };

    if (status && status !== "all") {
      whereClause.status = status;
    }
    if (channel && channel !== "all") {
      whereClause.channel = channel;
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

    // Convert to CSV
    const csvHeaders = [
      "Company",
      "Person Name",
      "Person Title",
      "Person Email",
      "Person LinkedIn",
      "Channel",
      "Status",
      "Subject",
      "Message",
      "Notes",
      "Created At",
      "Sent At",
    ];

    const csvRows = outreach.map((item) => [
      item.person.account.name,
      item.person.name,
      item.person.title || "",
      item.person.email || "",
      item.person.linkedin || "",
      item.channel,
      item.status,
      item.subject || "",
      item.message.replace(/\n/g, " ").replace(/"/g, '""'), // Escape newlines and quotes
      item.notes?.replace(/\n/g, " ").replace(/"/g, '""') || "",
      new Date(item.createdAt).toISOString(),
      item.sentAt ? new Date(item.sentAt).toISOString() : "",
    ]);

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) =>
        row.map((cell) => `"${cell}"`).join(",")
      ),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="outreach-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting outreach:", error);
    return NextResponse.json(
      { error: "Failed to export outreach" },
      { status: 500 }
    );
  }
}
