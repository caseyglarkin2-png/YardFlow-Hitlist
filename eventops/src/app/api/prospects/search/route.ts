import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-service';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';
import { captureRouteError } from '@/lib/sentry-utils';

interface SearchFilters {
  tier?: string[];
  status?: string[];
  company?: string[];
  tags?: string[];
  scoreMin?: number;
  scoreMax?: number;
  createdAfter?: string;
  createdBefore?: string;
}

/**
 * POST /api/prospects/search
 * Advanced search with complex filters
 */
export async function POST(request: NextRequest) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  try {
    const body = await request.json();
    const { 
      query, 
      filters = {} as SearchFilters, 
      limit = 25, 
      cursor 
    } = body;

    const where: Prisma.peopleWhereInput = {
      AND: []
    };
    const conditions = where.AND as Prisma.peopleWhereInput[];

    // Full-text search
    if (query) {
      conditions.push({
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { title: { contains: query, mode: 'insensitive' } },
          { notes: { contains: query, mode: 'insensitive' } },
        ]
      });
    }

    // Tier filter (array)
    if (filters.tier?.length) {
      conditions.push({ tier: { in: filters.tier } });
    }

    // Status filter (array)
    if (filters.status?.length) {
      conditions.push({ status: { in: filters.status } });
    }

    // Company filter via account relation
    if (filters.company?.length) {
      conditions.push({
        target_accounts: {
          name: { in: filters.company }
        }
      });
    }

    // Tags filter (array contains any)
    if (filters.tags?.length) {
      conditions.push({
        tags: { hasSome: filters.tags }
      });
    }

    // Score range
    if (filters.scoreMin !== undefined) {
      conditions.push({ score: { gte: filters.scoreMin } });
    }
    if (filters.scoreMax !== undefined) {
      conditions.push({ score: { lte: filters.scoreMax } });
    }

    // Date range
    if (filters.createdAfter) {
      conditions.push({ createdAt: { gte: new Date(filters.createdAfter) } });
    }
    if (filters.createdBefore) {
      conditions.push({ createdAt: { lte: new Date(filters.createdBefore) } });
    }

    // Remove empty AND array if no conditions
    if (conditions.length === 0) {
      delete where.AND;
    }

    const take = Math.min(limit, 100);

    const [data, total] = await Promise.all([
      prisma.people.findMany({
        where,
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { createdAt: 'desc' },
        include: {
          target_accounts: { select: { id: true, name: true } }
        }
      }),
      prisma.people.count({ where }),
    ]);

    const hasMore = data.length > take;
    const responseData = hasMore ? data.slice(0, take) : data;
    const nextCursor = hasMore ? responseData[responseData.length - 1]?.id : null;

    // Transform to match spec
    const prospects = responseData.map(p => ({
      ...p,
      firstName: p.name.split(' ')[0] || '',
      lastName: p.name.split(' ').slice(1).join(' ') || '',
      company: p.target_accounts?.name || '',
      linkedinUrl: p.linkedin,
    }));

    logger.info('Prospect search', { query, filterCount: conditions.length, results: total });

    return NextResponse.json({
      data: prospects,
      pagination: {
        hasMore,
        nextCursor,
        total,
      },
    });
  } catch (err) {
    captureRouteError(err, {
      route: '/api/prospects/search',
      method: 'POST',
    });
    logger.error('Prospect search failed', { error: String(err) });
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
      statusCode: 500
    }, { status: 500 });
  }
}

// Also support GET for simple queries
export async function GET(request: NextRequest) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || searchParams.get('query');
  const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);
  const cursor = searchParams.get('cursor');

  if (!query) {
    return NextResponse.json({
      error: 'VALIDATION_ERROR',
      message: 'Query parameter (q or query) is required',
      statusCode: 400
    }, { status: 400 });
  }

  // Convert to POST format and call
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockRequest = {
    json: async () => ({ query, limit, cursor }),
  } as NextRequest;
  
  // Reuse POST logic
  return POST(new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ query, limit, cursor }),
  }));
}
