import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/register
 * Creates a new user account (protected by CRON_SECRET for production use)
 */
export async function POST(req: NextRequest) {
  try {
    // Check for service authorization (CRON_SECRET)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      email,
      password,
      name,
      role = 'MEMBER',
    } = body as {
      email: string;
      password: string;
      name?: string;
      role?: 'ADMIN' | 'MEMBER';
    };

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Update password if user exists
      const hashedPassword = await hashPassword(password);
      const updatedUser = await prisma.users.update({
        where: { email },
        data: {
          password: hashedPassword,
          name: name || existingUser.name,
        },
      });

      logger.info('User password updated', { userId: updatedUser.id, email });

      return NextResponse.json({
        success: true,
        action: 'updated',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
        },
      });
    }

    // Create new user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.users.create({
      data: {
        id: randomUUID(),
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        role,
        updatedAt: new Date(),
      },
    });

    logger.info('User created', { userId: user.id, email });

    return NextResponse.json({
      success: true,
      action: 'created',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Error creating user', { error });
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
