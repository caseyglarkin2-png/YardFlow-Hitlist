// Pagination helper utilities for API routes

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

/**
 * Parse pagination parameters from URL search params
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const cursor = searchParams.get('cursor') || undefined;
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam), MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;

  return { cursor, limit };
}

/**
 * Build paginated response with cursor
 */
export function buildPaginatedResponse<T extends { id: string }>(
  data: T[],
  limit: number,
  total?: number
): PaginatedResponse<T> {
  const hasMore = data.length > limit;
  const responseData = hasMore ? data.slice(0, limit) : data;
  const nextCursor = hasMore ? responseData[responseData.length - 1].id : undefined;

  return {
    data: responseData,
    nextCursor,
    hasMore,
    total,
  };
}

/**
 * Get Prisma cursor pagination params
 */
export function getPrismaCursorParams(cursor?: string, limit: number = DEFAULT_PAGE_SIZE) {
  return {
    take: limit + 1, // Fetch one extra to check if there are more
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  };
}
