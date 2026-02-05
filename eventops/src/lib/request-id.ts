/**
 * Request ID utilities for distributed tracing
 *
 * The middleware automatically generates or propagates x-request-id headers.
 * Use these utilities to access the request ID in API routes.
 */

import type { NextRequest } from 'next/server';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Extract request ID from NextRequest headers
 * Falls back to generating a new ID if not present (shouldn't happen with middleware)
 */
export function getRequestId(request: NextRequest): string {
  return request.headers.get(REQUEST_ID_HEADER) || generateRequestId();
}

/**
 * Generate a unique request ID
 * Format: timestamp(base36)-random (e.g., "lxyz123-a1b2c3")
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Add request ID to response headers
 * Useful when creating responses that bypass middleware
 */
export function addRequestIdHeader(headers: Headers, requestId: string): void {
  headers.set(REQUEST_ID_HEADER, requestId);
}
