import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { db as prisma } from '@/lib/db';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

/**
 * POST /api/reports/pdf - Generate PDF report
 */
export async function POST(req: NextRequest) {
  const authResult = await authServiceOrSession(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user from auth result
  const userId =
    authResult.type === 'session'
      ? authResult.userId
      : req.headers.get('x-user-id') || authResult.userId;

  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!user?.activeEventId) {
    return NextResponse.json({ error: 'No active event' }, { status: 400 });
  }

  const { dateRange } = await req.json();

  try {
    // Gather report data
    const event = await prisma.events.findUnique({
      where: { id: user.activeEventId },
    });

    const accounts = await prisma.target_accounts.count({
      where: { eventId: user.activeEventId },
    });

    const people = await prisma.people.count({
      where: { target_accounts: { eventId: user.activeEventId } },
    });

    const meetings = await prisma.meeting.count({
      where: {
        people: {
          target_accounts: { eventId: user.activeEventId },
        },
      },
    });

    const outreach = await prisma.outreach.groupBy({
      by: ['status'],
      where: {
        people: {
          target_accounts: { eventId: user.activeEventId },
        },
      },
      _count: true,
    });

    // Calculate metrics
    const totalSent = outreach.reduce((sum, o) => sum + (o.status !== 'DRAFT' ? o._count : 0), 0);
    const opened = outreach.find((o) => o.status === 'OPENED')?._count || 0;
    const replied = outreach.find((o) => o.status === 'RESPONDED')?._count || 0;

    const openRate = totalSent > 0 ? ((opened / totalSent) * 100).toFixed(1) : '0';
    const replyRate = totalSent > 0 ? ((replied / totalSent) * 100).toFixed(1) : '0';

    // Generate HTML for PDF conversion
    const html = generateReportHTML({
      event: event?.name || 'Event Report',
      dateRange,
      metrics: {
        accounts,
        people,
        meetings,
        totalSent,
        openRate,
        replyRate,
      },
      outreach,
    });

    // In production, use puppeteer or similar to convert HTML to PDF
    // For now, return HTML that can be printed as PDF

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="EventOps_Report_${new Date().toISOString().split('T')[0]}.html"`,
      },
    });

    /*
    // Example with Puppeteer (uncomment when ready):
    
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.setContent(html);
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    });
    
    await browser.close();
    
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="EventOps_Report_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
    */
  } catch (error) {
    captureRouteError(error, {
      route: '/api/reports/pdf',
      method: 'POST',
      userId: authResult?.userId,
    });
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PDF generation failed' },
      { status: 500 }
    );
  }
}

interface ReportData {
  event: string;
  dateRange?: string;
  metrics: {
    accounts: number;
    people: number;
    meetings: number;
    totalSent: number;
    openRate: string;
    replyRate: string;
  };
  outreach: { status: string; _count: number }[];
}

function generateReportHTML(data: ReportData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>EventOps Report</title>
  <style>
    @page { margin: 1cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .header h1 { font-size: 32px; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: #f8f9fa;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    .metric-value {
      font-size: 36px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 5px;
    }
    .metric-label {
      font-size: 14px;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      font-size: 24px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #667eea;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #dee2e6;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e9ecef;
      text-align: center;
      color: #6c757d;
      font-size: 12px;
    }
    @media print {
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 ${data.event}</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    ${data.dateRange ? `<p>Period: ${data.dateRange}</p>` : ''}
  </div>

  <div class="metrics">
    <div class="metric-card">
      <div class="metric-value">${data.metrics.accounts}</div>
      <div class="metric-label">Target Accounts</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${data.metrics.people}</div>
      <div class="metric-label">Contacts</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${data.metrics.meetings}</div>
      <div class="metric-label">Meetings</div>
    </div>
  </div>

  <div class="section">
    <h2>Outreach Performance</h2>
    <div class="metrics" style="grid-template-columns: repeat(3, 1fr);">
      <div class="metric-card">
        <div class="metric-value">${data.metrics.totalSent}</div>
        <div class="metric-label">Total Sent</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${data.metrics.openRate}%</div>
        <div class="metric-label">Open Rate</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${data.metrics.replyRate}%</div>
        <div class="metric-label">Reply Rate</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Status</th>
          <th>Count</th>
          <th>Percentage</th>
        </tr>
      </thead>
      <tbody>
        ${data.outreach
          .map(
            (item) => `
          <tr>
            <td>${item.status}</td>
            <td>${item._count}</td>
            <td>${((item._count / data.metrics.totalSent) * 100).toFixed(1)}%</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>EventOps - Event Intelligence Platform</p>
    <p>https://yardflow-hitlist-production-2f41.up.railway.app</p>
    <p class="no-print">
      <button onclick="window.print()" style="margin-top: 10px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Print / Save as PDF
      </button>
    </p>
  </div>
</body>
</html>
  `;
}
