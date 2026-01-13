/**
 * Cursor types for different pagination strategies
 */
export interface OffsetCursor {
  type: 'offset';
  offset: number;
  limit: number;
}

export interface KeysetCursor {
  type: 'keyset';
  lastId?: string;
  lastValue?: unknown;
}

export interface TimestampCursor {
  type: 'timestamp';
  since: Date;
  lastId?: string;
}

export interface TokenCursor {
  type: 'token';
  nextToken?: string;
  nextUrl?: string;
}

export type PaginationCursor = OffsetCursor | KeysetCursor | TimestampCursor | TokenCursor;

/**
 * Create an initial offset cursor
 */
export function createOffsetCursor(limit: number = 100): OffsetCursor {
  return { type: 'offset', offset: 0, limit };
}

/**
 * Advance an offset cursor
 */
export function advanceOffsetCursor(cursor: OffsetCursor, fetchedCount: number): OffsetCursor {
  return { ...cursor, offset: cursor.offset + fetchedCount };
}

/**
 * Create a keyset cursor starting from an ID
 */
export function createKeysetCursor(lastId?: string): KeysetCursor {
  return { type: 'keyset', lastId };
}

/**
 * Create a timestamp cursor for incremental sync
 */
export function createTimestampCursor(since?: Date): TimestampCursor {
  return { type: 'timestamp', since: since ?? new Date(0) };
}

/**
 * Update timestamp cursor after fetching records
 */
export function advanceTimestampCursor(
  cursor: TimestampCursor,
  records: Array<{ id: string; updatedAt?: Date }>
): TimestampCursor {
  if (records.length === 0) {
    return cursor;
  }

  // Find the max updatedAt from records
  let maxDate = cursor.since;
  let lastId = cursor.lastId;

  for (const record of records) {
    if (record.updatedAt && record.updatedAt > maxDate) {
      maxDate = record.updatedAt;
      lastId = record.id;
    }
  }

  return { type: 'timestamp', since: maxDate, lastId };
}

/**
 * Serialize cursor to JSON for storage
 */
export function serializeCursor(cursor: PaginationCursor): string {
  return JSON.stringify(cursor);
}

/**
 * Deserialize cursor from JSON
 */
export function deserializeCursor(json: string): PaginationCursor {
  return JSON.parse(json) as PaginationCursor;
}

