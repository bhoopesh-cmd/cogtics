/**
 * LLM Cache
 *
 * Caching layer for LLM responses to reduce costs and latency.
 * Uses in-memory cache with optional Redis backend.
 */
export interface CacheEntry<T> {
    value: T;
    createdAt: number;
    expiresAt: number;
    hits: number;
}
export interface CacheStats {
    hits: number;
    misses: number;
    entries: number;
    memoryUsedBytes: number;
    hitRate: number;
}
export interface CacheConfig {
    /** Default TTL in seconds */
    defaultTtlSeconds: number;
    /** Max entries in cache */
    maxEntries: number;
    /** Enable cache */
    enabled: boolean;
    /** Redis URL (optional) */
    redisUrl?: string;
}
export declare class LLMCache {
    private cache;
    private hits;
    private misses;
    private config;
    constructor(config?: Partial<CacheConfig>);
    /**
     * Get a cached value
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Set a cached value
     */
    set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
    /**
     * Delete a cached value
     */
    delete(key: string): Promise<void>;
    /**
     * Invalidate entries matching a pattern
     */
    invalidate(pattern: string): Promise<number>;
    /**
     * Clear all entries
     */
    clear(): Promise<void>;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Check if cache is enabled
     */
    isEnabled(): boolean;
    /**
     * Enable or disable cache
     */
    setEnabled(enabled: boolean): void;
    /**
     * Generate a cache key from prompt parameters
     */
    static generateKey(params: {
        operation: string;
        model: string;
        systemPrompt: string;
        userPrompt: string;
        temperature?: number;
    }): string;
    /**
     * Normalize key for storage
     */
    private normalizeKey;
    /**
     * Evict oldest entries when cache is full
     */
    private evictOldest;
    /**
     * Estimate memory usage of cache
     */
    private estimateMemoryUsage;
}
/**
 * Create a cache instance
 */
export declare function createLLMCache(config?: Partial<CacheConfig>): LLMCache;
export interface CachedLLMOptions {
    cache: LLMCache;
    ttlSeconds?: number;
    operation: string;
}
/**
 * Wrap an LLM call with caching
 */
export declare function withCache<T>(options: CachedLLMOptions, key: string, fn: () => Promise<T>): Promise<{
    value: T;
    cached: boolean;
}>;
//# sourceMappingURL=cache.d.ts.map