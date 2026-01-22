import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const isGlobal = searchParams.get('isGlobal') === 'true';

    const where: any = {
      OR: [
        { userId: user.id },
        { isGlobal: true },
      ],
    };

    if (entityType) {
      where.entityType = entityType;
    }

    const savedSearches = await prisma.saved_searches.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json(savedSearches);
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved searches' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, entityType, filters, isGlobal } = body;

    if (!name || !entityType || !filters) {
      return NextResponse.json(
        { error: 'Missing required fields: name, entityType, filters' },
        { status: 400 }
      );
    }

    const savedSearch = await prisma.saved_searches.create({
      data: {
        userId: user.id,
        name,
        description,
        entityType,
        filters,
        isGlobal: isGlobal || false,
      },
    });

    return NextResponse.json(savedSearch, { status: 201 });
  } catch (error) {
    console.error('Error creating saved search:', error);
    return NextResponse.json(
      { error: 'Failed to create saved search' },
      { status: 500 }
    );
  }
}
