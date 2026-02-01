import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-service';
import { logger } from '@/lib/logger';

interface BatchProspect {
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  company?: string;
  accountId?: string;
  title?: string;
  tier?: string;
  score?: number;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

interface BatchError {
  index: number;
  email: string;
  error: string;
}

/**
 * POST /api/prospects/batch
 * Bulk create/update prospects for imports
 */
export async function POST(request: NextRequest) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  try {
    const body = await request.json();
    const { prospects, mode = 'create' }: { prospects: BatchProspect[]; mode: 'create' | 'upsert' } = body;

    if (!Array.isArray(prospects) || prospects.length === 0) {
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'prospects array is required and must not be empty',
        statusCode: 400
      }, { status: 400 });
    }

    if (prospects.length > 1000) {
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'Maximum 1000 prospects per batch',
        statusCode: 400
      }, { status: 400 });
    }

    let created = 0;
    let updated = 0;
    const errors: BatchError[] = [];

    for (let i = 0; i < prospects.length; i++) {
      const p = prospects[i];
      
      if (!p.email) {
        errors.push({ index: i, email: p.email || '', error: 'Email is required' });
        continue;
      }

      if (!p.accountId) {
        errors.push({ index: i, email: p.email, error: 'accountId is required' });
        continue;
      }

      try {
        const name = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim();
        if (!name) {
          errors.push({ index: i, email: p.email, error: 'Name is required' });
          continue;
        }

        // Check if exists
        const existing = await prisma.people.findFirst({
          where: { email: p.email, accountId: p.accountId }
        });

        if (existing) {
          if (mode === 'upsert') {
            await prisma.people.update({
              where: { id: existing.id },
              data: {
                name,
                title: p.title,
                tier: p.tier,
                score: p.score,
                tags: p.tags,
                custom_fields: p.customFields as Parameters<typeof prisma.people.update>[0]['data']['custom_fields'],
                updatedAt: new Date(),
              }
            });
            updated++;
          } else {
            errors.push({ index: i, email: p.email, error: 'Duplicate email' });
          }
        } else {
          await prisma.people.create({
            data: {
              id: crypto.randomUUID(),
              email: p.email,
              name,
              accountId: p.accountId,
              title: p.title || null,
              tier: p.tier || 'Tier 2',
              score: p.score ?? 50,
              status: 'active',
              tags: p.tags || [],
              custom_fields: (p.customFields || {}) as Parameters<typeof prisma.people.create>[0]['data']['custom_fields'],
              updatedAt: new Date(),
            }
          });
          created++;
        }
      } catch (err) {
        errors.push({ 
          index: i, 
          email: p.email, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        });
      }
    }

    logger.info('Batch prospect operation', { created, updated, errors: errors.length, mode });

    return NextResponse.json({
      created,
      updated,
      errors,
    });
  } catch (err) {
    logger.error('Batch prospect operation failed', { error: String(err) });
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
      statusCode: 500
    }, { status: 500 });
  }
}
