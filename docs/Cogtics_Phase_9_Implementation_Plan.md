# Cogtics Phase 9 Implementation Plan (Simulation Engine)

This phase implements snapshot-based simulations that apply parameter overrides without
mutating source data. Simulations generate delta impact analysis for revenue, timing, and
recognition. All results are immutable and audit-grade.

## Phase 9 Goals
- Support snapshot cloning and override application without side effects.
- Compute delta impact for revenue and rev-rec schedules.
- Allow multiple fixes per simulation and template reuse.
- Persist simulation inputs, outputs, and evidence for auditability.

## Deliverables
- Simulation schema + migrations (runs, overrides, results, templates).
- Simulation engine in `packages/utils` or `packages/revrec` (pure functions).
- Worker jobs to execute simulations and persist outputs.
- API endpoints to create, run, and view simulations.
- UI-ready data structure for scenario comparisons.

## Phase 9 Work Breakdown

### 9.1 Simulation Schema
Add tables in `packages/db/migrations`:
- `simulations`: id, tenant_id, snapshot_id, name, description, status, created_by, created_at, updated_at
- `simulation_overrides`: id, tenant_id, simulation_id, override_type, target_id, payload_json, created_at
- `simulation_runs`: id, tenant_id, simulation_id, status, started_at, finished_at, error_code, error_message
- `simulation_results`: id, tenant_id, simulation_id, summary_json, created_at
- `simulation_deltas`: id, tenant_id, simulation_id, delta_type, delta_json, created_at
- `simulation_templates`: id, tenant_id, name, description, template_json, created_at

Notes:
- All tables include `tenant_id` and enforce RLS.
- `simulation_results` and `simulation_deltas` are immutable per run.

Acceptance:
- Migrations apply cleanly and are RLS-protected.

### 9.2 Simulation Override Model
Define override types:
- contract term override (price, cadence, discount)
- usage adjustment (add/remove usage events)
- billing adjustment (simulate invoice correction)
- timing shift (service dates, recognition windows)

Use Zod schemas to validate each override payload.

Acceptance:
- Overrides validate and serialize deterministically.

### 9.3 Simulation Engine (Pure Functions)
Implement a pure simulation engine:
- Input: base snapshot data + overrides
- Output: simulated canonical view + rev-rec outputs
- Compare to baseline snapshot to compute deltas

Acceptance:
- Engine produces deterministic results with no side effects.

### 9.4 Snapshot Clone and Isolation
- Simulations do not mutate canonical tables.
- Use in-memory or temp tables for simulation context.
- Persist only deltas and summary outputs.

Acceptance:
- Base snapshot remains unchanged.

### 9.5 Delta Computation
Compute deltas:
- revenue impact (total and per period)
- recognized vs deferred shifts
- contract-level impact summary
- issue-level changes (optional)

Acceptance:
- Deltas are stored and queryable by simulation ID.

### 9.6 Worker Jobs
Implement jobs in `apps/worker`:
- `simulation.run`:
  - load snapshot data
  - apply overrides
  - compute outputs + deltas
  - persist results
- `simulation.replay` (optional):
  - re-run a simulation with a new ruleset/engine version

Acceptance:
- Simulation runs are idempotent and retry-safe.

### 9.7 API Endpoints
Add endpoints:
- `POST /simulations` (create)
- `POST /simulations/:id/run`
- `GET /simulations/:id`
- `GET /simulations/:id/results`
- `GET /simulations/:id/deltas`
- `POST /simulation-templates`
- `GET /simulation-templates`

Requirements:
- Zod-validated requests and responses.
- RBAC: CFO/Analyst can create, Admin can manage templates.

Acceptance:
- Users can create and run simulations with visible results.

### 9.8 Templates and Reuse
- Allow saving simulation templates with parameter slots.
- Support “apply template” on a new snapshot.

Acceptance:
- Templates are reusable across snapshots.

### 9.9 Observability and Audit
- Log simulation runs with inputs and output summaries.
- Audit creation and execution actions.

Acceptance:
- Simulation changes are traceable and reproducible.

### 9.10 Testing
- Unit tests for override validation and delta computation.
- Integration tests:
  - snapshot -> override -> simulation run -> results

Acceptance:
- Tests pass in CI with deterministic fixtures.

### 9.11 Documentation
- Add `docs/simulations.md`:
  - override types
  - delta metrics
  - template usage

Acceptance:
- Documentation explains simulation flow and outputs.

## Phase 9 Exit Criteria
- Simulations run on snapshot data without mutation.
- Deltas and results are persisted and queryable.
- Templates are reusable and auditable.
- API exposes simulations and results for UI use.

## Dependencies and Decisions
- Confirm required override types for MVP.
- Decide on storage strategy for simulated intermediate data.
- Decide if simulations can alter detection issues in this phase.

