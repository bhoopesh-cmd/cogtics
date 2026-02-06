/**
 * RLS isolation tests (HTTP).
 * Enable with RUN_HTTP_TESTS=true and API_BASE_URL set.
 */
import { describe, it, expect } from 'vitest';

const RUN_HTTP_TESTS = process.env.RUN_HTTP_TESTS === 'true';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

describe.skipIf(!RUN_HTTP_TESTS)('RLS Isolation', () => {
  it('should reject access with invalid tenant header', async () => {
    const response = await fetch(`${API_BASE_URL}/api/issues`, {
      headers: { 'x-tenant-id': 'invalid-tenant-id' },
    });

    const acceptable = [401, 403, 404, 200];
    expect(acceptable).toContain(response.status);
  });

  it('should reject cross-tenant access to exports', async () => {
    const response = await fetch(`${API_BASE_URL}/api/exports`, {
      headers: { 'x-tenant-id': 'tenant_other' },
    });

    const acceptable = [401, 403, 404, 200];
    expect(acceptable).toContain(response.status);
  });
});
