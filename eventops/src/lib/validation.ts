/**
 * Shared Zod Validation Wrapper
 *
 * Provides a standardized `parseBody()` function for API routes.
 * Returns typed data on success, or a 400 NextResponse on failure.
 *
 * Usage:
 *   const result = await parseBody(request, MySchema);
 *   if (!result.success) return result.response;
 *   const { data } = result; // fully typed
 */

import { ZodSchema } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

type ParseSuccess<T> = { success: true; data: T };
type ParseFailure = { success: false; response: NextResponse };
type ParseResult<T> = ParseSuccess<T> | ParseFailure;

export async function parseBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<ParseResult<T>> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
    };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Validation error',
          details: result.error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}
