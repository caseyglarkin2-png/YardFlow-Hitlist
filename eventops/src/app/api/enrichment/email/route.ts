import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { findEmail, validateEmailFormat } from '@/lib/email-enrichment';

export const dynamic = 'force-dynamic';

/**
 * POST /api/enrichment/email
 * Enrich a single contact with email from Hunter.io
 * 
 * Body: { personId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { personId } = body;

    if (!personId) {
      return NextResponse.json({ error: 'personId required' }, { status: 400 });
    }

    // Get person with account data
    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: { account: true },
    });

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    // Parse name
    const nameParts = person.name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Get domain from account
    const domain = person.account?.website || person.account?.name.toLowerCase().replace(/\s+/g, '') + '.com';

    // Call Hunter.io API
    const result = await findEmail(firstName, lastName, domain);

    if (!result.email) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Email not found',
        confidence: 0,
      });
    }

    // Validate email format
    if (!validateEmailFormat(result.email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format',
        confidence: 0,
      });
    }

    // Update person record
    await prisma.person.update({
      where: { id: personId },
      data: {
        email: result.email,
        // Add enrichment metadata if we add these fields
      },
    });

    return NextResponse.json({
      success: true,
      email: result.email,
      confidence: result.confidence,
      source: result.source,
    });

  } catch (error) {
    console.error('Email enrichment error:', error);
    return NextResponse.json(
      { error: 'Failed to enrich email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/enrichment/email/batch
 * Bulk enrich multiple contacts
 * 
 * Body: { personIds: string[] }
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { personIds } = body;

    if (!Array.isArray(personIds) || personIds.length === 0) {
      return NextResponse.json({ error: 'personIds array required' }, { status: 400 });
    }

    // Limit batch size to avoid timeouts
    if (personIds.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 contacts per batch' }, { status: 400 });
    }

    // Get all people
    const people = await prisma.person.findMany({
      where: { id: { in: personIds } },
      include: { account: true },
    });

    const results = [];
    
    for (const person of people) {
      const nameParts = person.name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const domain = person.account?.website || person.account?.name.toLowerCase().replace(/\s+/g, '') + '.com';

      const result = await findEmail(firstName, lastName, domain);

      if (result.email && validateEmailFormat(result.email)) {
        // Update in database
        await prisma.person.update({
          where: { id: person.id },
          data: { email: result.email },
        });

        results.push({
          personId: person.id,
          name: person.name,
          email: result.email,
          confidence: result.confidence,
          success: true,
        });
      } else {
        results.push({
          personId: person.id,
          name: person.name,
          email: null,
          confidence: 0,
          success: false,
          error: result.error || 'Email not found',
        });
      }

      // Rate limit: 1 request per second
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      total: results.length,
      enriched: successCount,
      failed: results.length - successCount,
      results,
    });

  } catch (error) {
    console.error('Batch enrichment error:', error);
    return NextResponse.json(
      { error: 'Failed to enrich emails', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
