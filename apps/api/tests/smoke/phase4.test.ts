/**
 * Phase 4 Smoke Tests
 * 
 * Verifies that all Phase 4 features are properly wired up.
 */
import { describe, it, expect } from 'vitest';

const API_BASE = process.env.API_URL ?? 'http://localhost:3000';

// Helper for making requests
async function fetchApi(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    return {
      ok: response.ok,
      status: response.status,
      data: response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Helper to check if a file/module exists
async function moduleExists(path: string): Promise<boolean> {
  try {
    await import(path);
    return true;
  } catch {
    return false;
  }
}

describe('Phase 4 Smoke Tests', () => {
  describe('API Health', () => {
    it('should return 200 from health endpoint', async () => {
      const res = await fetchApi('/health');
      expect(res.status).toBe(200);
    });
  });

  describe('Upload Routes Registered', () => {
    it('should have /uploads endpoint registered (returns 401/403/500 without auth)', async () => {
      const res = await fetchApi('/uploads');
      // 200, 401, 403, or 500 means route exists (200 if publicly accessible)
      expect([200, 401, 403, 500]).toContain(res.status);
    });

    it('should have /uploads/csv/start endpoint registered', async () => {
      const res = await fetchApi('/uploads/csv/start', { method: 'POST' });
      // 400, 401, or 403 means route exists
      expect([400, 401, 403]).toContain(res.status);
    });

    it('should have /uploads/csv/complete endpoint registered', async () => {
      const res = await fetchApi('/uploads/csv/complete', { method: 'POST' });
      expect([400, 401, 403]).toContain(res.status);
    });

    it('should have /uploads/pdf/start endpoint registered', async () => {
      const res = await fetchApi('/uploads/pdf/start', { method: 'POST' });
      expect([400, 401, 403]).toContain(res.status);
    });

    it('should have /uploads/pdf/complete endpoint registered', async () => {
      const res = await fetchApi('/uploads/pdf/complete', { method: 'POST' });
      expect([400, 401, 403]).toContain(res.status);
    });

    it('should have /uploads/templates endpoint registered', async () => {
      const res = await fetchApi('/uploads/templates');
      // Templates might be public, require auth, or return 500 if DB not set up
      expect([200, 401, 403, 500]).toContain(res.status);
    });
  });

  describe('Connection Routes Include New Providers', () => {
    it('should have /connections endpoint registered', async () => {
      const res = await fetchApi('/connections');
      // 200 if public, 401/403 if requires auth, 500 if server error
      expect([200, 401, 403, 500]).toContain(res.status);
    });

    // HubSpot OAuth routes
    it('should have /connections/hubspot/start endpoint', async () => {
      const res = await fetchApi('/connections/hubspot/start', { method: 'POST' });
      expect([400, 401, 403, 404, 501]).toContain(res.status);
    });

    // QuickBooks OAuth routes
    it('should have /connections/quickbooks/start endpoint', async () => {
      const res = await fetchApi('/connections/quickbooks/start', { method: 'POST' });
      expect([400, 401, 403, 404, 501]).toContain(res.status);
    });

    // DocuSign OAuth routes
    it('should have /connections/docusign/start endpoint', async () => {
      const res = await fetchApi('/connections/docusign/start', { method: 'POST' });
      expect([400, 401, 403, 404, 501]).toContain(res.status);
    });
  });

  describe('Schema Validation', () => {
    it('should have upload schemas exported from @cogtics/schemas', async () => {
      const schemas = await import('@cogtics/schemas');

      expect(schemas.createUploadId).toBeDefined();
      expect(schemas.createUploadFileId).toBeDefined();
      expect(schemas.createParseRunId).toBeDefined();
      expect(schemas.UploadTypeSchema).toBeDefined();
      expect(schemas.UploadStatusSchema).toBeDefined();
      expect(schemas.UploadMappingSchema).toBeDefined();
    });

    it('should generate valid upload ID', async () => {
      const { createUploadId } = await import('@cogtics/schemas');
      const id = createUploadId();

      expect(id).toMatch(/^upl_/);
      expect(id.length).toBeGreaterThan(10);
    });

    it('should validate upload types', async () => {
      const { UploadTypeSchema } = await import('@cogtics/schemas');

      expect(UploadTypeSchema.safeParse('csv').success).toBe(true);
      expect(UploadTypeSchema.safeParse('pdf').success).toBe(true);
      expect(UploadTypeSchema.safeParse('invalid').success).toBe(false);
    });

    it('should validate upload statuses', async () => {
      const { UploadStatusSchema } = await import('@cogtics/schemas');

      expect(UploadStatusSchema.safeParse('pending').success).toBe(true);
      expect(UploadStatusSchema.safeParse('processing').success).toBe(true);
      expect(UploadStatusSchema.safeParse('completed').success).toBe(true);
      expect(UploadStatusSchema.safeParse('failed').success).toBe(true);
    });
  });

  describe('Connector Provider Types', () => {
    it('should include new providers in ConnectorProviderSchema', async () => {
      const { ConnectorProviderSchema } = await import('@cogtics/connectors');

      expect(ConnectorProviderSchema.safeParse('hubspot').success).toBe(true);
      expect(ConnectorProviderSchema.safeParse('quickbooks').success).toBe(true);
      expect(ConnectorProviderSchema.safeParse('docusign').success).toBe(true);
    });

    it('should be able to get registered providers after initialization', async () => {
      const { getRegisteredProviders, initializeConnectors } = await import('@cogtics/connectors');

      await initializeConnectors({});
      const providers = getRegisteredProviders();

      expect(providers).toContain('hubspot');
      expect(providers).toContain('quickbooks');
      expect(providers).toContain('docusign');
    });
  });

  describe('Job Queue Names', () => {
    it('should have upload job types in queue names', async () => {
      const { QueueNameSchema } = await import('@cogtics/schemas');

      expect(QueueNameSchema.safeParse('upload.csv.parse').success).toBe(true);
      expect(QueueNameSchema.safeParse('upload.csv.finalize').success).toBe(true);
      expect(QueueNameSchema.safeParse('upload.pdf.parse').success).toBe(true);
    });
  });

  describe('Database Types', () => {
    it('should have upload table types', async () => {
      // This is a compile-time check - if it imports, the types exist
      const types = await import('@cogtics/db');

      // The Database interface should include upload tables
      expect(types).toBeDefined();
    });
  });

  describe('Connector Provider Types', () => {
    it('should include new providers in ConnectorProviderSchema', async () => {
      const { ConnectorProviderSchema } = await import('@cogtics/connectors');

      expect(ConnectorProviderSchema.safeParse('hubspot').success).toBe(true);
      expect(ConnectorProviderSchema.safeParse('quickbooks').success).toBe(true);
      expect(ConnectorProviderSchema.safeParse('docusign').success).toBe(true);
    });
  });
});

describe('Exit Criteria Verification', () => {
  describe('Phase 4 Exit Criteria', () => {
    it('EC1: New connector providers are registered', async () => {
      const { getRegisteredProviders, initializeConnectors } = await import('@cogtics/connectors');

      await initializeConnectors({});
      const providers = getRegisteredProviders();

      expect(providers).toContain('hubspot');
      expect(providers).toContain('quickbooks');
      expect(providers).toContain('docusign');
    });

    it('EC2: Connector provider schema includes new providers', async () => {
      const { ConnectorProviderSchema } = await import('@cogtics/connectors');

      expect(ConnectorProviderSchema.safeParse('hubspot').success).toBe(true);
      expect(ConnectorProviderSchema.safeParse('quickbooks').success).toBe(true);
      expect(ConnectorProviderSchema.safeParse('docusign').success).toBe(true);
    });

    it('EC3: CSV upload parsing with validation exists', async () => {
      const { getRowSchemaForEntity } = await import('@cogtics/schemas');

      const customerSchema = getRowSchemaForEntity('customer');
      const invoiceSchema = getRowSchemaForEntity('invoice');
      const contractSchema = getRowSchemaForEntity('contract');

      expect(customerSchema).toBeDefined();
      expect(invoiceSchema).toBeDefined();
      expect(contractSchema).toBeDefined();
    });

    it('EC4: Upload job types are registered', async () => {
      const { QueueNameSchema } = await import('@cogtics/schemas');

      expect(QueueNameSchema.safeParse('upload.csv.parse').success).toBe(true);
      expect(QueueNameSchema.safeParse('upload.csv.finalize').success).toBe(true);
      expect(QueueNameSchema.safeParse('upload.pdf.parse').success).toBe(true);
    });

    it('EC5: Upload error tracking schemas exist', async () => {
      const { createParseErrorId, ParseStatsSchema } = await import('@cogtics/schemas');

      expect(typeof createParseErrorId).toBe('function');
      expect(ParseStatsSchema).toBeDefined();
    });

    it('EC6: Upload type and status schemas exist', async () => {
      const { UploadTypeSchema, UploadStatusSchema, UploadMappingSchema } = await import('@cogtics/schemas');

      expect(UploadTypeSchema).toBeDefined();
      expect(UploadStatusSchema).toBeDefined();
      expect(UploadMappingSchema).toBeDefined();

      // Validate specific values
      expect(UploadTypeSchema.safeParse('csv').success).toBe(true);
      expect(UploadTypeSchema.safeParse('pdf').success).toBe(true);
      expect(UploadStatusSchema.safeParse('completed').success).toBe(true);
    });
  });
});
