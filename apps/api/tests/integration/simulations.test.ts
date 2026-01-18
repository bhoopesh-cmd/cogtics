/**
 * Simulation API Integration Tests (Phase 9)
 * 
 * Tests for simulation endpoints, including CRUD operations,
 * overrides management, and run execution.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { getDatabase, closeDatabase } from '@cogtics/db';
import type { Kysely } from 'kysely';
import type { Database } from '@cogtics/db';

// Skip tests if DATABASE_URL is not set
const DATABASE_URL = process.env.DATABASE_URL;
const shouldSkip = !DATABASE_URL;

if (shouldSkip) {
  console.log('Skipping simulation integration tests: DATABASE_URL not set');
}

// Mock data
const TEST_TENANT_ID = 'tenant_test_sim';
const TEST_SNAPSHOT_ID = 'snap_test_sim';
const TEST_USER_ID = 'user_test_admin';

describe.skipIf(shouldSkip)('Simulation API Integration Tests', () => {
  let app: FastifyInstance;
  let db: Kysely<Database>;
  let testSimulationId: string;

  beforeAll(async () => {
    // Initialize database
    db = getDatabase({ connectionString: process.env.DATABASE_URL || 'postgresql://cogtics:cogtics@localhost:5432/cogtics' });
    
    // Create test tenant and snapshot if needed
    await setupTestData(db);
    
    // Build Fastify app with routes
    app = Fastify({ logger: false });
    
    // Register minimal plugins for testing
    app.decorate('db', db);
    app.decorate('queues', new Map([
      ['simulation.run', { add: async () => ({ id: 'mock_job_id' }) }],
    ]));
    
    // Add auth hook
    app.addHook('preHandler', async (request) => {
      request.tenantId = TEST_TENANT_ID;
      request.userId = TEST_USER_ID;
    });
    
    // Import and register simulation routes
    const { simulationRoutes } = await import('../../src/routes/simulations/index.js');
    await app.register(simulationRoutes, { prefix: '/simulations' });
    
    await app.ready();
  });

  afterAll(async () => {
    try {
      if (db) await cleanupTestData(db);
    } catch (e) {
      console.warn('Cleanup error:', e);
    }
    if (app) await app.close();
    await closeDatabase();
  });

  beforeEach(async () => {
    // Clean up simulations before each test
    await db.deleteFrom('simulations').where('tenant_id', '=', TEST_TENANT_ID).execute();
  });

  describe('POST /simulations', () => {
    it('should create a simulation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/simulations',
        payload: {
          snapshotId: TEST_SNAPSHOT_ID,
          name: 'Test Simulation',
          description: 'A test simulation for integration tests',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBeDefined();
      expect(body.id).toMatch(/^sim_/);
      testSimulationId = body.id;
    });

    it('should return 404 for non-existent snapshot', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/simulations',
        payload: {
          snapshotId: 'snap_nonexistent',
          name: 'Bad Simulation',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /simulations', () => {
    beforeEach(async () => {
      // Create test simulations
      await createTestSimulation(db, 'Test Sim 1', 'draft');
      await createTestSimulation(db, 'Test Sim 2', 'completed');
    });

    it('should list simulations', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/simulations',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.simulations).toBeDefined();
      expect(body.simulations.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/simulations?status=draft',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.simulations.every((s: any) => s.status === 'draft')).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/simulations?limit=1&page=1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.simulations.length).toBe(1);
      expect(body.limit).toBe(1);
      expect(body.page).toBe(1);
    });
  });

  describe('GET /simulations/:id', () => {
    it('should get simulation details', async () => {
      const simId = await createTestSimulation(db, 'Detail Test', 'draft');
      
      const response = await app.inject({
        method: 'GET',
        url: `/simulations/${simId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(simId);
      expect(body.name).toBe('Detail Test');
      expect(body.status).toBe('draft');
    });

    it('should return 404 for non-existent simulation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/simulations/sim_nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /simulations/:id', () => {
    it('should update a draft simulation', async () => {
      const simId = await createTestSimulation(db, 'Update Test', 'draft');
      
      const response = await app.inject({
        method: 'PATCH',
        url: `/simulations/${simId}`,
        payload: {
          name: 'Updated Name',
          description: 'Updated description',
        },
      });

      expect(response.statusCode).toBe(200);
      
      // Verify update
      const getResponse = await app.inject({
        method: 'GET',
        url: `/simulations/${simId}`,
      });
      const body = JSON.parse(getResponse.body);
      expect(body.name).toBe('Updated Name');
    });

    it('should reject update to non-draft simulation', async () => {
      const simId = await createTestSimulation(db, 'Completed Sim', 'completed');
      
      const response = await app.inject({
        method: 'PATCH',
        url: `/simulations/${simId}`,
        payload: {
          name: 'Should Fail',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /simulations/:id', () => {
    it('should delete a simulation', async () => {
      const simId = await createTestSimulation(db, 'Delete Test', 'draft');
      
      const response = await app.inject({
        method: 'DELETE',
        url: `/simulations/${simId}`,
      });

      expect(response.statusCode).toBe(200);
      
      // Verify deletion
      const getResponse = await app.inject({
        method: 'GET',
        url: `/simulations/${simId}`,
      });
      expect(getResponse.statusCode).toBe(404);
    });
  });

  describe('Overrides', () => {
    let simId: string;

    beforeEach(async () => {
      simId = await createTestSimulation(db, 'Override Test', 'draft');
    });

    describe('POST /simulations/:id/overrides', () => {
      it('should add an override to a draft simulation', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/simulations/${simId}/overrides`,
          payload: {
            overrideType: 'contract_term',
            targetType: 'contract',
            targetId: 'ctr_test_001',
            fieldPath: 'arr',
            overrideValue: 150000,
          },
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body.id).toMatch(/^simov_/);
      });

      it('should reject override on non-draft simulation', async () => {
        const completedSimId = await createTestSimulation(db, 'Completed', 'completed');
        
        const response = await app.inject({
          method: 'POST',
          url: `/simulations/${completedSimId}/overrides`,
          payload: {
            overrideType: 'contract_term',
            targetType: 'contract',
            targetId: 'ctr_test_001',
            fieldPath: 'arr',
            overrideValue: 150000,
          },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe('GET /simulations/:id/overrides', () => {
      it('should list overrides', async () => {
        // Add some overrides first
        await app.inject({
          method: 'POST',
          url: `/simulations/${simId}/overrides`,
          payload: {
            overrideType: 'contract_term',
            targetType: 'contract',
            targetId: 'ctr_001',
            fieldPath: 'arr',
            overrideValue: 150000,
          },
        });

        const response = await app.inject({
          method: 'GET',
          url: `/simulations/${simId}/overrides`,
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.overrides.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('DELETE /simulations/:id/overrides/:overrideId', () => {
      it('should remove an override', async () => {
        // Add override
        const addResponse = await app.inject({
          method: 'POST',
          url: `/simulations/${simId}/overrides`,
          payload: {
            overrideType: 'contract_term',
            targetType: 'contract',
            targetId: 'ctr_001',
            fieldPath: 'arr',
            overrideValue: 150000,
          },
        });
        const { id: overrideId } = JSON.parse(addResponse.body);

        // Remove override
        const response = await app.inject({
          method: 'DELETE',
          url: `/simulations/${simId}/overrides/${overrideId}`,
        });

        expect(response.statusCode).toBe(200);

        // Verify removal
        const listResponse = await app.inject({
          method: 'GET',
          url: `/simulations/${simId}/overrides`,
        });
        const body = JSON.parse(listResponse.body);
        expect(body.overrides.find((o: any) => o.id === overrideId)).toBeUndefined();
      });
    });
  });

  describe('POST /simulations/:id/run', () => {
    it('should queue a simulation run', async () => {
      const simId = await createTestSimulation(db, 'Run Test', 'draft');
      
      // Add an override
      await app.inject({
        method: 'POST',
        url: `/simulations/${simId}/overrides`,
        payload: {
          overrideType: 'contract_term',
          targetType: 'contract',
          targetId: 'ctr_001',
          fieldPath: 'arr',
          overrideValue: 150000,
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/simulations/${simId}/run`,
        payload: {
          recomputeRevRec: true,
        },
      });

      expect(response.statusCode).toBe(202);
      const body = JSON.parse(response.body);
      expect(body.runId).toMatch(/^simrun_/);
      expect(body.runNumber).toBe(1);
    });

    it('should reject run on already running simulation', async () => {
      const simId = await createTestSimulation(db, 'Running Test', 'running');
      
      const response = await app.inject({
        method: 'POST',
        url: `/simulations/${simId}/run`,
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('GET /simulations/:id/runs', () => {
    it('should list simulation runs', async () => {
      const simId = await createTestSimulation(db, 'Runs Test', 'completed');
      await createTestRun(db, simId, 1, 'completed');
      await createTestRun(db, simId, 2, 'completed');

      const response = await app.inject({
        method: 'GET',
        url: `/simulations/${simId}/runs`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.runs.length).toBe(2);
    });
  });
});

// Helper functions
async function setupTestData(db: Kysely<Database>) {
  // Check if tenant exists
  const tenant = await db.selectFrom('tenants').select('id').where('id', '=', TEST_TENANT_ID).executeTakeFirst();
  if (!tenant) {
    await db.insertInto('tenants').values({
      id: TEST_TENANT_ID,
      name: 'Test Tenant for Simulations',
      status: 'active',
    }).execute();
  }

  // Check if user exists (for created_by foreign key)
  const user = await db.selectFrom('users').select('id').where('id', '=', TEST_USER_ID).executeTakeFirst();
  if (!user) {
    await db.insertInto('users').values({
      id: TEST_USER_ID,
      email: 'test-sim@cogtics.local',
      name: 'Test Simulation User',
      status: 'active',
    }).execute();
  }

  // Check if snapshot exists
  const snapshot = await db.selectFrom('snapshots').select('id').where('id', '=', TEST_SNAPSHOT_ID).executeTakeFirst();
  if (!snapshot) {
    await db.insertInto('snapshots').values({
      id: TEST_SNAPSHOT_ID,
      tenant_id: TEST_TENANT_ID,
      status: 'complete',
    }).execute();
  }
}

async function cleanupTestData(db: Kysely<Database>) {
  await db.deleteFrom('simulation_runs').where('tenant_id', '=', TEST_TENANT_ID).execute();
  await db.deleteFrom('simulation_overrides').where('tenant_id', '=', TEST_TENANT_ID).execute();
  await db.deleteFrom('simulations').where('tenant_id', '=', TEST_TENANT_ID).execute();
  await db.deleteFrom('snapshots').where('id', '=', TEST_SNAPSHOT_ID).execute();
  await db.deleteFrom('users').where('id', '=', TEST_USER_ID).execute();
  await db.deleteFrom('tenants').where('id', '=', TEST_TENANT_ID).execute();
}

async function createTestSimulation(db: Kysely<Database>, name: string, status: string): Promise<string> {
  const id = `sim_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  await db.insertInto('simulations').values({
    id,
    tenant_id: TEST_TENANT_ID,
    snapshot_id: TEST_SNAPSHOT_ID,
    name,
    status: status as any,
    created_by: TEST_USER_ID,
  }).execute();
  return id;
}

async function createTestRun(db: Kysely<Database>, simulationId: string, runNumber: number, status: string): Promise<string> {
  const id = `simrun_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  await db.insertInto('simulation_runs').values({
    id,
    tenant_id: TEST_TENANT_ID,
    simulation_id: simulationId,
    run_number: runNumber,
    status: status as any,
    started_at: new Date(),
    finished_at: new Date(),
    processing_time_ms: 1000,
  }).execute();
  return id;
}
