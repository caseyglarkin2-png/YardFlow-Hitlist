import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/cache/stats - Get cache statistics
export async function GET() {
  try {
    // Count cached items
    const cacheCount = await prisma.cacheEntry.count();
    const hitCount = await prisma.cacheEntry.aggregate({
      _sum: { hitCount: true },
    });

    const recentHits = await prisma.cacheEntry.findMany({
      where: {
        expiresAt: { gt: new Date() },
      },
      orderBy: { hitCount: 'desc' },
      take: 10,
      select: {
        key: true,
        hitCount: true,
        lastAccessedAt: true,
      },
    });

    return NextResponse.json({
      totalEntries: cacheCount,
      totalHits: hitCount._sum.hitCount || 0,
      topKeys: recentHits,
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cache stats' },
      { status: 500 }
    );
  }
}

// DELETE /api/cache/clear - Clear expired cache
export async function DELETE() {
  try {
    const result = await prisma.cacheEntry.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return NextResponse.json({
      success: true,
      cleared: result.count,
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
