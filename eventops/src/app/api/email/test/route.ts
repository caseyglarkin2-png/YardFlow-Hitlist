import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/email/test
 * Send a test email to verify SendGrid configuration
 * 
 * Requires auth (session or service key)
 * Body: { to: "email@example.com" }
 */
export async function POST(req: NextRequest) {
  const authResult = await authServiceOrSession(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const toEmail = body.to;

    if (!toEmail) {
      return NextResponse.json({ error: 'Missing "to" email address' }, { status: 400 });
    }

    // Check SendGrid configuration
    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json({ 
        error: 'SendGrid not configured - SENDGRID_API_KEY missing' 
      }, { status: 503 });
    }

    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'casey@freightroll.com';

    // Import SendGrid
    const sgMail = await import('@sendgrid/mail');
    sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: toEmail,
      from: fromEmail,
      subject: '✅ YardFlow Email Test - Success!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #22c55e;">Email Test Successful!</h1>
          <p>This is a test email from YardFlow Hitlist.</p>
          <hr/>
          <p><strong>From:</strong> ${fromEmail}</p>
          <p><strong>To:</strong> ${toEmail}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'unknown'}</p>
          <hr/>
          <p style="color: #666; font-size: 12px;">
            If you received this email, SendGrid is correctly configured.
          </p>
        </div>
      `,
    };

    logger.info('Sending test email', { to: toEmail, from: fromEmail });

    await sgMail.default.send(msg);

    logger.info('Test email sent successfully', { to: toEmail });

    return NextResponse.json({ 
      success: true,
      message: 'Test email sent successfully',
      details: {
        from: fromEmail,
        to: toEmail,
        timestamp: new Date().toISOString(),
      }
    });

  } catch (err) {
    logger.error('Failed to send test email', { 
      error: err instanceof Error ? err.message : String(err) 
    });
    
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to send test email',
      details: message
    }, { status: 500 });
  }
}

/**
 * GET /api/email/test
 * Check email configuration (no auth required for health checks)
 */
export async function GET(_req: NextRequest) {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'casey@freightroll.com';
  const hasApiKey = !!process.env.SENDGRID_API_KEY;

  return NextResponse.json({
    configured: hasApiKey,
    fromEmail: hasApiKey ? fromEmail : 'NOT_CONFIGURED',
    message: hasApiKey 
      ? `SendGrid configured. Sending from: ${fromEmail}`
      : 'SENDGRID_API_KEY not set',
  });
}
