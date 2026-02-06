import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-service';
import { logger } from '@/lib/logger';
import { parseBody } from '@/lib/validation';
import { captureRouteError } from '@/lib/sentry-utils';

const BatchProspectSchema = z.object({
  email: z.string().email('Invalid email format'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string().optional(),
  company: z.string().optional(),
  accountId: z.string().min(1, 'accountId is required'),
  title: z.string().optional(),
  tier: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
});

const BatchRequestSchema = z.object({
  prospects: z.array(BatchProspectSchema).min(1, 'prospects array must not be empty').max(1000, 'Maximum 1000 prospects per batch'),
  mode: z.enum(['create', 'upsert']).default('create'),
});

/**
 * POST /api/prospects/batch
 * Bulk create/update prospects for imports
 */
export async function POST(request: NextRequest) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  try {
    const parsed = await parseBody(request, BatchRequestSchema);
    if (!parsed.success) return parsed.response;
    const { prospects, mode } = parsed.data;

    let created = 0;
    let updated = 0;

    interface BatchError {
      index: number;
      email: string;
      error: string;
    }
    const errors: BatchError[] = [];

    for (let i = 0; i < prospects.length; i++) {
      const p = prospects[i];

      try {
        const name = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim();
        if (!name) {
          errors.push({ index: i, email: p.email, error: 'Name is required' });
          continue;
        }

        // Check if exists
        const existing = await prisma.people.findFirst({
          where: { email: p.email, accountId: p.accountId },
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
                custom_fields: p.customFields as Parameters<
                  typeof prisma.people.update
                >[0]['data']['custom_fields'],
                updatedAt: new Date(),
              },
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
              custom_fields: (p.customFields || {}) as Parameters<
                typeof prisma.people.create
              >[0]['data']['custom_fields'],
              updatedAt: new Date(),
            },
          });
          created++;
        }
      } catch (err) {
        errors.push({
          index: i,
          email: p.email,
          error: err instanceof Error ? err.message : 'Unknown error',
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
    captureRouteError(err, {
      route: '/api/prospects/batch',
      method: 'POST',
    });
    captureRouteError(err, {
      route: '/api/prospects/batch',
      method: 'POST',
    });
    logger.error('Batch prospect operation failed', { error: String(err) });
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
