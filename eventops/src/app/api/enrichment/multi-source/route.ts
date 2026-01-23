import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { enrichContact, batchEnrichContacts } from '@/lib/contact-enrichment';

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { contacts, options } = body;

    // Validate input
    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json(
        { error: 'Invalid request: contacts array required' },
        { status: 400 }
      );
    }

    // Single contact enrichment
    if (contacts.length === 1) {
      const contact = contacts[0];
      if (!contact.name || !contact.companyName) {
        return NextResponse.json(
          { error: 'Invalid contact: name and companyName required' },
          { status: 400 }
        );
      }

      const enriched = await enrichContact(
        contact.name,
        contact.companyName,
        options || {}
      );

      return NextResponse.json({ 
        success: true, 
        contact: enriched 
      });
    }

    // Batch enrichment
    const enriched = await batchEnrichContacts(contacts, options || {});

    return NextResponse.json({
      success: true,
      contacts: enriched,
      summary: {
        total: enriched.length,
        withEmail: enriched.filter(c => c.email).length,
        withLinkedIn: enriched.filter(c => c.linkedInUrl).length,
        averageQuality: Math.round(
          enriched.reduce((sum, c) => sum + c.dataQualityScore, 0) / enriched.length
        ),
      },
    });
  } catch (error) {
    console.error('Enrichment error:', error);
    return NextResponse.json(
      { error: 'Enrichment failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
