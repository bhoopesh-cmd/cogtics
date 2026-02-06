/**
 * LLM Cache Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMCache, createLLMCache, withCache } from '../cache.js';

describe('LLMCache', () => {
  let cache: LLMCache;

  beforeEach(() => {
    cache = new LLMCache({
      defaultTtlSeconds: 60,
      maxEntries: 100,
      enabled: true,
    });
  });

  describe('get and set', () => {
    it('should cache and retrieve values', async () => {
      await cache.set('test_key', { data: 'test_value' });
      
      const result = await cache.get<{ data: string }>('test_key');
      
      expect(result).toEqual({ data: 'test_value' });
    });

    it('should return null for missing keys', async () => {
      const result = await cache.get('non_existent');
      expect(result).toBeNull();
    });

    it('should normalize keys', async () => {
      await cache.set('TEST_KEY', 'value');
      
      const result = await cache.get('test_key');
      expect(result).toBe('value');
    });

    it('should respect TTL', async () => {
      await cache.set('expiring_key', 'value', 0.001); // 1ms TTL
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await cache.get('expiring_key');
      expect(result).toBeNull();
    });

    it('should not cache when disabled', async () => {
      cache.setEnabled(false);
      
      await cache.set('key', 'value');
      const result = await cache.get('key');
      
      expect(result).toBeNull();
    });
  });

  describe('delete and invalidate', () => {
    it('should delete specific keys', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      await cache.delete('key1');
      
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBe('value2');
    });

    it('should invalidate by pattern', async () => {
      await cache.set('llm:enrichment:abc123', 'value1');
      await cache.set('llm:enrichment:def456', 'value2');
      await cache.set('llm:anomaly:ghi789', 'value3');
      
      const invalidated = await cache.invalidate('llm:enrichment:*');
      
      expect(invalidated).toBe(2);
      expect(await cache.get('llm:enrichment:abc123')).toBeNull();
      expect(await cache.get('llm:anomaly:ghi789')).toBe('value3');
    });

    it('should clear all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      await cache.clear();
      
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
      
      const stats = cache.getStats();
      expect(stats.entries).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should track cache statistics', async () => {
      await cache.set('key', 'value');
      
      // Cache miss
      await cache.get('non_existent');
      
      // Cache hits
      await cache.get('key');
      await cache.get('key');
      
      const stats = cache.getStats();
      
      expect(stats.entries).toBe(1);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2/3, 2);
    });

    it('should estimate memory usage', async () => {
      await cache.set('key', { large: 'x'.repeat(1000) });
      
      const stats = cache.getStats();
      expect(stats.memoryUsedBytes).toBeGreaterThan(1000);
    });
  });

  describe('eviction', () => {
    it('should evict oldest entries when max reached', async () => {
      const smallCache = new LLMCache({ maxEntries: 5 });
      
      for (let i = 0; i < 7; i++) {
        await smallCache.set(`key_${i}`, `value_${i}`);
      }
      
      const stats = smallCache.getStats();
      expect(stats.entries).toBeLessThanOrEqual(6); // Some evicted
    });
  });

  describe('generateKey', () => {
    it('should generate consistent keys', () => {
      const key1 = LLMCache.generateKey({
        operation: 'enrichment',
        model: 'gpt-4o-mini',
        systemPrompt: 'You are a helpful assistant',
        userPrompt: 'Analyze this issue',
      });

      const key2 = LLMCache.generateKey({
        operation: 'enrichment',
        model: 'gpt-4o-mini',
        systemPrompt: 'You are a helpful assistant',
        userPrompt: 'Analyze this issue',
      });

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = LLMCache.generateKey({
        operation: 'enrichment',
        model: 'gpt-4o-mini',
        systemPrompt: 'Prompt 1',
        userPrompt: 'User input 1',
      });

      const key2 = LLMCache.generateKey({
        operation: 'enrichment',
        model: 'gpt-4o-mini',
        systemPrompt: 'Prompt 2',
        userPrompt: 'User input 2',
      });

      expect(key1).not.toBe(key2);
    });

    it('should include operation in key', () => {
      const key = LLMCache.generateKey({
        operation: 'anomaly',
        model: 'gpt-4o',
        systemPrompt: 'test',
        userPrompt: 'test',
      });

      expect(key).toContain('llm:anomaly:');
    });
  });
});

describe('createLLMCache', () => {
  it('should create cache with default options', () => {
    const cache = createLLMCache();
    expect(cache).toBeInstanceOf(LLMCache);
    expect(cache.isEnabled()).toBe(true);
  });

  it('should create disabled cache', () => {
    const cache = createLLMCache({ enabled: false });
    expect(cache.isEnabled()).toBe(false);
  });
});

describe('withCache', () => {
  it('should return cached value on hit', async () => {
    const cache = new LLMCache();
    const fn = vi.fn().mockResolvedValue('result');

    await cache.set('key', 'cached_result');

    const result = await withCache(
      { cache, operation: 'test' },
      'key',
      fn
    );

    expect(result.value).toBe('cached_result');
    expect(result.cached).toBe(true);
    expect(fn).not.toHaveBeenCalled();
  });

  it('should execute function on miss and cache result', async () => {
    const cache = new LLMCache();
    const fn = vi.fn().mockResolvedValue('new_result');

    const result = await withCache(
      { cache, operation: 'test', ttlSeconds: 60 },
      'key',
      fn
    );

    expect(result.value).toBe('new_result');
    expect(result.cached).toBe(false);
    expect(fn).toHaveBeenCalled();

    // Verify it's now cached
    const cached = await cache.get('key');
    expect(cached).toBe('new_result');
  });
});
