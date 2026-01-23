/**
 * Sprint Completion Email Service
 * 
 * Automatically sends performance summary emails to casey@freightroll.com
 * when sprints are completed in YardFlow projects.
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SprintMetrics {
  sprintNumber: number;
  sprintName: string;
  startDate: string;
  endDate: string;
  demo: string;
  
  // Performance metrics
  buildTime: number; // milliseconds
  buildTimeChange: number; // percentage
  apiP95Response: number; // milliseconds
  apiP95Change: number;
  bundleSize: number; // kilobytes
  bundleSizeChange: number;
  testCoverage: number; // percentage
  testCoverageChange: number;
  
  // Completion data
  tasksCompleted: number;
  tasksTotal: number;
  taskDetails: Array<{
    id: string;
    name: string;
    validation: string;
  }>;
  
  // Deployment
  productionUrl: string;
  commitHash: string;
  deploymentStatus: 'live' | 'failed' | 'pending';
  
  // Notes
  blockers?: string[];
  technicalDebt?: string[];
  recommendations?: string[];
  
  // Next sprint
  nextSprint: {
    number: number;
    name: string;
    startDate: string;
    goal: string;
  };
}

function formatMetricChange(value: number): string {
  const emoji = value < 0 ? '↓' : value > 0 ? '↑' : '→';
  const abs = Math.abs(value);
  return `${emoji}${abs.toFixed(1)}%`;
}

function generateEmailHtml(metrics: SprintMetrics): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    .header .subtitle {
      opacity: 0.9;
      font-size: 16px;
    }
    .section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      border-left: 4px solid #667eea;
    }
    .section h2 {
      margin-top: 0;
      color: #667eea;
      font-size: 18px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-top: 15px;
    }
    .metric {
      background: white;
      padding: 15px;
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .metric-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
    .metric-change {
      font-size: 14px;
      margin-left: 8px;
    }
    .metric-change.positive {
      color: #10b981;
    }
    .metric-change.negative {
      color: #ef4444;
    }
    .metric-change.neutral {
      color: #6b7280;
    }
    .task-list {
      list-style: none;
      padding: 0;
    }
    .task-item {
      background: white;
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 6px;
      border-left: 3px solid #10b981;
    }
    .task-name {
      font-weight: 600;
      color: #333;
    }
    .task-validation {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }
    .deployment {
      background: #10b981;
      color: white;
      padding: 15px;
      border-radius: 6px;
      margin-top: 15px;
    }
    .deployment a {
      color: white;
      text-decoration: underline;
      font-weight: 600;
    }
    .next-sprint {
      background: #667eea;
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 14px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      background: #10b981;
      color: white;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Sprint ${metrics.sprintNumber}: ${metrics.sprintName} <span class="badge">COMPLETE</span></h1>
    <div class="subtitle">
      ${metrics.startDate} → ${metrics.endDate}
    </div>
    <div style="margin-top: 15px; font-size: 18px;">
      🎯 <strong>Demo:</strong> ${metrics.demo}
    </div>
  </div>

  <div class="section">
    <h2>📊 Performance Metrics</h2>
    <div class="metrics-grid">
      <div class="metric">
        <div class="metric-label">Build Time</div>
        <div class="metric-value">
          ${metrics.buildTime}ms
          <span class="metric-change ${metrics.buildTimeChange < 0 ? 'positive' : metrics.buildTimeChange > 0 ? 'negative' : 'neutral'}">
            ${formatMetricChange(metrics.buildTimeChange)}
          </span>
        </div>
      </div>
      
      <div class="metric">
        <div class="metric-label">API p95 Response</div>
        <div class="metric-value">
          ${metrics.apiP95Response}ms
          <span class="metric-change ${metrics.apiP95Change < 0 ? 'positive' : metrics.apiP95Change > 0 ? 'negative' : 'neutral'}">
            ${formatMetricChange(metrics.apiP95Change)}
          </span>
        </div>
      </div>
      
      <div class="metric">
        <div class="metric-label">Bundle Size</div>
        <div class="metric-value">
          ${(metrics.bundleSize / 1024).toFixed(1)}MB
          <span class="metric-change ${metrics.bundleSizeChange < 0 ? 'positive' : metrics.bundleSizeChange > 0 ? 'negative' : 'neutral'}">
            ${formatMetricChange(metrics.bundleSizeChange)}
          </span>
        </div>
      </div>
      
      <div class="metric">
        <div class="metric-label">Test Coverage</div>
        <div class="metric-value">
          ${metrics.testCoverage.toFixed(1)}%
          <span class="metric-change ${metrics.testCoverageChange > 0 ? 'positive' : metrics.testCoverageChange < 0 ? 'negative' : 'neutral'}">
            ${formatMetricChange(metrics.testCoverageChange)}
          </span>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>✅ Completed Tasks (${metrics.tasksCompleted}/${metrics.tasksTotal})</h2>
    <ul class="task-list">
      ${metrics.taskDetails.map(task => `
        <li class="task-item">
          <div class="task-name">${task.id}: ${task.name}</div>
          <div class="task-validation">✓ ${task.validation}</div>
        </li>
      `).join('')}
    </ul>
  </div>

  <div class="section">
    <h2>🚀 Deployment</h2>
    <div class="deployment">
      <strong>Status:</strong> ${metrics.deploymentStatus.toUpperCase()}<br>
      <strong>Production URL:</strong> <a href="${metrics.productionUrl}">${metrics.productionUrl}</a><br>
      <strong>Commit:</strong> <code>${metrics.commitHash}</code>
    </div>
  </div>

  ${metrics.blockers && metrics.blockers.length > 0 ? `
    <div class="section">
      <h2>⚠️ Blockers Encountered</h2>
      <ul>
        ${metrics.blockers.map(b => `<li>${b}</li>`).join('')}
      </ul>
    </div>
  ` : ''}

  ${metrics.technicalDebt && metrics.technicalDebt.length > 0 ? `
    <div class="section">
      <h2>🔧 Technical Debt Identified</h2>
      <ul>
        ${metrics.technicalDebt.map(d => `<li>${d}</li>`).join('')}
      </ul>
    </div>
  ` : ''}

  ${metrics.recommendations && metrics.recommendations.length > 0 ? `
    <div class="section">
      <h2>💡 Recommendations</h2>
      <ul>
        ${metrics.recommendations.map(r => `<li>${r}</li>`).join('')}
      </ul>
    </div>
  ` : ''}

  <div class="next-sprint">
    <h2 style="margin-top: 0; color: white;">🎯 Next Sprint</h2>
    <div style="font-size: 18px; margin-bottom: 8px;">
      <strong>Sprint ${metrics.nextSprint.number}: ${metrics.nextSprint.name}</strong>
    </div>
    <div>Start Date: ${metrics.nextSprint.startDate}</div>
    <div style="margin-top: 10px;">
      <strong>Goal:</strong> ${metrics.nextSprint.goal}
    </div>
  </div>

  <div class="footer">
    <p><em>"Atomic tasks. Clear validation. Demoable sprints. Every time."</em></p>
    <p>YardFlow Philosophy · Generated ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `.trim();
}

function generateEmailText(metrics: SprintMetrics): string {
  return `
Sprint ${metrics.sprintNumber}: ${metrics.sprintName} - COMPLETE ✅

Duration: ${metrics.startDate} → ${metrics.endDate}
Demo: ${metrics.demo}

📊 PERFORMANCE METRICS:
- Build Time: ${metrics.buildTime}ms (${formatMetricChange(metrics.buildTimeChange)} from last sprint)
- API p95 Response: ${metrics.apiP95Response}ms (${formatMetricChange(metrics.apiP95Change)} from last sprint)
- Bundle Size: ${(metrics.bundleSize / 1024).toFixed(1)}MB (${formatMetricChange(metrics.bundleSizeChange)} from last sprint)
- Test Coverage: ${metrics.testCoverage.toFixed(1)}% (${formatMetricChange(metrics.testCoverageChange)} from last sprint)

✅ COMPLETED TASKS (${metrics.tasksCompleted}/${metrics.tasksTotal}):
${metrics.taskDetails.map(task => `- ${task.id}: ${task.name} - ${task.validation}`).join('\n')}

🚀 DEPLOYED:
- Production URL: ${metrics.productionUrl}
- Commit: ${metrics.commitHash}
- Status: ${metrics.deploymentStatus.toUpperCase()}

${metrics.blockers && metrics.blockers.length > 0 ? `
⚠️ BLOCKERS:
${metrics.blockers.map(b => `- ${b}`).join('\n')}
` : ''}

${metrics.technicalDebt && metrics.technicalDebt.length > 0 ? `
🔧 TECHNICAL DEBT:
${metrics.technicalDebt.map(d => `- ${d}`).join('\n')}
` : ''}

${metrics.recommendations && metrics.recommendations.length > 0 ? `
💡 RECOMMENDATIONS:
${metrics.recommendations.map(r => `- ${r}`).join('\n')}
` : ''}

🎯 NEXT SPRINT:
Sprint ${metrics.nextSprint.number}: ${metrics.nextSprint.name}
Start Date: ${metrics.nextSprint.startDate}
Goal: ${metrics.nextSprint.goal}

---
"Atomic tasks. Clear validation. Demoable sprints. Every time."
YardFlow Philosophy
  `.trim();
}

export async function sendSprintCompletionEmail(
  metrics: SprintMetrics
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not set, skipping sprint completion email');
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    const { data, error } = await resend.emails.send({
      from: 'YardFlow Sprints <onboarding@resend.dev>',
      replyTo: 'casey@freightroll.com',
      to: ['casey@freightroll.com'],
      subject: `[YardFlow] Sprint ${metrics.sprintNumber} Complete: ${metrics.sprintName}`,
      html: generateEmailHtml(metrics),
      text: generateEmailText(metrics),
      tags: [
        { name: 'sprint', value: metrics.sprintNumber.toString() },
        { name: 'project', value: 'yardflow-hitlist' },
      ],
    });

    if (error) {
      console.error('Failed to send sprint completion email:', error);
      return { success: false, error: error.message };
    }

    console.log('Sprint completion email sent:', data?.id);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending sprint completion email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Example usage:
 * 
 * const metrics: SprintMetrics = {
 *   sprintNumber: 18,
 *   sprintName: 'Google Workspace Integration',
 *   startDate: 'Jan 23, 2026',
 *   endDate: 'Jan 27, 2026',
 *   demo: 'User connects Google account, meetings auto-import from Calendar, email replies tracked automatically',
 *   buildTime: 4250,
 *   buildTimeChange: -12.5,
 *   apiP95Response: 185,
 *   apiP95Change: -8.2,
 *   bundleSize: 1024 * 1.2,
 *   bundleSizeChange: 3.1,
 *   testCoverage: 78.5,
 *   testCoverageChange: 5.2,
 *   tasksCompleted: 6,
 *   tasksTotal: 6,
 *   taskDetails: [
 *     { id: '18.1', name: 'Google OAuth Setup', validation: 'OAuth flow tested, tokens stored' },
 *     { id: '18.2', name: 'Calendar Sync', validation: '100 events imported successfully' },
 *   ],
 *   productionUrl: 'https://yard-flow-hitlist.vercel.app',
 *   commitHash: '8b906ce',
 *   deploymentStatus: 'live',
 *   recommendations: ['Consider rate limiting for calendar API', 'Add retry logic for Gmail sync'],
 *   nextSprint: {
 *     number: 19,
 *     name: 'Bulk Operations & Performance',
 *     startDate: 'Jan 28, 2026',
 *     goal: 'High-performance bulk operations for managing thousands of records efficiently',
 *   },
 * };
 * 
 * await sendSprintCompletionEmail(metrics);
 */
