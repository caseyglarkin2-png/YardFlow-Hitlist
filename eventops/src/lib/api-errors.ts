/**
 * Standardized API Error Responses
 *
 * Provides consistent error formatting across all API routes.
 * Errors under 500 are client errors (user-fixable).
 * Errors 500+ are server errors (log with errorId for debugging).
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: string;
  errorId?: string;
  retryAfter?: number;
}

/**
 * Create a standardized API error response
 */
export function apiError(
  message: string,
  code: string,
  status: number,
  options?: {
    details?: string;
    retryAfter?: number;
    headers?: Record<string, string>;
  }
): NextResponse<ApiErrorResponse> {
  const errorId = status >= 500 ? crypto.randomUUID().slice(0, 8) : undefined;

  // Log server errors for debugging
  if (status >= 500) {
    logger.error('API Server Error', {
      message,
      code,
      status,
      details: options?.details,
      errorId,
    });
  }

  const body: ApiErrorResponse = {
    error: message,
    code,
  };

  if (options?.details) body.details = options.details;
  if (errorId) body.errorId = errorId;
  if (options?.retryAfter) body.retryAfter = options.retryAfter;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  };

  if (options?.retryAfter) {
    headers['Retry-After'] = String(options.retryAfter);
  }

  return NextResponse.json(body, { status, headers });
}

/**
 * Pre-built common error responses
 */
export const Errors = {
  // Auth errors (401)
  unauthorized: (details?: string) =>
    apiError('Unauthorized', 'AUTH_REQUIRED', 401, { details }),

  // Not found (404)
  notFound: (resource: string) =>
    apiError(`${resource} not found`, 'NOT_FOUND', 404),

  // Bad request (400)
  badRequest: (message: string, details?: string) =>
    apiError(message, 'BAD_REQUEST', 400, { details }),

  // Validation error (400)
  validation: (details: string) =>
    apiError('Validation failed', 'VALIDATION_ERROR', 400, { details }),

  // Missing data (422)
  unprocessable: (message: string, code = 'UNPROCESSABLE') =>
    apiError(message, code, 422),

  // Rate limited (429)
  rateLimited: (retryAfter: number) =>
    apiError(
      `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      'RATE_LIMITED',
      429,
      { retryAfter }
    ),

  // Service unavailable (503)
  serviceUnavailable: (service: string) =>
    apiError(`${service} is temporarily unavailable`, 'SERVICE_UNAVAILABLE', 503),

  // Server error (500)
  serverError: (message = 'An unexpected error occurred') =>
    apiError(message, 'SERVER_ERROR', 500),
};

/**
 * User-friendly error messages for GTM frontend
 * These should be copied to the GTM repo for client-side display
 */
export const UserFriendlyMessages: Record<string, string> = {
  AUTH_REQUIRED: 'Please log in to continue.',
  NOT_FOUND: 'The requested item was not found.',
  BAD_REQUEST: 'Invalid request. Please check your input.',
  VALIDATION_ERROR: 'Please fix the validation errors and try again.',
  MISSING_EMAIL: 'This contact has no email address. Please add one first.',
  INVALID_EMAIL: 'The email address format is invalid.',
  ALREADY_SENT: 'This email was already sent recently.',
  WRONG_CHANNEL: 'This outreach is not configured for email.',
  RATE_LIMITED: 'You are sending too many emails. Please wait a moment.',
  SERVICE_UNAVAILABLE: 'Email service is temporarily unavailable. Please try again later.',
  SEND_FAILED: 'Failed to send email. Our team has been notified.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again.',
};
