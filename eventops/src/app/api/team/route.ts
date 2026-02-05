import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authServiceOrSession } from '@/lib/auth-service';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

// GET /api/team - List team members
export async function GET(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.users.findUnique({
      where: { id: authResult.userId },
    });

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    const users = await prisma.users.findMany({
      where: {
        ...(role && { role: role as 'ADMIN' | 'MEMBER' }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            activities: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    captureRouteError(error, {
      route: '/api/team',
      method: 'GET',
      userId: authResult?.userId,
    });
    console.error('Error fetching team:', error);
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
  }
}

// POST /api/team - Invite team member
export async function POST(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.users.findUnique({
      where: { id: authResult.userId },
    });

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { email, name, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role required' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    // Create user (in real app, send invite email)
    const user = await prisma.users.create({
      data: {
        id: crypto.randomUUID(),
        email,
        name: name || email.split('@')[0],
        role: role as 'ADMIN' | 'MEMBER',
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    captureRouteError(error, {
      route: '/api/team',
      method: 'POST',
      userId: authResult?.userId,
    });
    console.error('Error inviting team member:', error);
    return NextResponse.json({ error: 'Failed to invite team member' }, { status: 500 });
  }
}
