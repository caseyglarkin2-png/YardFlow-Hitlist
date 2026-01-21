// HubSpot CRM integration helpers

export interface HubSpotContact {
  email: string;
  firstname?: string;
  lastname?: string;
  company?: string;
  jobtitle?: string;
  phone?: string;
  linkedin_url?: string;
  // Custom properties
  icp_score?: number;
  persona_type?: string;
  event_name?: string;
}

export interface HubSpotActivity {
  engagement: {
    type: string; // EMAIL, MEETING, NOTE, CALL
    timestamp: number;
  };
  associations: {
    contactIds: number[];
  };
  metadata: {
    subject?: string;
    body?: string;
    status?: string;
  };
}

/**
 * Convert EventOps person to HubSpot contact format
 */
export function personToHubSpotContact(person: {
  name: string;
  email?: string | null;
  title?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  account: {
    name: string;
    icpScore?: number | null;
  };
  isExecOps: boolean;
  isOps: boolean;
  isProc: boolean;
  isSales: boolean;
  isTech: boolean;
}): HubSpotContact {
  const [firstname, ...lastnameParts] = person.name.split(' ');
  const lastname = lastnameParts.join(' ');

  // Determine persona
  let persona = 'Non-Ops';
  if (person.isExecOps) persona = 'Executive Ops';
  else if (person.isOps) persona = 'Operations';
  else if (person.isProc) persona = 'Procurement';
  else if (person.isSales) persona = 'Sales';
  else if (person.isTech) persona = 'Technology';

  return {
    email: person.email || '',
    firstname,
    lastname,
    company: person.account.name,
    jobtitle: person.title || undefined,
    phone: person.phone || undefined,
    linkedin_url: person.linkedin || undefined,
    icp_score: person.account.icpScore || undefined,
    persona_type: persona,
    event_name: 'Manifest 2026',
  };
}

/**
 * Convert outreach to HubSpot email activity
 */
export function outreachToHubSpotActivity(outreach: {
  id: string;
  subject?: string | null;
  message: string;
  status: string;
  sentAt?: Date | null;
  openedAt?: Date | null;
}): HubSpotActivity {
  return {
    engagement: {
      type: 'EMAIL',
      timestamp: outreach.sentAt ? outreach.sentAt.getTime() : Date.now(),
    },
    associations: {
      contactIds: [], // Will be populated by HubSpot contact ID
    },
    metadata: {
      subject: outreach.subject || 'Outreach from EventOps',
      body: outreach.message,
      status: outreach.status,
    },
  };
}

/**
 * Convert meeting to HubSpot meeting activity
 */
export function meetingToHubSpotActivity(meeting: {
  id: string;
  scheduledAt: Date;
  duration: number;
  outcome?: string | null;
  notes?: string | null;
}): HubSpotActivity {
  return {
    engagement: {
      type: 'MEETING',
      timestamp: meeting.scheduledAt.getTime(),
    },
    associations: {
      contactIds: [],
    },
    metadata: {
      subject: `Event Meeting - ${meeting.duration} min`,
      body: meeting.notes || meeting.outcome || 'Meeting scheduled via EventOps',
      status: 'COMPLETED',
    },
  };
}

/**
 * Sync contact to HubSpot
 */
export async function syncContactToHubSpot(
  contact: HubSpotContact,
  apiKey: string
): Promise<{ id: number; success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ properties: contact }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { id: 0, success: false, error };
    }

    const data = await response.json();
    return { id: data.id, success: true };
  } catch (error: any) {
    return { id: 0, success: false, error: error.message };
  }
}

/**
 * Create activity in HubSpot
 */
export async function createHubSpotActivity(
  activity: HubSpotActivity,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(activity),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Search for existing contact in HubSpot by email
 */
export async function findHubSpotContactByEmail(
  email: string,
  apiKey: string
): Promise<{ id?: number; found: boolean }> {
  try {
    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'email',
                  operator: 'EQ',
                  value: email,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return { id: data.results[0].id, found: true };
    }

    return { found: false };
  } catch (error) {
    return { found: false };
  }
}
