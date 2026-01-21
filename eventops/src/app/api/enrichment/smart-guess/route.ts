import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { guessContactEmail } from '@/lib/email-scraper';

export const dynamic = 'force-dynamic';

/**
 * POST /api/enrichment/smart-guess
 * Use pattern matching to guess email and LinkedIn profile
 * No external API required - completely free
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
      include: { 
        account: {
          include: {
            dossier: true, // For facility count and size data
          },
        },
      },
    });

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    // Parse name
    const nameParts = person.name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    if (!firstName || !lastName) {
      return NextResponse.json({
        success: false,
        error: 'Cannot parse first/last name from: ' + person.name,
      }, { status: 400 });
    }

    // Get domain from account
    const domain = person.account?.website || 
                   person.account?.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') + '.com';

    // Determine company size for pattern scoring
    let companySize = 'Medium';
    if (person.account?.dossier?.facilityCount) {
      const facilities = parseInt(person.account.dossier.facilityCount);
      if (!isNaN(facilities)) {
        if (facilities >= 50) companySize = 'Large';
        else if (facilities <= 5) companySize = 'Small';
      }
    }

    // Get other people from same company to detect pattern
    const knownEmails = await prisma.person.findMany({
      where: {
        accountId: person.accountId,
        email: { not: null },
      },
      select: {
        name: true,
        email: true,
      },
      take: 10,
    });

    // Generate email guess
    const guess = guessContactEmail(
      firstName,
      lastName,
      domain,
      person.account?.name || '',
      companySize,
      knownEmails.filter(e => e.email).map(e => ({ name: e.name, email: e.email! }))
    );

    // Update person record
    await prisma.person.update({
      where: { id: personId },
      data: {
        email: guess.email,
        linkedin: guess.linkedinUrl,
      },
    });

    return NextResponse.json({
      success: true,
      email: guess.email,
      confidence: guess.confidence,
      pattern: guess.pattern,
      alternatives: guess.alternatives,
      linkedinUrl: guess.linkedinUrl,
      linkedinSearchUrl: guess.linkedinSearchUrl,
      detectedFromKnownEmails: knownEmails.length > 0,
    });

  } catch (error) {
    console.error('Smart email guess error:', error);
    return NextResponse.json(
      { error: 'Failed to guess email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/enrichment/smart-guess/batch
 * Bulk process multiple contacts
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

    // No limit since this is free and fast (no API calls)
    const results = [];

    // Get all people with their accounts
    const people = await prisma.person.findMany({
      where: { id: { in: personIds } },
      include: { 
        account: {
          include: { dossier: true },
        },
      },
    });

    for (const person of people) {
      const nameParts = person.name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      if (!firstName || !lastName) {
        results.push({
          personId: person.id,
          name: person.name,
          success: false,
          error: 'Cannot parse name',
        });
        continue;
      }

      const domain = person.account?.website || 
                     person.account?.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') + '.com';

      let companySize = 'Medium';
      if (person.account?.dossier?.facilityCount) {
        const facilities = parseInt(person.account.dossier.facilityCount);
        if (!isNaN(facilities)) {
          if (facilities >= 50) companySize = 'Large';
          else if (facilities <= 5) companySize = 'Small';
        }
      }

      // Get known emails from company
      const knownEmails = await prisma.person.findMany({
        where: {
          accountId: person.accountId,
          email: { not: null },
        },
        select: { name: true, email: true },
        take: 10,
      });

      const guess = guessContactEmail(
        firstName,
        lastName,
        domain,
        person.account?.name || '',
        companySize,
        knownEmails.filter(e => e.email).map(e => ({ name: e.name, email: e.email! }))
      );

      // Update in database
      await prisma.person.update({
        where: { id: person.id },
        data: {
          email: guess.email,
          linkedin: guess.linkedinUrl,
        },
      });

      results.push({
        personId: person.id,
        name: person.name,
        email: guess.email,
        confidence: guess.confidence,
        linkedinUrl: guess.linkedinUrl,
        success: true,
      });
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
    console.error('Batch smart guess error:', error);
    return NextResponse.json(
      { error: 'Failed to process batch', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
