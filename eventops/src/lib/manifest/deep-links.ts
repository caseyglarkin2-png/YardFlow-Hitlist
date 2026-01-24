import { logger } from '@/lib/logger';

/**
 * Manifest 2026 Deep Links Module
 * 
 * Generates deep links to Manifest matchmaking app for:
 * - Attendee profiles
 * - Meeting requests
 * - Conference schedule
 * 
 * Base URL: https://matchmaking.grip.events/manifestvegas2026/app
 */

const MANIFEST_BASE_URL = 'https://matchmaking.grip.events/manifestvegas2026/app';

/**
 * Generate deep link to attendee profile on Manifest app.
 * 
 * @param email - Attendee email address
 * @returns Full URL to profile, or null if email invalid
 */
export function getManifestProfileUrl(email: string): string | null {
  if (!email || !isValidEmail(email)) {
    logger.warn('Invalid email for Manifest profile URL', { email });
    return null;
  }

  // Manifest uses email as unique identifier in URL
  // Format: /attendee/{email}
  const profileUrl = `${MANIFEST_BASE_URL}/attendee/${encodeURIComponent(email)}`;
  
  logger.debug('Generated Manifest profile URL', { email, profileUrl });
  
  return profileUrl;
}

/**
 * Generate deep link to send meeting request on Manifest app.
 * 
 * @param email - Target attendee email
 * @param message - Pre-filled meeting request message (optional)
 * @returns Full URL to meeting request form
 */
export function getManifestMeetingRequestUrl(
  email: string,
  message?: string
): string | null {
  if (!email || !isValidEmail(email)) {
    logger.warn('Invalid email for Manifest meeting request URL', { email });
    return null;
  }

  let url = `${MANIFEST_BASE_URL}/meeting-request/${encodeURIComponent(email)}`;
  
  // Add pre-filled message if provided
  if (message) {
    const params = new URLSearchParams({ message });
    url += `?${params.toString()}`;
  }
  
  logger.debug('Generated Manifest meeting request URL', { email, hasMessage: !!message });
  
  return url;
}

/**
 * Generate deep link to Manifest conference schedule.
 * 
 * @returns URL to full conference schedule
 */
export function getManifestScheduleUrl(): string {
  return `${MANIFEST_BASE_URL}/schedule`;
}

/**
 * Generate deep link to exhibitor booth page.
 * 
 * @param boothNumber - Booth number (default: 1847 for YardFlow)
 * @returns URL to booth page
 */
export function getManifestBoothUrl(boothNumber: string = '1847'): string {
  return `${MANIFEST_BASE_URL}/exhibitor/${boothNumber}`;
}

/**
 * Validate email format.
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if contact is registered for Manifest 2026.
 * 
 * Note: This would ideally call Manifest API to verify.
 * For now, we assume all contacts in our database are potential attendees.
 * 
 * @param email - Contact email
 * @returns True if likely attending Manifest
 */
export async function isManifestAttendee(email: string): Promise<boolean> {
  // Future: Call Manifest API to verify registration
  // For now, basic validation
  
  if (!isValidEmail(email)) {
    return false;
  }

  // Could add logic to check:
  // - Manifest attendee list import
  // - Conference registration database
  // - Email domain patterns (logistics companies)
  
  logger.debug('Checking Manifest attendance', { email });
  
  // Default to true for valid emails (assume potential attendees)
  return true;
}

/**
 * Track Manifest link clicks for analytics.
 * 
 * @param contactId - Contact who clicked the link
 * @param linkType - Type of link clicked
 */
export async function trackManifestLinkClick(
  contactId: string,
  linkType: 'profile' | 'meeting_request' | 'schedule' | 'booth'
): Promise<void> {
  logger.info('Manifest link clicked', { contactId, linkType });
  
  // Future: Store in analytics table or send to tracking service
  // For now, just log for observability
}

/**
 * Manifest conference details (for reference in UI).
 */
export const MANIFEST_2026_DETAILS = {
  name: 'Manifest Vegas 2026',
  dates: 'February 10-12, 2026',
  location: 'Las Vegas, NV',
  venue: 'Las Vegas Convention Center',
  yardflowBooth: '1847',
  websiteUrl: 'https://www.manifestvegas.com',
  matchmakingUrl: MANIFEST_BASE_URL,
} as const;
