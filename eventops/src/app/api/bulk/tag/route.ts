import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Bulk tag people with personas or custom tags
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { personIds, tags, action } = await req.json();

  if (!personIds || !tags || !action) {
    return NextResponse.json(
      { error: 'personIds, tags, and action (add/remove/replace) required' },
      { status: 400 }
    );
  }

  let updated = 0;

  for (const personId of personIds) {
    try {
      const person = await prisma.person.findUnique({
        where: { id: personId },
      });

      if (!person) continue;

      let newTags: string[] = [];

      if (action === 'add') {
        // Add tags without duplicates
        newTags = [...new Set([...(person.persona || []), ...tags])];
      } else if (action === 'remove') {
        // Remove specified tags
        newTags = (person.persona || []).filter((tag: string) => !tags.includes(tag));
      } else if (action === 'replace') {
        // Replace all tags
        newTags = tags;
      }

      await prisma.person.update({
        where: { id: personId },
        data: { persona: newTags },
      });

      updated++;
    } catch (error) {
      console.error(`Failed to tag ${personId}:`, error);
    }
  }

  return NextResponse.json({
    success: true,
    updated,
    action,
    tags,
  });
}
