import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations - List available integrations
 * POST /api/integrations - Create new integration connection
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // In production, fetch from integrations table
  // For now, return available integrations
  const integrations = [
    {
      id: 'salesforce',
      name: 'Salesforce',
      description: 'Sync accounts, contacts, and opportunities',
      status: 'available',
      features: ['Bi-directional sync', 'Real-time updates', 'Custom field mapping'],
      requiresAuth: true,
      authType: 'oauth2',
    },
    {
      id: 'hubspot',
      name: 'HubSpot',
      description: 'Sync companies, contacts, and deals',
      status: 'available',
      features: ['Contact sync', 'Email tracking', 'Pipeline visibility'],
      requiresAuth: true,
      authType: 'api_key',
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Get notifications and updates in Slack',
      status: 'available',
      features: ['Real-time notifications', 'Channel posting', 'Bot commands'],
      requiresAuth: true,
      authType: 'oauth2',
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Connect to 5000+ apps via Zapier',
      status: 'available',
      features: ['Webhook triggers', 'Actions', 'Multi-step workflows'],
      requiresAuth: true,
      authType: 'api_key',
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Sync meetings with Google Calendar',
      status: 'available',
      features: ['Two-way sync', 'Automatic invites', 'Availability checking'],
      requiresAuth: true,
      authType: 'oauth2',
    },
  ];

  return NextResponse.json({ integrations });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { integrationId, config } = await req.json();

  // In production, initiate OAuth flow or save API key
  // For now, return success
  
  return NextResponse.json({
    integration: {
      id: Math.random().toString(36),
      integrationId,
      status: 'connected',
      connectedAt: new Date().toISOString(),
      config,
    },
  }, { status: 201 });
}
