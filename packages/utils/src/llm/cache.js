/**
 * LLM Cache
 *
 * Caching layer for LLM responses to reduce costs and latency.
 * Uses in-memory cache with optional Redis backend.
 */
import { createHash } from 'crypto';
// ============================================
// LLMCache Class
// ============================================
export class LLMCache {
    cache = new Map();
    hits = 0;
    misses = 0;
    config;
    constructor(config) {
        this.config = {
            defaultTtlSeconds: 3600, // 1 hour default
            maxEntries: 10000,
            enabled: true,
            ...config,
        };
    }
    /**
     * Get a cached value
     */
    async get(key) {
        if (!this.config.enabled)
            return null;
        const normalizedKey = this.normalizeKey(key);
        const entry = this.cache.get(normalizedKey);
        if (!entry) {
            this.misses++;
            return null;
        }
        // Check expiration
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(normalizedKey);
            this.misses++;
            return null;
        }
        // Update hit count
        entry.hits++;
        this.hits++;
        return entry.value;
    }
    /**
     * Set a cached value
     */
    async set(key, value, ttlSeconds) {
        if (!this.config.enabled)
            return;
        const normalizedKey = this.normalizeKey(key);
        const ttl = ttlSeconds || this.config.defaultTtlSeconds;
        // Check max entries
        if (this.cache.size >= this.config.maxEntries) {
            this.evictOldest();
        }
        const entry = {
            value,
            createdAt: Date.now(),
            expiresAt: Date.now() + (ttl * 1000),
            hits: 0,
        };
        this.cache.set(normalizedKey, entry);
    }
    /**
     * Delete a cached value
     */
    async delete(key) {
        const normalizedKey = this.normalizeKey(key);
        this.cache.delete(normalizedKey);
    }
    /**
     * Invalidate entries matching a pattern
     */
    async invalidate(pattern) {
        let invalidated = 0;
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                invalidated++;
            }
        }
        return invalidated;
    }
    /**
     * Clear all entries
     */
    async clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            entries: this.cache.size,
            memoryUsedBytes: this.estimateMemoryUsage(),
            hitRate: total > 0 ? this.hits / total : 0,
        };
    }
    /**
     * Check if cache is enabled
     */
    isEnabled() {
        return this.config.enabled;
    }
    /**
     * Enable or disable cache
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
    }
    /**
     * Generate a cache key from prompt parameters
     */
    static generateKey(params) {
        const hash = createHash('sha256');
        hash.update(JSON.stringify({
            op: params.operation,
            m: params.model,
            s: params.systemPrompt.substring(0, 500), // First 500 chars
            u: params.userPrompt.substring(0, 1000), // First 1000 chars
            t: params.temperature || 0.1,
        }));
        return `llm:${params.operation}:${hash.digest('hex').substring(0, 16)}`;
    }
    /**
     * Normalize key for storage
     */
    normalizeKey(key) {
        return key.toLowerCase().trim();
    }
    /**
     * Evict oldest entries when cache is full
     */
    evictOldest() {
        // Sort by creation time and remove oldest 10%
        const entries = Array.from(this.cache.entries())
            .sort((a, b) => a[1].createdAt - b[1].createdAt);
        const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
        for (let i = 0; i < toRemove; i++) {
            this.cache.delete(entries[i][0]);
        }
    }
    /**
     * Estimate memory usage of cache
     */
    estimateMemoryUsage() {
        let bytes = 0;
        for (const [key, entry] of this.cache.entries()) {
            bytes += key.length * 2; // UTF-16
            bytes += JSON.stringify(entry.value).length * 2;
            bytes += 32; // Overhead for entry metadata
        }
        return bytes;
    }
}
/**
 * Create a cache instance
 */
export function createLLMCache(config) {
    return new LLMCache(config);
}
/**
 * Wrap an LLM call with caching
 */
export async function withCache(options, key, fn) {
    // Check cache first
    const cached = await options.cache.get(key);
    if (cached !== null) {
        return { value: cached, cached: true };
    }
    // Execute function
    const value = await fn();
    // Cache result
    await options.cache.set(key, value, options.ttlSeconds);
    return { value, cached: false };
}
//# sourceMappingURL=cache.js.map