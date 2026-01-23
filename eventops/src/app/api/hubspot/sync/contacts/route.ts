import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { syncHubSpotContacts, SyncContactsOptions } from '@/lib/hubspot/sync-contacts';
import { logger } from '@/lib/logger';

/**
 * POST /api/hubspot/sync/contacts
 * Sync contacts from HubSpot to local database
 * 
 * Request body (optional):
 * {
 *   limit?: number;      // Max contacts to sync
 *   accountId?: string;  // Default account to link contacts to
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    
    if (!session || !session.user) {
      logger.warn('Unauthorized HubSpot sync attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate HubSpot API key is configured
    if (!process.env.HUBSPOT_API_KEY) {
      logger.error('HubSpot API key not configured');
      return NextResponse.json(
        { error: 'HubSpot API key not configured' },
        { status: 500 }
      );
    }

    // Parse request body
    let options: SyncContactsOptions = {};
    
    try {
      const body = await request.json();
      options = {
        limit: body.limit ? parseInt(body.limit, 10) : undefined,
        accountId: body.accountId || undefined,
      };
    } catch (error) {
      // Body is optional, use defaults
      logger.debug('No request body provided, using defaults');
    }

    // Validate options
    if (options.limit && (options.limit < 1 || options.limit > 10000)) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 10000' },
        { status: 400 }
      );
    }

    logger.info('Starting HubSpot contact sync via API', {
      userId: session.user.id,
      userEmail: session.user.email,
      options,
    });

    // Execute sync
    const result = await syncHubSpotContacts(options);

    logger.info('HubSpot contact sync completed via API', {
      userId: session.user.id,
      result,
    });

    return NextResponse.json({
      success: true,
      data: {
        imported: result.imported,
        updated: result.updated,
        total: result.imported + result.updated,
        errors: result.errors.length,
        errorDetails: result.errors.length > 0 ? result.errors : undefined,
      },
      message: `Successfully synced ${result.imported + result.updated} contacts (${result.imported} new, ${result.updated} updated)`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('HubSpot sync API error', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Contact sync failed',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/hubspot/sync/contacts
 * Get sync status and information
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        hubspotConfigured: !!process.env.HUBSPOT_API_KEY,
        endpoint: '/api/hubspot/sync/contacts',
        methods: ['GET', 'POST'],
        description: 'HubSpot contact sync endpoint',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
