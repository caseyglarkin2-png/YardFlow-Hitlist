import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { captureRouteError } from '@/lib/sentry-utils';
import { authServiceOrSession } from '@/lib/auth-service';

export const dynamic = 'force-dynamic';

// One-time seed endpoint - protected by auth + admin role check
// Disabled in production to prevent accidental data mutation
export async function POST(request: NextRequest) {
  // Block in production — seed should only run in development/staging
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED) {
    return NextResponse.json(
      { error: 'Seed endpoint is disabled in production' },
      { status: 403 }
    );
  }

  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if Casey already exists
    const existingCasey = await prisma.users.findUnique({
      where: { email: 'casey@freightroll.com' },
    });

    if (existingCasey) {
      return NextResponse.json({
        status: 'already_seeded',
        message: 'Users already exist',
        users: ['casey@freightroll.com', 'jake@freightroll.com'],
      });
    }

    // Create Casey (Admin)
    const caseyPassword = await bcrypt.hash('FreightRoll2026!', 10);

    const casey = await prisma.users.create({
      data: {
        id: 'user_casey_prod',
        email: 'casey@freightroll.com',
        name: 'Casey Larkin',
        password: caseyPassword,
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create Jake (Admin)
    const jakePassword = await bcrypt.hash('FreightRoll2026!', 10);

    const jake = await prisma.users.create({
      data: {
        id: 'user_jake_prod',
        email: 'jake@freightroll.com',
        name: 'Jake',
        password: jakePassword,
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Find existing Manifest 2026 event or create it
    let event = await prisma.events.findFirst({
      where: { name: 'Manifest 2026' },
    });

    if (!event) {
      event = await prisma.events.create({
        data: {
          id: 'manifest-2026-prod',
          name: 'Manifest 2026',
          location: 'Las Vegas Convention Center, NV',
          startDate: new Date('2026-02-10'),
          endDate: new Date('2026-02-12'),
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // Link users to event
    await prisma.users.update({
      where: { id: casey.id },
      data: { activeEventId: event.id },
    });

    await prisma.users.update({
      where: { id: jake.id },
      data: { activeEventId: event.id },
    });

    return NextResponse.json({
      status: 'success',
      message: 'Database seeded successfully',
      users: [
        { email: 'casey@freightroll.com', role: 'ADMIN' },
        { email: 'jake@freightroll.com', role: 'ADMIN' },
      ],
      event: { name: event.name, id: event.id },
    });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/admin/seed',
      method: 'POST',
    });
    console.error('Seed error:', error);
    return NextResponse.json(
      {
        error: 'Seed failed',
        details: String(error),
      },
      { status: 500 }
    );
  }
}

// GET to check seed status - requires authentication
export async function GET(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userCount = await prisma.users.count();
    const eventCount = await prisma.events.count();
    const accountCount = await prisma.target_accounts.count();

    return NextResponse.json({
      status: 'ok',
      counts: {
        users: userCount,
        events: eventCount,
        accounts: accountCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Database check failed',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
