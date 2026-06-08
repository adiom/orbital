/**
 * Pagination utilities for cursor-based pagination
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

export type PaginatedResponse<T> = {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
};

export type PaginationParams = {
  cursor?: string;
  limit?: number;
};

export type DecodedCursor = {
  id: string;
  createdAt: Date;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Encode cursor from message ID and timestamp
 * Requirements: 1.2
 *
 * @param id - Message ID
 * @param createdAt - Creation timestamp
 * @returns Base64-encoded cursor
 */
export function encodeCursor(id: string, createdAt: Date): string {
  const data = JSON.stringify({
    id,
    createdAt: createdAt.toISOString(),
  });
  return Buffer.from(data).toString("base64url");
}

/**
 * Decode cursor to message ID and timestamp
 * Requirements: 1.2
 *
 * @param cursor - Base64-encoded cursor
 * @returns Decoded cursor data or null if invalid
 */
export function decodeCursor(cursor: string): DecodedCursor | null {
  try {
    const data = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(data);

    if (!parsed.id || !parsed.createdAt) {
      return null;
    }

    return {
      id: parsed.id,
      createdAt: new Date(parsed.createdAt),
    };
  } catch {
    return null;
  }
}

/**
 * Normalize pagination limit
 * Requirements: 1.1, 1.3
 *
 * @param limit - Requested limit
 * @returns Normalized limit between 1 and MAX_LIMIT
 */
export function normalizeLimit(limit?: number): number {
  if (!limit || limit < 1) {
    return DEFAULT_LIMIT;
  }

  if (limit > MAX_LIMIT) {
    return MAX_LIMIT;
  }

  return Math.floor(limit);
}

/**
 * Create paginated response
 * Requirements: 1.4
 *
 * @param items - Array of items
 * @param limit - Items per page
 * @param total - Total count (optional)
 * @returns Paginated response with cursor
 */
export function createPaginatedResponse<
  T extends { id: string; createdAt: Date },
>(items: T[], limit: number, total?: number): PaginatedResponse<T> {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;

  let nextCursor: string | undefined;
  if (hasMore && data.length > 0) {
    const lastItem = data.at(-1);
    if (lastItem) {
      nextCursor = encodeCursor(lastItem.id, lastItem.createdAt);
    }
  }

  return {
    data,
    nextCursor,
    hasMore,
    total,
  };
}

/**
 * Validate cursor format
 * Requirements: 1.2
 *
 * @param cursor - Cursor to validate
 * @returns True if cursor is valid
 */
export function isValidCursor(cursor: string): boolean {
  return decodeCursor(cursor) !== null;
}
