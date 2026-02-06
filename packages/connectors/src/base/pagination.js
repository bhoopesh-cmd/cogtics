/**
 * Create an initial offset cursor
 */
export function createOffsetCursor(limit = 100) {
    return { type: 'offset', offset: 0, limit };
}
/**
 * Advance an offset cursor
 */
export function advanceOffsetCursor(cursor, fetchedCount) {
    return { ...cursor, offset: cursor.offset + fetchedCount };
}
/**
 * Create a keyset cursor starting from an ID
 */
export function createKeysetCursor(lastId) {
    return { type: 'keyset', lastId };
}
/**
 * Create a timestamp cursor for incremental sync
 */
export function createTimestampCursor(since) {
    return { type: 'timestamp', since: since ?? new Date(0) };
}
/**
 * Update timestamp cursor after fetching records
 */
export function advanceTimestampCursor(cursor, records) {
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
export function serializeCursor(cursor) {
    return JSON.stringify(cursor);
}
/**
 * Deserialize cursor from JSON
 */
export function deserializeCursor(json) {
    return JSON.parse(json);
}
//# sourceMappingURL=pagination.js.map