import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { status, subject, message, notes } = body;

    const updated = await prisma.outreach.update({
      where: { id: params.id },
      data: {
        status,
        subject: subject || null,
        message,
        notes: notes || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating outreach:", error);
    return NextResponse.json(
      { error: "Failed to update outreach" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.outreach.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting outreach:", error);
    return NextResponse.json(
      { error: "Failed to delete outreach" },
      { status: 500 }
    );
  }
}
