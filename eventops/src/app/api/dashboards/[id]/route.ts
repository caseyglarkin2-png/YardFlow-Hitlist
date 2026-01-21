import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// PATCH /api/dashboards/[id] - Update dashboard
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { name, layout, widgets, isDefault } = await request.json();

    const dashboard = await prisma.customDashboard.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(layout && { layout }),
        ...(widgets && { widgets }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Error updating dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to update dashboard' },
      { status: 500 }
    );
  }
}

// DELETE /api/dashboards/[id] - Delete dashboard
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.customDashboard.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to delete dashboard' },
      { status: 500 }
    );
  }
}
