import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Send email via SendGrid
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { outreachId } = await req.json();

  if (!outreachId) {
    return NextResponse.json({ error: 'outreachId required' }, { status: 400 });
  }

  // Get outreach with person details
  const outreach = await prisma.outreach.findUnique({
    where: { id: outreachId },
    include: {
      people: {
        include: {
          target_accounts: true,
        },
      },
    },
  });

  if (!outreach) {
    return NextResponse.json({ error: 'Outreach not found' }, { status: 404 });
  }

  if (!outreach.people.email) {
    return NextResponse.json(
      { error: 'Person has no email address' },
      { status: 400 }
    );
  }

  if (outreach.channel !== 'EMAIL') {
    return NextResponse.json(
      { error: 'Outreach is not an email' },
      { status: 400 }
    );
  }

  // Check if SendGrid is configured
  if (!process.env.SENDGRID_API_KEY) {
    return NextResponse.json(
      { error: 'SendGrid not configured - set SENDGRID_API_KEY in environment variables' },
      { status: 503 }
    );
  }

  try {
    // Send email via SendGrid
    const sgMail = await import('@sendgrid/mail');
    sgMail.default.setApiKey(process.env.SENDGRID_API_KEY || '');

    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@yardflow.com';

    const trackingPixel = `<img src="${process.env.NEXT_PUBLIC_APP_URL}/api/outreach/track/${outreach.id}/open" width="1" height="1" />`;

    const msg = {
      to: outreach.people.email,
      from: fromEmail,
      subject: outreach.subject || 'YardFlow - Optimizing Waste Management',
      html: outreach.message + trackingPixel,
    };

    await sgMail.default.send(msg);

    // Update outreach status
    await prisma.outreach.update({
      where: { id: outreachId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        sentBy: session.user.id,
      },
    });

    return NextResponse.json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('SendGrid error:', error);

    // Update outreach with error
    await prisma.outreach.update({
      where: { id: outreachId },
      data: {
        status: 'BOUNCED',
        bouncedAt: new Date(),
        notes: `SendGrid error: ${error.message}`,
      },
    });

    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
}
