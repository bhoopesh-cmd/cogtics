/**
 * Phase 9 Smoke Tests
 * 
 * End-to-end tests for the full simulation lifecycle.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { getDatabase, closeDatabase } from '@cogtics/db';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';

// Skip tests if DATABASE_URL is not set
const DATABASE_URL = process.env.DATABASE_URL;
const shouldSkip = !DATABASE_URL;

if (shouldSkip) {
  console.log('Skipping Phase 9 smoke tests: DATABASE_URL not set');
}

// Mock data
const TEST_TENANT_ID = 'tenant_smoke_sim';
const TEST_SNAPSHOT_ID = 'snap_smoke_sim';
const TEST_USER_ID = 'user_smoke_admin';
const TEST_CONTRACT_ID = 'ctr_smoke_001';

describe.skipIf(shouldSkip)('Phase 9 Smoke Tests', () => {
  let app: FastifyInstance;
  let db: Kysely<Database>;

  beforeAll(async () => {
    // Initialize database
    db = getDatabase({ 
      connectionString: process.env.DATABASE_URL || 'postgresql://cogtics:cogtics@localhost:5432/cogtics' 
    });
    
    // Create test data
    await setupSmokeTestData(db);
    
    // Build Fastify app
    app = Fastify({ logger: false });
    
    // Track job calls
    const jobCalls: any[] = [];
    
    app.decorate('db', db);
    app.decorate('queues', new Map([
      ['simulation.run', { 
        add: async (name: string, data: any) => {
          jobCalls.push({ name, data });
          return { id: 'mock_job_id' };
        } 
      }],
    ]));
    app.decorate('jobCalls', jobCalls);
    
    app.addHook('preHandler', async (request) => {
      request.tenantId = TEST_TENANT_ID;
      request.userId = TEST_USER_ID;
    });
    
    const { simulationRoutes } = await import('../../src/routes/simulations/index.js');
    await app.register(simulationRoutes, { prefix: '/simulations' });
    
    await app.ready();
  });

  afterAll(async () => {
    if (db) await cleanupSmokeTestData(db);
    if (app) await app.close();
    await closeDatabase();
  });

  describe('Full Simulation Lifecycle', () => {
    it('should complete full simulation lifecycle', async () => {
      // Step 1: Create simulation from snapshot
      const createResponse = await app.inject({
        method: 'POST',
        url: '/simulations',
        payload: {
          snapshotId: TEST_SNAPSHOT_ID,
          name: 'Smoke Test: 10% Price Increase',
          description: 'Test simulation applying 10% price increase to all contracts',
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const { id: simulationId } = JSON.parse(createResponse.body);
      expect(simulationId).toBeDefined();

      // Step 2: Add contract term override (10% price increase)
      const override1Response = await app.inject({
        method: 'POST',
        url: `/simulations/${simulationId}/overrides`,
        payload: {
          overrideType: 'price_change',
          targetType: 'contract',
          targetId: TEST_CONTRACT_ID,
          pricePct: 10,
          overrideValue: { pricePct: 10 },
        },
      });

      expect(override1Response.statusCode).toBe(201);
      const { id: override1Id } = JSON.parse(override1Response.body);

      // Step 3: Add timing shift override (extend contract 3 months)
      const override2Response = await app.inject({
        method: 'POST',
        url: `/simulations/${simulationId}/overrides`,
        payload: {
          overrideType: 'timing_shift',
          targetType: 'contract',
          targetId: TEST_CONTRACT_ID,
          shiftType: 'end_date',
          shiftDays: 90,
          overrideValue: { shiftType: 'end_date', shiftDays: 90 },
          sequenceNumber: 1,
        },
      });

      expect(override2Response.statusCode).toBe(201);

      // Step 4: Verify overrides are saved
      const overridesResponse = await app.inject({
        method: 'GET',
        url: `/simulations/${simulationId}/overrides`,
      });

      expect(overridesResponse.statusCode).toBe(200);
      const { overrides } = JSON.parse(overridesResponse.body);
      expect(overrides).toHaveLength(2);

      // Step 5: Run simulation
      const runResponse = await app.inject({
        method: 'POST',
        url: `/simulations/${simulationId}/run`,
        payload: {
          recomputeRevRec: true,
        },
      });

      expect(runResponse.statusCode).toBe(202);
      const { runId, runNumber } = JSON.parse(runResponse.body);
      expect(runId).toBeDefined();
      expect(runNumber).toBe(1);

      // Step 6: Verify simulation status changed to pending
      const statusResponse = await app.inject({
        method: 'GET',
        url: `/simulations/${simulationId}`,
      });

      expect(statusResponse.statusCode).toBe(200);
      const simulation = JSON.parse(statusResponse.body);
      expect(simulation.status).toBe('pending');

      // Step 7: Verify audit trail exists
      const auditRecords = await db
        .selectFrom('simulation_audit')
        .selectAll()
        .where('simulation_id', '=', simulationId)
        .where('tenant_id', '=', TEST_TENANT_ID)
        .orderBy('created_at', 'asc')
        .execute();

      expect(auditRecords.length).toBeGreaterThanOrEqual(3); // created, override_added x2, run_started
      expect(auditRecords[0].action).toBe('created');
    });

    it('should handle simulation with no material impact', async () => {
      // Create simulation
      const createResponse = await app.inject({
        method: 'POST',
        url: '/simulations',
        payload: {
          snapshotId: TEST_SNAPSHOT_ID,
          name: 'Smoke Test: Zero Impact',
          description: 'Test simulation with no actual changes',
        },
      });

      const { id: simulationId } = JSON.parse(createResponse.body);

      // Add override with zero change
      await app.inject({
        method: 'POST',
        url: `/simulations/${simulationId}/overrides`,
        payload: {
          overrideType: 'price_change',
          targetType: 'contract',
          targetId: TEST_CONTRACT_ID,
          overrideValue: { pricePct: 0 }, // No change
        },
      });

      // Run simulation
      const runResponse = await app.inject({
        method: 'POST',
        url: `/simulations/${simulationId}/run`,
      });

      expect(runResponse.statusCode).toBe(202);
    });

    it('should preserve immutability across multiple runs', async () => {
      // Create simulation
      const createResponse = await app.inject({
        method: 'POST',
        url: '/simulations',
        payload: {
          snapshotId: TEST_SNAPSHOT_ID,
          name: 'Smoke Test: Multiple Runs',
        },
      });

      const { id: simulationId } = JSON.parse(createResponse.body);

      // Add override
      await app.inject({
        method: 'POST',
        url: `/simulations/${simulationId}/overrides`,
        payload: {
          overrideType: 'price_change',
          targetType: 'contract',
          targetId: TEST_CONTRACT_ID,
          overrideValue: { pricePct: 5 },
        },
      });

      // First run
      const run1Response = await app.inject({
        method: 'POST',
        url: `/simulations/${simulationId}/run`,
      });

      const { runNumber: run1Number } = JSON.parse(run1Response.body);
      expect(run1Number).toBe(1);

      // Simulate completion
      await db
        .updateTable('simulations')
        .set({ status: 'draft' })
        .where('id', '=', simulationId)
        .execute();

      // Second run
      const run2Response = await app.inject({
        method: 'POST',
        url: `/simulations/${simulationId}/run`,
      });

      const { runNumber: run2Number } = JSON.parse(run2Response.body);
      expect(run2Number).toBe(2);

      // Verify both runs exist
      const runsResponse = await app.inject({
        method: 'GET',
        url: `/simulations/${simulationId}/runs`,
      });

      const { runs } = JSON.parse(runsResponse.body);
      expect(runs.length).toBe(2);
    });

    it('should reject modifications to non-draft simulations', async () => {
      // Create and complete a simulation
      const createResponse = await app.inject({
        method: 'POST',
        url: '/simulations',
        payload: {
          snapshotId: TEST_SNAPSHOT_ID,
          name: 'Smoke Test: Completed',
        },
      });

      const { id: simulationId } = JSON.parse(createResponse.body);

      // Mark as completed directly
      await db
        .updateTable('simulations')
        .set({ status: 'completed' })
        .where('id', '=', simulationId)
        .execute();

      // Try to update name
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/simulations/${simulationId}`,
        payload: {
          name: 'Should Fail',
        },
      });

      expect(updateResponse.statusCode).toBe(400);

      // Try to add override
      const overrideResponse = await app.inject({
        method: 'POST',
        url: `/simulations/${simulationId}/overrides`,
        payload: {
          overrideType: 'price_change',
          targetType: 'contract',
          targetId: TEST_CONTRACT_ID,
          overrideValue: { pricePct: 10 },
        },
      });

      expect(overrideResponse.statusCode).toBe(400);
    });
  });

  describe('Template Operations', () => {
    it('should create and apply a template', async () => {
      // Create template
      const templateResponse = await app.inject({
        method: 'POST',
        url: '/simulations/templates',
        payload: {
          name: 'Smoke Test Template',
          description: '10% price increase template',
          overrides: [
            {
              overrideType: 'price_change',
              targetType: 'contract',
              targetId: 'ctr_any',
              overrideValue: { pricePct: 10 },
            },
          ],
        },
      });

      expect(templateResponse.statusCode).toBe(201);
      const { id: templateId } = JSON.parse(templateResponse.body);

      // List templates
      const listResponse = await app.inject({
        method: 'GET',
        url: '/simulations/templates',
      });

      expect(listResponse.statusCode).toBe(200);
      const { templates } = JSON.parse(listResponse.body);
      expect(templates.length).toBeGreaterThanOrEqual(1);

      // Apply template
      const applyResponse = await app.inject({
        method: 'POST',
        url: `/simulations/templates/${templateId}/apply`,
        payload: {
          snapshotId: TEST_SNAPSHOT_ID,
          name: 'From Template',
        },
      });

      expect(applyResponse.statusCode).toBe(201);
      const { simulationId } = JSON.parse(applyResponse.body);

      // Verify simulation has overrides from template
      const overridesResponse = await app.inject({
        method: 'GET',
        url: `/simulations/${simulationId}/overrides`,
      });

      const { overrides } = JSON.parse(overridesResponse.body);
      expect(overrides.length).toBe(1);
      expect(overrides[0].overrideType).toBe('price_change');
    });
  });
});

// Helper functions
async function setupSmokeTestData(db: Kysely<Database>) {
  // Create tenant
  const tenant = await db.selectFrom('tenants').select('id').where('id', '=', TEST_TENANT_ID).executeTakeFirst();
  if (!tenant) {
    await db.insertInto('tenants').values({
      id: TEST_TENANT_ID,
      name: 'Smoke Test Tenant',
      status: 'active',
    }).execute();
  }

  // Create user for created_by foreign key
  const user = await db.selectFrom('users').select('id').where('id', '=', TEST_USER_ID).executeTakeFirst();
  if (!user) {
    await db.insertInto('users').values({
      id: TEST_USER_ID,
      email: 'test-smoke9@cogtics.local',
      name: 'Smoke Test User',
      status: 'active',
    }).execute();
  }

  // Create snapshot
  const snapshot = await db.selectFrom('snapshots').select('id').where('id', '=', TEST_SNAPSHOT_ID).executeTakeFirst();
  if (!snapshot) {
    await db.insertInto('snapshots').values({
      id: TEST_SNAPSHOT_ID,
      tenant_id: TEST_TENANT_ID,
      status: 'complete',
    }).execute();
  }

  // Create contract
  const contract = await db.selectFrom('contracts').select('id').where('id', '=', TEST_CONTRACT_ID).executeTakeFirst();
  if (!contract) {
    await db.insertInto('contracts').values({
      id: TEST_CONTRACT_ID,
      tenant_id: TEST_TENANT_ID,
      snapshot_id: TEST_SNAPSHOT_ID,
      external_id: 'ext_smoke_001',
      name: 'Smoke Test Contract',
      arr: 120000,
      currency: 'USD',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      billing_frequency: 'monthly',
      status: 'active',
      source_system: 'test',
    }).execute();
  }
}

async function cleanupSmokeTestData(db: Kysely<Database>) {
  try {
    await db.deleteFrom('simulation_runs').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.deleteFrom('simulation_overrides').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.deleteFrom('simulation_templates').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.deleteFrom('simulations').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.deleteFrom('contracts').where('id', '=', TEST_CONTRACT_ID).execute();
    await db.deleteFrom('snapshots').where('id', '=', TEST_SNAPSHOT_ID).execute();
    await db.deleteFrom('users').where('id', '=', TEST_USER_ID).execute();
    await db.deleteFrom('tenants').where('id', '=', TEST_TENANT_ID).execute();
  } catch (e) {
    console.warn('Cleanup error:', e);
  }
}
