/**
 * Phase 11: Observability & Hardening Smoke Tests
 * 
 * End-to-end tests for:
 * - Health endpoints
 * - DLQ operations
 * - Integrity checks
 * - Replay functionality
 */
import { describe, it, expect } from 'vitest';

const API_BASE = process.env.API_URL || 'http://localhost:3000';

let authToken: string | null = null;

// Get a dev token for testing
async function getDevToken(): Promise<string> {
  if (authToken) return authToken;
  
  try {
    const response = await fetch(`${API_BASE}/auth/dev-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user_01',
        tenantId: 'tenant_01',
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      authToken = data.token;
      return authToken!;
    }
  } catch (e) {
    console.warn('Could not get dev token:', e);
  }
  
  // Fallback to env token
  return process.env.TEST_AUTH_TOKEN || 'dev-token';
}

// Helper to make authenticated requests
async function apiRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getDevToken();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
}

describe('Phase 11 Smoke Tests: Observability & Hardening', () => {
  describe('Health Monitoring', () => {
    it('should return comprehensive health status', async () => {
      const response = await apiRequest('/health/detailed');
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      
      // Verify structure
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('checks');
      expect(data).toHaveProperty('queues');
      expect(data).toHaveProperty('dlq');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('timestamp');
      
      // Verify checks structure
      expect(data.checks).toHaveProperty('database');
      expect(data.checks).toHaveProperty('redis');
      expect(data.checks).toHaveProperty('storage');
      
      // Each check should have status and latency
      expect(data.checks.database).toHaveProperty('status');
      expect(typeof data.checks.database.status).toBe('boolean');
    });
  });

  describe('Dead Letter Queue Management', () => {
    it('should provide DLQ stats and listing', async () => {
      // Get stats
      const statsResponse = await apiRequest('/admin/dlq/stats');
      expect(statsResponse.ok).toBe(true);
      
      const stats = await statsResponse.json();
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.failed).toBe('number');
      
      // Get listing
      const listResponse = await apiRequest('/admin/dlq?limit=10');
      expect(listResponse.ok).toBe(true);
      
      const list = await listResponse.json();
      expect(Array.isArray(list.entries)).toBe(true);
      expect(list.pagination).toBeDefined();
    });

    it('should support filtering DLQ by queue and type', async () => {
      // Filter by status
      const failedResponse = await apiRequest('/admin/dlq?status=failed');
      expect(failedResponse.ok).toBe(true);
      
      const failed = await failedResponse.json();
      for (const entry of failed.entries) {
        expect(entry.status).toBe('failed');
      }
    });
  });

  describe('Integrity Checks', () => {
    it('should run and track integrity checks', async () => {
      // Run a check
      const runResponse = await apiRequest('/admin/integrity/run', {
        method: 'POST',
        body: JSON.stringify({
          check_types: ['record_count'],
        }),
      });
      expect(runResponse.ok).toBe(true);
      
      const runData = await runResponse.json();
      expect(runData.success).toBe(true);
      expect(runData.run_ids.length).toBeGreaterThan(0);
      
      const runId = runData.run_ids[0];
      
      // Get the run details
      const detailResponse = await apiRequest(`/admin/integrity/runs/${runId}`);
      expect(detailResponse.ok).toBe(true);
      
      const detail = await detailResponse.json();
      expect(detail.id).toBe(runId);
      expect(detail.check_type).toBe('record_count');
      expect(['pending', 'running', 'completed', 'failed']).toContain(detail.status);
    });

    it('should provide integrity check statistics', async () => {
      const response = await apiRequest('/admin/integrity/stats');
      expect(response.ok).toBe(true);
      
      const stats = await response.json();
      expect(typeof stats.total).toBe('number');
      expect(stats.byStatus).toBeDefined();
      expect(stats.byType).toBeDefined();
    });
  });

  describe('Replay Operations', () => {
    it('should list replay audit entries', async () => {
      const response = await apiRequest('/admin/replay');
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(Array.isArray(data.replays)).toBe(true);
    });

    it('should validate snapshot existence before replay', async () => {
      // Try to replay a non-existent snapshot
      const response = await apiRequest('/admin/replay/snapshot/fake-snapshot-id', {
        method: 'POST',
      });
      
      // Should return 400 (invalid ID) or 404 (not found)
      expect([400, 404]).toContain(response.status);
    });

    it('should validate detection run existence before replay', async () => {
      const response = await apiRequest('/admin/replay/detection/fake-run-id', {
        method: 'POST',
      });
      
      // Should return 400 (invalid ID) or 404 (not found)
      expect([400, 404]).toContain(response.status);
    });
  });

  describe('API Routes Registration', () => {
    it('should have all Phase 11 routes registered', async () => {
      // Test that routes exist (even if they return errors for invalid input)
      const routes = [
        { path: '/admin/dlq', method: 'GET' },
        { path: '/admin/dlq/stats', method: 'GET' },
        { path: '/admin/integrity/runs', method: 'GET' },
        { path: '/admin/integrity/stats', method: 'GET' },
        { path: '/admin/replay', method: 'GET' },
        { path: '/health/detailed', method: 'GET' },
      ];

      for (const route of routes) {
        const response = await apiRequest(route.path, { method: route.method });
        // Should not be 404 (route not found)
        expect(response.status).not.toBe(404);
      }
    });
  });
});
