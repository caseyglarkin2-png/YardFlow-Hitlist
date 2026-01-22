/**
 * Email Activity Tracker Utility
 * 
 * Provides functions to track email opens, clicks, and replies
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Generate a tracking pixel URL for email opens
 */
export function generateTrackingPixel(outreachId: string): string {
  return `${BASE_URL}/api/outreach/track?id=${outreachId}`;
}

/**
 * Generate a tracked link for email clicks
 */
export function generateTrackedLink(outreachId: string, url: string): string {
  const encoded = encodeURIComponent(url);
  return `${BASE_URL}/api/outreach/track-link?id=${outreachId}&url=${encoded}`;
}

/**
 * Inject tracking pixel into HTML email body
 */
export function injectTrackingPixel(htmlBody: string, outreachId: string): string {
  const trackingPixel = `<img src="${generateTrackingPixel(outreachId)}" width="1" height="1" alt="" style="display:none" />`;
  
  // Try to inject before closing </body> tag
  if (htmlBody.includes('</body>')) {
    return htmlBody.replace('</body>', `${trackingPixel}</body>`);
  }
  
  // Otherwise append to end
  return `${htmlBody}${trackingPixel}`;
}

/**
 * Wrap links in tracking redirects
 */
export function wrapLinksWithTracking(htmlBody: string, outreachId: string): string {
  // Replace href="..." with tracked links
  return htmlBody.replace(
    /href="([^"]+)"/g,
    (match, url) => {
      // Skip tracking pixel and mailto links
      if (url.includes('/api/outreach/track') || url.startsWith('mailto:')) {
        return match;
      }
      return `href="${generateTrackedLink(outreachId, url)}"`;
    }
  );
}

/**
 * Track email activity (client-side)
 */
export async function trackEmailActivity(
  outreachId: string,
  type: 'OPENED' | 'CLICKED' | 'REPLIED',
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await fetch('/api/outreach/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outreachId, type, metadata }),
    });
  } catch (error) {
    console.error('Failed to track email activity:', error);
  }
}
