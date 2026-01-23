import { Client } from '@hubspot/api-client';
import { logger } from '@/lib/logger';

// Initialize HubSpot client
const hubspotClient = new Client({
  accessToken: process.env.HUBSPOT_API_KEY,
});

/**
 * Test HubSpot connection by fetching account info
 * @returns Promise<boolean> - true if connection successful
 */
export async function testHubSpotConnection(): Promise<boolean> {
  try {
    // Test connection by fetching account info
    const accountInfo = await hubspotClient.apiRequest({
      method: 'GET',
      path: '/account-info/v3/api-usage/daily',
    });
    
    logger.info('HubSpot connection successful', {
      status: accountInfo.status,
    });
    
    return true;
  } catch (error) {
    logger.error('HubSpot connection failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

// Export client instance
export default hubspotClient;

// Export types
export type HubSpotClient = Client;
export interface HubSpotContact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    jobtitle?: string;
    linkedin?: string;
    company?: string;
    hs_object_id?: string;
    createdate?: string;
    lastmodifieddate?: string;
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface HubSpotContactsResponse {
  results: HubSpotContact[];
  paging?: {
    next?: {
      after: string;
      link?: string;
    };
  };
}

export interface HubSpotError {
  status: string;
  message: string;
  correlationId?: string;
  category?: string;
}
