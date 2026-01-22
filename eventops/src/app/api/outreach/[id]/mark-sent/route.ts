import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updated = await prisma.outreach.update({
      where: { id: params.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        sentBy: session.user.email,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error marking as sent:", error);
    return NextResponse.json(
      { error: "Failed to mark as sent" },
      { status: 500 }
    );
  }
}
