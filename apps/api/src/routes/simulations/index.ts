/**
 * Simulation API Routes (Phase 9)
 * 
 * Endpoints for simulations, overrides, runs, results, and templates.
 */
import { FastifyPluginAsync } from 'fastify';
import {
  SimulationListQuerySchema,
  CreateSimulationSchema,
  UpdateSimulationSchema,
  AddOverrideSchema,
  RunSimulationSchema,
  SimulationRunListQuerySchema,
  SimulationDeltasQuerySchema,
  TemplateListQuerySchema,
  CreateTemplateSchema,
  ApplyTemplateSchema,
  generateSimulationId,
  generateSimulationOverrideId,
  generateSimulationRunId,
  generateSimulationTemplateId,
  generateSimulationAuditId,
} from '@cogtics/schemas';

export const simulationRoutes: FastifyPluginAsync = async (fastify) => {
  const { db, queues } = fastify;

  // ============================================
  // Simulations CRUD
  // ============================================

  // GET /simulations - List simulations
  fastify.get('/', async (request) => {
    const tenantId = request.tenantId;
    const query = SimulationListQuerySchema.parse(request.query);

    let dbQuery = db
      .selectFrom('simulations')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    // Apply filters
    if (query.snapshotId) {
      dbQuery = dbQuery.where('snapshot_id', '=', query.snapshotId);
    }
    if (query.status) {
      dbQuery = dbQuery.where('status', '=', query.status);
    }
    if (query.templateId) {
      dbQuery = dbQuery.where('template_id', '=', query.templateId);
    }
    if (query.createdBy) {
      dbQuery = dbQuery.where('created_by', '=', query.createdBy);
    }

    // Count total
    const countResult = await db
      .selectFrom('simulations')
      .select(db.fn.countAll().as('count'))
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    const total = Number(countResult?.count || 0);

    // Apply sorting and pagination
    dbQuery = dbQuery
      .orderBy(query.sortBy === 'name' ? 'name' : query.sortBy === 'status' ? 'status' : query.sortBy === 'updated_at' ? 'updated_at' : 'created_at', query.sortOrder)
      .offset((query.page - 1) * query.limit)
      .limit(query.limit);

    const simulations = await dbQuery.execute();

    return {
      simulations: simulations.map(s => ({
        id: s.id,
        snapshotId: s.snapshot_id,
        name: s.name,
        description: s.description,
        status: s.status,
        templateId: s.template_id,
        createdBy: s.created_by,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  });

  // POST /simulations - Create simulation
  fastify.post('/', async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    const body = CreateSimulationSchema.parse(request.body);

    // Verify snapshot exists
    const snapshot = await db
      .selectFrom('snapshots')
      .select('id')
      .where('id', '=', body.snapshotId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!snapshot) {
      return reply.status(404).send({ error: 'Snapshot not found' });
    }

    const simulationId = generateSimulationId();

    await db
      .insertInto('simulations')
      .values({
        id: simulationId,
        tenant_id: tenantId,
        snapshot_id: body.snapshotId,
        name: body.name,
        description: body.description || null,
        status: 'draft',
        template_id: body.templateId || null,
        created_by: userId || null,
      })
      .execute();

    // If template provided, copy overrides from template
    if (body.templateId) {
      const template = await db
        .selectFrom('simulation_templates')
        .select('template_json')
        .where('id', '=', body.templateId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (template) {
        const templateData = template.template_json as { overrides?: unknown[] };
        if (templateData.overrides && Array.isArray(templateData.overrides)) {
          for (let i = 0; i < templateData.overrides.length; i++) {
            const override = templateData.overrides[i] as Record<string, unknown>;
            await db
              .insertInto('simulation_overrides')
              .values({
                id: generateSimulationOverrideId(),
                tenant_id: tenantId,
                simulation_id: simulationId,
                override_type: override.overrideType as any,
                target_type: override.targetType as any,
                target_id: override.targetId as string,
                field_path: override.fieldPath as string || null,
                original_value_json: null,
                override_value_json: JSON.stringify(override.overrideValue),
                sequence_number: i,
                is_valid: true,
                validation_message: null,
              })
              .execute();
          }
        }

        // Audit template application
        await db
          .insertInto('simulation_audit')
          .values({
            id: generateSimulationAuditId(),
            tenant_id: tenantId,
            simulation_id: simulationId,
            run_id: null,
            action: 'template_applied',
            actor_user_id: userId || null,
            details_json: JSON.stringify({ templateId: body.templateId }),
          })
          .execute();
      }
    }

    // Audit simulation creation
    await db
      .insertInto('simulation_audit')
      .values({
        id: generateSimulationAuditId(),
        tenant_id: tenantId,
        simulation_id: simulationId,
        run_id: null,
        action: 'created',
        actor_user_id: userId || null,
        details_json: JSON.stringify({ name: body.name, snapshotId: body.snapshotId }),
      })
      .execute();

    return reply.status(201).send({
      id: simulationId,
      message: 'Simulation created successfully',
    });
  });

  // GET /simulations/:id - Get simulation details
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const tenantId = request.tenantId;
    const { id } = request.params;

    const simulation = await db
      .selectFrom('simulations')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!simulation) {
      return reply.status(404).send({ error: 'Simulation not found' });
    }

    // Get overrides count
    const overridesResult = await db
      .selectFrom('simulation_overrides')
      .select(db.fn.countAll().as('count'))
      .where('simulation_id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    // Get latest run
    const latestRun = await db
      .selectFrom('simulation_runs')
      .selectAll()
      .where('simulation_id', '=', id)
      .where('tenant_id', '=', tenantId)
      .orderBy('run_number', 'desc')
      .executeTakeFirst();

    return {
      id: simulation.id,
      snapshotId: simulation.snapshot_id,
      name: simulation.name,
      description: simulation.description,
      status: simulation.status,
      templateId: simulation.template_id,
      createdBy: simulation.created_by,
      createdAt: simulation.created_at,
      updatedAt: simulation.updated_at,
      overridesCount: Number(overridesResult?.count || 0),
      latestRun: latestRun ? {
        id: latestRun.id,
        runNumber: latestRun.run_number,
        status: latestRun.status,
        startedAt: latestRun.started_at,
        finishedAt: latestRun.finished_at,
        processingTimeMs: latestRun.processing_time_ms,
      } : null,
    };
  });

  // PATCH /simulations/:id - Update simulation
  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    const { id } = request.params;
    const body = UpdateSimulationSchema.parse(request.body);

    const simulation = await db
      .selectFrom('simulations')
      .select(['id', 'status'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!simulation) {
      return reply.status(404).send({ error: 'Simulation not found' });
    }

    if (simulation.status !== 'draft') {
      return reply.status(400).send({ error: 'Only draft simulations can be updated' });
    }

    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (body.name) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status) updates.status = body.status;

    await db
      .updateTable('simulations')
      .set(updates)
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .execute();

    // Audit update
    await db
      .insertInto('simulation_audit')
      .values({
        id: generateSimulationAuditId(),
        tenant_id: tenantId,
        simulation_id: id,
        run_id: null,
        action: 'updated',
        actor_user_id: userId || null,
        details_json: JSON.stringify(body),
      })
      .execute();

    return { message: 'Simulation updated successfully' };
  });

  // DELETE /simulations/:id - Delete simulation
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    const { id } = request.params;

    const simulation = await db
      .selectFrom('simulations')
      .select('id')
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!simulation) {
      return reply.status(404).send({ error: 'Simulation not found' });
    }

    // Audit deletion before deleting
    await db
      .insertInto('simulation_audit')
      .values({
        id: generateSimulationAuditId(),
        tenant_id: tenantId,
        simulation_id: id,
        run_id: null,
        action: 'deleted',
        actor_user_id: userId || null,
        details_json: null,
      })
      .execute();

    // Delete cascade will handle related records
    await db
      .deleteFrom('simulations')
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .execute();

    return { message: 'Simulation deleted successfully' };
  });

  // ============================================
  // Overrides
  // ============================================

  // GET /simulations/:id/overrides - List overrides
  fastify.get<{ Params: { id: string } }>('/:id/overrides', async (request, reply) => {
    const tenantId = request.tenantId;
    const { id } = request.params;

    const overrides = await db
      .selectFrom('simulation_overrides')
      .selectAll()
      .where('simulation_id', '=', id)
      .where('tenant_id', '=', tenantId)
      .orderBy('sequence_number', 'asc')
      .execute();

    return {
      overrides: overrides.map(o => ({
        id: o.id,
        overrideType: o.override_type,
        targetType: o.target_type,
        targetId: o.target_id,
        fieldPath: o.field_path,
        originalValue: o.original_value_json,
        overrideValue: o.override_value_json,
        sequenceNumber: o.sequence_number,
        isValid: o.is_valid,
        validationMessage: o.validation_message,
        createdAt: o.created_at,
      })),
    };
  });

  // POST /simulations/:id/overrides - Add override
  fastify.post<{ Params: { id: string } }>('/:id/overrides', async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    const { id } = request.params;
    const body = AddOverrideSchema.parse(request.body);

    const simulation = await db
      .selectFrom('simulations')
      .select(['id', 'status'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!simulation) {
      return reply.status(404).send({ error: 'Simulation not found' });
    }

    if (simulation.status !== 'draft') {
      return reply.status(400).send({ error: 'Cannot add overrides to non-draft simulations' });
    }

    // Get next sequence number
    const maxSeq = await db
      .selectFrom('simulation_overrides')
      .select(db.fn.max('sequence_number').as('max'))
      .where('simulation_id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    const nextSeq = (maxSeq?.max ? Number(maxSeq.max) + 1 : 0);

    const overrideId = generateSimulationOverrideId();

    await db
      .insertInto('simulation_overrides')
      .values({
        id: overrideId,
        tenant_id: tenantId,
        simulation_id: id,
        override_type: body.overrideType,
        target_type: body.targetType,
        target_id: body.targetId,
        field_path: body.fieldPath || null,
        original_value_json: body.originalValue ? JSON.stringify(body.originalValue) : null,
        override_value_json: JSON.stringify(body.overrideValue),
        sequence_number: body.sequenceNumber ?? nextSeq,
        is_valid: true,
        validation_message: null,
      })
      .execute();

    // Audit
    await db
      .insertInto('simulation_audit')
      .values({
        id: generateSimulationAuditId(),
        tenant_id: tenantId,
        simulation_id: id,
        run_id: null,
        action: 'override_added',
        actor_user_id: userId || null,
        details_json: JSON.stringify({ overrideId, overrideType: body.overrideType }),
      })
      .execute();

    return reply.status(201).send({
      id: overrideId,
      message: 'Override added successfully',
    });
  });

  // DELETE /simulations/:id/overrides/:overrideId - Remove override
  fastify.delete<{ Params: { id: string; overrideId: string } }>(
    '/:id/overrides/:overrideId',
    async (request, reply) => {
      const tenantId = request.tenantId;
      const userId = request.userId;
      const { id, overrideId } = request.params;

      const simulation = await db
        .selectFrom('simulations')
        .select(['id', 'status'])
        .where('id', '=', id)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!simulation) {
        return reply.status(404).send({ error: 'Simulation not found' });
      }

      if (simulation.status !== 'draft') {
        return reply.status(400).send({ error: 'Cannot remove overrides from non-draft simulations' });
      }

      await db
        .deleteFrom('simulation_overrides')
        .where('id', '=', overrideId)
        .where('simulation_id', '=', id)
        .where('tenant_id', '=', tenantId)
        .execute();

      // Audit
      await db
        .insertInto('simulation_audit')
        .values({
          id: generateSimulationAuditId(),
          tenant_id: tenantId,
          simulation_id: id,
          run_id: null,
          action: 'override_removed',
          actor_user_id: userId || null,
          details_json: JSON.stringify({ overrideId }),
        })
        .execute();

      return { message: 'Override removed successfully' };
    }
  );

  // ============================================
  // Run Simulation
  // ============================================

  // POST /simulations/:id/run - Execute simulation
  fastify.post<{ Params: { id: string } }>('/:id/run', async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    const { id } = request.params;
    const body = RunSimulationSchema.parse(request.body || {});

    const simulation = await db
      .selectFrom('simulations')
      .select(['id', 'status', 'snapshot_id'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!simulation) {
      return reply.status(404).send({ error: 'Simulation not found' });
    }

    if (simulation.status === 'running') {
      return reply.status(409).send({ error: 'Simulation is already running' });
    }

    // Get next run number
    const maxRun = await db
      .selectFrom('simulation_runs')
      .select(db.fn.max('run_number').as('max'))
      .where('simulation_id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    const runNumber = (maxRun?.max ? Number(maxRun.max) + 1 : 1);
    const runId = generateSimulationRunId();

    // Create run record
    await db
      .insertInto('simulation_runs')
      .values({
        id: runId,
        tenant_id: tenantId,
        simulation_id: id,
        run_number: runNumber,
        status: 'pending',
        started_at: null,
        finished_at: null,
        processing_time_ms: null,
        triggered_by: userId || null,
        options_json: JSON.stringify(body),
        error_code: null,
        error_message: null,
      })
      .execute();

    // Update simulation status
    await db
      .updateTable('simulations')
      .set({
        status: 'pending',
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .execute();

    // Audit run start
    await db
      .insertInto('simulation_audit')
      .values({
        id: generateSimulationAuditId(),
        tenant_id: tenantId,
        simulation_id: id,
        run_id: runId,
        action: 'run_started',
        actor_user_id: userId || null,
        details_json: JSON.stringify({ runNumber, options: body }),
      })
      .execute();

    // Queue the simulation job
    const simulationQueue = (queues as any)?.['simulation.run'];
    if (simulationQueue) {
      await simulationQueue.add('simulation.run', {
        tenantId,
        jobId: runId,
        payload: {
          type: 'simulation.run',
          tenantId,
          simulationId: id,
          runId,
          options: body,
        },
      });
    }

    return reply.status(202).send({
      runId,
      runNumber,
      message: 'Simulation run queued',
    });
  });

  // GET /simulations/:id/runs - List runs
  fastify.get<{ Params: { id: string } }>('/:id/runs', async (request) => {
    const tenantId = request.tenantId;
    const { id } = request.params;
    const query = SimulationRunListQuerySchema.parse(request.query);

    let dbQuery = db
      .selectFrom('simulation_runs')
      .selectAll()
      .where('simulation_id', '=', id)
      .where('tenant_id', '=', tenantId);

    if (query.status) {
      dbQuery = dbQuery.where('status', '=', query.status);
    }

    dbQuery = dbQuery
      .orderBy('run_number', 'desc')
      .offset((query.page - 1) * query.limit)
      .limit(query.limit);

    const runs = await dbQuery.execute();

    return {
      runs: runs.map(r => ({
        id: r.id,
        runNumber: r.run_number,
        status: r.status,
        startedAt: r.started_at,
        finishedAt: r.finished_at,
        processingTimeMs: r.processing_time_ms,
        triggeredBy: r.triggered_by,
        errorCode: r.error_code,
        errorMessage: r.error_message,
        createdAt: r.created_at,
      })),
    };
  });

  // GET /simulations/:id/runs/:runId/results - Get run results
  fastify.get<{ Params: { id: string; runId: string } }>(
    '/:id/runs/:runId/results',
    async (request, reply) => {
      const tenantId = request.tenantId;
      const { id, runId } = request.params;

      const result = await db
        .selectFrom('simulation_results')
        .selectAll()
        .where('run_id', '=', runId)
        .where('simulation_id', '=', id)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!result) {
        return reply.status(404).send({ error: 'Results not found' });
      }

      return {
        id: result.id,
        runId: result.run_id,
        simulationId: result.simulation_id,
        totalRevenueBaseline: result.total_revenue_baseline,
        totalRevenueSimulated: result.total_revenue_simulated,
        totalRevenueDelta: result.total_revenue_delta,
        totalRevenueDeltaPct: result.total_revenue_delta_pct,
        totalRecognizedBaseline: result.total_recognized_baseline,
        totalRecognizedSimulated: result.total_recognized_simulated,
        totalDeferredBaseline: result.total_deferred_baseline,
        totalDeferredSimulated: result.total_deferred_simulated,
        contractsAffected: result.contracts_affected,
        obligationsAffected: result.obligations_affected,
        overridesApplied: result.overrides_applied,
        overridesSkipped: result.overrides_skipped,
        summary: result.summary_json,
        warnings: result.warnings_json,
        createdAt: result.created_at,
      };
    }
  );

  // GET /simulations/:id/runs/:runId/deltas - Get run deltas
  fastify.get<{ Params: { id: string; runId: string } }>(
    '/:id/runs/:runId/deltas',
    async (request) => {
      const tenantId = request.tenantId;
      const { id, runId } = request.params;
      const query = SimulationDeltasQuerySchema.parse(request.query);

      let dbQuery = db
        .selectFrom('simulation_deltas')
        .selectAll()
        .where('run_id', '=', runId)
        .where('simulation_id', '=', id)
        .where('tenant_id', '=', tenantId);

      if (query.deltaType) {
        dbQuery = dbQuery.where('delta_type', '=', query.deltaType);
      }
      if (query.targetType) {
        dbQuery = dbQuery.where('target_type', '=', query.targetType);
      }
      if (query.targetId) {
        dbQuery = dbQuery.where('target_id', '=', query.targetId);
      }

      dbQuery = dbQuery
        .orderBy('created_at', 'asc')
        .offset((query.page - 1) * query.limit)
        .limit(query.limit);

      const deltas = await dbQuery.execute();

      return {
        deltas: deltas.map(d => ({
          id: d.id,
          deltaType: d.delta_type,
          targetType: d.target_type,
          targetId: d.target_id,
          periodStart: d.period_start,
          periodEnd: d.period_end,
          baselineAmount: d.baseline_amount,
          simulatedAmount: d.simulated_amount,
          deltaAmount: d.delta_amount,
          deltaPct: d.delta_pct,
          currency: d.currency,
          details: d.details_json,
          createdAt: d.created_at,
        })),
      };
    }
  );

  // ============================================
  // Templates
  // ============================================

  // GET /simulation-templates - List templates
  fastify.get('/templates', async (request) => {
    const tenantId = request.tenantId;
    const query = TemplateListQuerySchema.parse(request.query);

    let dbQuery = db
      .selectFrom('simulation_templates')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (query.isActive !== undefined) {
      dbQuery = dbQuery.where('is_active', '=', query.isActive);
    }

    dbQuery = dbQuery
      .orderBy('created_at', 'desc')
      .offset((query.page - 1) * query.limit)
      .limit(query.limit);

    const templates = await dbQuery.execute();

    return {
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        isActive: t.is_active,
        overridesCount: ((t.template_json as { overrides?: unknown[] })?.overrides || []).length,
        createdBy: t.created_by,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })),
    };
  });

  // POST /simulation-templates - Create template
  fastify.post('/templates', async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    const body = CreateTemplateSchema.parse(request.body);

    const templateId = generateSimulationTemplateId();

    await db
      .insertInto('simulation_templates')
      .values({
        id: templateId,
        tenant_id: tenantId,
        name: body.name,
        description: body.description || null,
        template_json: JSON.stringify({
          overrides: body.overrides,
          defaultOptions: body.defaultOptions || {},
        }),
        is_active: true,
        created_by: userId || null,
      })
      .execute();

    return reply.status(201).send({
      id: templateId,
      message: 'Template created successfully',
    });
  });

  // GET /simulation-templates/:id - Get template
  fastify.get<{ Params: { id: string } }>('/templates/:id', async (request, reply) => {
    const tenantId = request.tenantId;
    const { id } = request.params;

    const template = await db
      .selectFrom('simulation_templates')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      templateJson: template.template_json,
      isActive: template.is_active,
      createdBy: template.created_by,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    };
  });

  // POST /simulation-templates/:id/apply - Apply template to new simulation
  fastify.post<{ Params: { id: string } }>('/templates/:id/apply', async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    const { id: templateId } = request.params;
    const body = ApplyTemplateSchema.parse(request.body);

    const template = await db
      .selectFrom('simulation_templates')
      .select(['id', 'template_json'])
      .where('id', '=', templateId)
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .executeTakeFirst();

    if (!template) {
      return reply.status(404).send({ error: 'Template not found or inactive' });
    }

    // Create simulation with template
    const simulationId = generateSimulationId();

    await db
      .insertInto('simulations')
      .values({
        id: simulationId,
        tenant_id: tenantId,
        snapshot_id: body.snapshotId,
        name: body.name,
        description: body.description || null,
        status: 'draft',
        template_id: templateId,
        created_by: userId || null,
      })
      .execute();

    // Copy overrides from template
    const templateData = template.template_json as { overrides?: unknown[] };
    if (templateData.overrides && Array.isArray(templateData.overrides)) {
      for (let i = 0; i < templateData.overrides.length; i++) {
        const override = templateData.overrides[i] as Record<string, unknown>;
        await db
          .insertInto('simulation_overrides')
          .values({
            id: generateSimulationOverrideId(),
            tenant_id: tenantId,
            simulation_id: simulationId,
            override_type: override.overrideType as any,
            target_type: override.targetType as any,
            target_id: override.targetId as string,
            field_path: override.fieldPath as string || null,
            original_value_json: null,
            override_value_json: JSON.stringify(override.overrideValue),
            sequence_number: i,
            is_valid: true,
            validation_message: null,
          })
          .execute();
      }
    }

    // Audit
    await db
      .insertInto('simulation_audit')
      .values({
        id: generateSimulationAuditId(),
        tenant_id: tenantId,
        simulation_id: simulationId,
        run_id: null,
        action: 'template_applied',
        actor_user_id: userId || null,
        details_json: JSON.stringify({ templateId }),
      })
      .execute();

    return reply.status(201).send({
      simulationId,
      message: 'Simulation created from template',
    });
  });
};

export default simulationRoutes;
