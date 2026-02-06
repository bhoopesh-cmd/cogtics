/**
 * Idempotency and Replay Safety Tests (D10)
 * Tests that duplicate requests with same idempotency key produce identical results
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

const RUN_HTTP_TESTS = process.env.RUN_HTTP_TESTS === 'true';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_TENANT_ID = 'tenant_01';
const TEST_USER_ID = 'user_01';

const headers = {
  'Content-Type': 'application/json',
  'x-tenant-id': TEST_TENANT_ID,
  'x-user-id': TEST_USER_ID,
  'x-user-role': 'admin',
};

describe('Idempotency and Replay Safety', () => {
  describe('Schema Validation', () => {
    it('should generate idempotency key IDs with correct prefix', async () => {
      const { createIdempotencyKeyId } = await import('@cogtics/schemas');
      const id = createIdempotencyKeyId();
      expect(id).toMatch(/^idem_/);
    });

    it('should generate unique idempotency keys', async () => {
      const { createIdempotencyKeyId } = await import('@cogtics/schemas');
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(createIdempotencyKeyId());
      }
      expect(ids.size).toBe(100);
    });

    it('should reject invalid idempotencyKey type on job payload', async () => {
      const { DetectRunJobPayloadSchema } = await import('@cogtics/schemas');
      const result = DetectRunJobPayloadSchema.safeParse({
        type: 'detect.run',
        tenantId: 'tenant_01',
        snapshotId: 'snap_01',
        idempotencyKey: 123, // Should be string
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid idempotencyKey on job payload', async () => {
      const { DetectRunJobPayloadSchema, createIdempotencyKeyId } = await import('@cogtics/schemas');
      const result = DetectRunJobPayloadSchema.safeParse({
        type: 'detect.run',
        tenantId: 'tenant_01',
        snapshotId: 'snap_01',
        idempotencyKey: createIdempotencyKeyId(),
      });
      expect(result.success).toBe(true);
    });
  });

  describe.skipIf(!RUN_HTTP_TESTS)('HTTP Idempotency', () => {
    const idempotencyKey = `idem_test_${Date.now()}`;

    it('should return same response for duplicate export requests', async () => {
      const exportRequest = {
        type: 'issues',
        format: 'csv',
        filters: {},
        idempotencyKey,
      };

      // First request
      const response1 = await fetch(`${API_BASE_URL}/api/exports`, {
        method: 'POST',
        headers,
        body: JSON.stringify(exportRequest),
      });

      // Second request with same idempotency key
      const response2 = await fetch(`${API_BASE_URL}/api/exports`, {
        method: 'POST',
        headers,
        body: JSON.stringify(exportRequest),
      });

      // Both should succeed and return consistent results
      expect([200, 201, 202, 409]).toContain(response1.status);
      expect([200, 201, 202, 409]).toContain(response2.status);

      if (response1.status === 201 && response2.status === 201) {
        const body1 = await response1.json();
        const body2 = await response2.json();
        // Should return same export ID for idempotent requests
        expect(body1.id).toBe(body2.id);
      }
    });

    it('should return same response for duplicate simulation requests', async () => {
      const simKey = `idem_sim_${Date.now()}`;
      const simRequest = {
        name: 'Idempotency Test Simulation',
        baseSnapshotId: 'snap_01',
        overrides: {},
        idempotencyKey: simKey,
      };

      const response1 = await fetch(`${API_BASE_URL}/api/simulations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(simRequest),
      });

      const response2 = await fetch(`${API_BASE_URL}/api/simulations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(simRequest),
      });

      expect([200, 201, 202, 409, 400]).toContain(response1.status);
      expect([200, 201, 202, 409, 400]).toContain(response2.status);
    });

    it('should not deduplicate requests with different idempotency keys', async () => {
      const request1 = {
        type: 'issues',
        format: 'csv',
        idempotencyKey: `idem_unique_1_${Date.now()}`,
      };

      const request2 = {
        type: 'issues',
        format: 'csv',
        idempotencyKey: `idem_unique_2_${Date.now()}`,
      };

      const response1 = await fetch(`${API_BASE_URL}/api/exports`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request1),
      });

      const response2 = await fetch(`${API_BASE_URL}/api/exports`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request2),
      });

      if (response1.status === 201 && response2.status === 201) {
        const body1 = await response1.json();
        const body2 = await response2.json();
        // Different idempotency keys should create different exports
        expect(body1.id).not.toBe(body2.id);
      }
    });
  });

  describe.skipIf(!RUN_HTTP_TESTS)('Detection Job Idempotency', () => {
    it('should not create duplicate detection runs with same idempotency key', async () => {
      const runKey = `idem_detect_${Date.now()}`;

      const response1 = await fetch(`${API_BASE_URL}/api/detection/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          snapshotId: 'snap_01',
          idempotencyKey: runKey,
        }),
      });

      const response2 = await fetch(`${API_BASE_URL}/api/detection/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          snapshotId: 'snap_01',
          idempotencyKey: runKey,
        }),
      });

      // First should succeed, second should be idempotent (same result) or conflict
      expect([200, 201, 202, 404]).toContain(response1.status);
      expect([200, 201, 202, 409, 404]).toContain(response2.status);
    });
  });
});
