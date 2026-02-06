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
export declare function createOffsetCursor(limit?: number): OffsetCursor;
/**
 * Advance an offset cursor
 */
export declare function advanceOffsetCursor(cursor: OffsetCursor, fetchedCount: number): OffsetCursor;
/**
 * Create a keyset cursor starting from an ID
 */
export declare function createKeysetCursor(lastId?: string): KeysetCursor;
/**
 * Create a timestamp cursor for incremental sync
 */
export declare function createTimestampCursor(since?: Date): TimestampCursor;
/**
 * Update timestamp cursor after fetching records
 */
export declare function advanceTimestampCursor(cursor: TimestampCursor, records: Array<{
    id: string;
    updatedAt?: Date;
}>): TimestampCursor;
/**
 * Serialize cursor to JSON for storage
 */
export declare function serializeCursor(cursor: PaginationCursor): string;
/**
 * Deserialize cursor from JSON
 */
export declare function deserializeCursor(json: string): PaginationCursor;
//# sourceMappingURL=pagination.d.ts.map