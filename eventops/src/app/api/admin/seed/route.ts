import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// One-time seed endpoint - protected by secret
export async function POST(request: Request) {
  // Require a secret to prevent abuse
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret !== process.env.AUTH_SECRET?.slice(0, 16)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.users.findUnique({
      where: { email: 'admin@yardflow.com' }
    });

    if (existingAdmin) {
      return NextResponse.json({ 
        status: 'already_seeded',
        message: 'Admin user already exists',
        email: existingAdmin.email
      });
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('YardFlow2026!', 10);
    
    const admin = await prisma.users.create({
      data: {
        id: 'user_admin_prod',
        email: 'admin@yardflow.com',
        name: 'Admin User',
        password: hashedPassword,
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create demo user
    const demoPassword = await bcrypt.hash('demo123', 10);
    
    const demo = await prisma.users.create({
      data: {
        id: 'user_demo_prod',
        email: 'demo@yardflow.com',
        name: 'Demo User',
        password: demoPassword,
        role: 'MEMBER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create Manifest 2026 event
    const event = await prisma.events.create({
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

    // Link users to event
    await prisma.users.update({
      where: { id: admin.id },
      data: { eventId: event.id },
    });

    await prisma.users.update({
      where: { id: demo.id },
      data: { eventId: event.id },
    });

    return NextResponse.json({
      status: 'success',
      message: 'Database seeded successfully',
      users: [
        { email: 'admin@yardflow.com', role: 'ADMIN' },
        { email: 'demo@yardflow.com', role: 'MEMBER' },
      ],
      event: { name: event.name, id: event.id },
    });

  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ 
      error: 'Seed failed', 
      details: String(error) 
    }, { status: 500 });
  }
}

// GET to check seed status
export async function GET() {
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
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Database check failed', 
      details: String(error) 
    }, { status: 500 });
  }
}
