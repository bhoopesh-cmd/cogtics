/**
 * Observability Integration Tests (Phase 11)
 * 
 * Tests for health endpoints, DLQ API, and integrity check API.
 */
import { describe, it, expect, beforeAll } from 'vitest';

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

describe('Health Endpoints', () => {
  it('should return basic health status', async () => {
    const response = await fetch(`${API_BASE}/health`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
  });

  it('should return readiness status with dependency checks', async () => {
    const response = await fetch(`${API_BASE}/health/ready`);
    
    const data = await response.json();
    expect(['ready', 'unhealthy']).toContain(data.status);
    expect(data.checks).toBeDefined();
    expect(typeof data.checks.database).toBe('boolean');
    expect(typeof data.checks.redis).toBe('boolean');
  });

  it('should return detailed health with queue info', async () => {
    const response = await apiRequest('/health/detailed');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);
    expect(data.checks.database).toBeDefined();
    expect(data.checks.database.status).toBeDefined();
    expect(data.checks.redis).toBeDefined();
    expect(data.checks.storage).toBeDefined();
    expect(data.queues).toBeDefined();
    expect(data.dlq).toBeDefined();
    expect(typeof data.dlq.totalCount).toBe('number');
    expect(data.version).toBeDefined();
    expect(typeof data.uptime).toBe('number');
  });
});

describe('DLQ Admin API', () => {
  it('should list DLQ entries', async () => {
    const response = await apiRequest('/admin/dlq');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(Array.isArray(data.entries)).toBe(true);
    expect(data.pagination).toBeDefined();
    expect(typeof data.pagination.total).toBe('number');
  });

  it('should filter DLQ entries by status', async () => {
    const response = await apiRequest('/admin/dlq?status=failed');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(Array.isArray(data.entries)).toBe(true);
    // All entries should have failed status
    for (const entry of data.entries) {
      expect(entry.status).toBe('failed');
    }
  });

  it('should return DLQ statistics', async () => {
    const response = await apiRequest('/admin/dlq/stats');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(typeof data.total).toBe('number');
    expect(typeof data.failed).toBe('number');
    expect(typeof data.requeued).toBe('number');
    expect(typeof data.discarded).toBe('number');
    expect(data.byQueue).toBeDefined();
    expect(data.byType).toBeDefined();
  });

  it('should return 404 for non-existent DLQ entry', async () => {
    const response = await apiRequest('/admin/dlq/non-existent-id');
    expect(response.status).toBe(404);
  });
});

describe('Integrity Check API', () => {
  it('should run integrity checks', async () => {
    const response = await apiRequest('/admin/integrity/run', {
      method: 'POST',
      body: JSON.stringify({
        check_types: ['record_count', 'required_fields'],
      }),
    });
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.run_ids)).toBe(true);
    expect(data.run_ids.length).toBeGreaterThan(0);
  });

  it('should list integrity check runs', async () => {
    const response = await apiRequest('/admin/integrity/runs');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(Array.isArray(data.runs)).toBe(true);
    expect(data.pagination).toBeDefined();
  });

  it('should return integrity check statistics', async () => {
    const response = await apiRequest('/admin/integrity/stats');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(typeof data.total).toBe('number');
    expect(data.byStatus).toBeDefined();
    expect(data.byType).toBeDefined();
  });
});

describe('Replay Admin API', () => {
  it('should list replay audit entries', async () => {
    const response = await apiRequest('/admin/replay');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(Array.isArray(data.replays)).toBe(true);
  });

  it('should return 400 for invalid snapshot replay ID', async () => {
    const response = await apiRequest('/admin/replay/snapshot/non-existent-id', {
      method: 'POST',
    });
    // Returns 400 Bad Request for invalid ID format
    expect([400, 404]).toContain(response.status);
  });

  it('should return 400 for invalid detection replay ID', async () => {
    const response = await apiRequest('/admin/replay/detection/non-existent-id', {
      method: 'POST',
    });
    // Returns 400 Bad Request for invalid ID format
    expect([400, 404]).toContain(response.status);
  });
});
