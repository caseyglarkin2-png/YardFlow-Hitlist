// Helper functions for Manifest app integration

export interface ManifestProfile {
  attendeeId: string;
  name: string;
  company: string;
  title: string;
}

/**
 * Generate deep link to Manifest app profile
 * Format: https://matchmaking.grip.events/manifestvegas2026/app/attendees/{attendeeId}
 */
export function getManifestProfileUrl(attendeeId: string): string {
  const baseUrl = 'https://matchmaking.grip.events/manifestvegas2026/app';
  return `${baseUrl}/attendees/${encodeURIComponent(attendeeId)}`;
}

/**
 * Generate search URL for finding a person in Manifest app
 */
export function getManifestSearchUrl(searchQuery: string): string {
  const baseUrl = 'https://matchmaking.grip.events/manifestvegas2026/app';
  return `${baseUrl}/home/network/search?q=${encodeURIComponent(searchQuery)}`;
}

/**
 * Generate deep link to send meeting request
 * Note: This may not be supported - use as fallback to search
 */
export function getManifestMeetingRequestUrl(attendeeId: string): string {
  const baseUrl = 'https://matchmaking.grip.events/manifestvegas2026/app';
  return `${baseUrl}/attendees/${encodeURIComponent(attendeeId)}/request-meeting`;
}

/**
 * Extract potential Manifest attendee ID from LinkedIn URL or email
 * This is a best-guess - actual ID mapping would require API access
 */
export function guessManifestId(people: {
  name: string;
  email?: string | null;
  linkedin?: string | null;
}): string | null {
  // Without API access, we can't reliably map to attendee IDs
  // Return null to indicate search is needed
  return null;
}

/**
 * Track when a person was viewed in Manifest app
 */
export async function trackManifestView(personId: string) {
  try {
    await fetch('/api/manifest/track-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId, viewedAt: new Date().toISOString() }),
    });
  } catch (error) {
    console.error('Failed to track Manifest view:', error);
  }
}

/**
 * Track when a meeting request was sent via Manifest
 */
export async function trackManifestMeetingRequest(personId: string) {
  try {
    await fetch('/api/manifest/track-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId, requestedAt: new Date().toISOString() }),
    });
  } catch (error) {
    console.error('Failed to track Manifest request:', error);
  }
}
