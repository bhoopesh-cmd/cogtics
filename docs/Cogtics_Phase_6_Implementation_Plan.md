# Cogtics Phase 6 Implementation Plan (Revenue Recognition Engine)

This phase implements ASC 606-aligned revenue recognition logic, schedules, and reconciliation
against invoices and contracts. It builds on canonical data (Phase 2) and contract intelligence (Phase 5).

## Phase 6 Goals
- Define a revenue recognition data model (performance obligations and schedules).
- Compute recognition schedules from contract terms and billing events.
- Track deferred vs recognized revenue and reconciliation outputs.
- Provide immutable, snapshot-scoped outputs with auditability.

## Deliverables
- Rev-rec schema + migrations (obligations, allocations, schedules, events).
- Pure calculation engine in `packages/revrec`.
- Worker jobs to compute schedules and store results.
- API endpoints to view schedules and reconciliation status.
- Baseline rules for straight-line and usage-based recognition.

## Phase 6 Work Breakdown

### 6.1 Rev-Rec Schema
Add tables in `packages/db/migrations`:
- `revenue_obligations`: id, tenant_id, snapshot_id, contract_id, obligation_type, description, transaction_price, allocation_method, created_at
- `revenue_allocations`: id, tenant_id, snapshot_id, obligation_id, allocation_pct, allocated_amount, created_at
- `revenue_schedules`: id, tenant_id, snapshot_id, obligation_id, period_start, period_end, amount, method, status
- `recognition_events`: id, tenant_id, snapshot_id, obligation_id, event_date, recognized_amount, event_type, created_at
- `deferred_revenue_balances`: id, tenant_id, snapshot_id, obligation_id, period_end, deferred_amount, created_at
- `revrec_reconciliations`: id, tenant_id, snapshot_id, contract_id, status, variance_amount, details_json, created_at

Notes:
- All tables include `tenant_id` + `snapshot_id` and enforce RLS.
- All outputs are immutable per snapshot.

Acceptance:
- Migrations apply cleanly and are RLS-protected.

### 6.2 Rev-Rec Engine (Pure Functions)
Implement `packages/revrec`:
- Input: contracts, contract_terms, invoices, usage_events
- Output: obligations, allocations, schedules, recognition events
- Must be pure, deterministic, and snapshot-scoped.
- Zod schemas for inputs and outputs.

Acceptance:
- Engine can produce schedules with no side effects.

### 6.3 Obligation Identification
- Identify performance obligations from contract terms:
  - subscription access
  - usage-based services
  - one-time services
- Link obligations to contract versions.

Acceptance:
- Each contract produces one or more obligations with clear metadata.

### 6.4 Transaction Price Allocation
- Implement allocation rules:
  - standalone selling price proportional allocation
  - default straight-line if no SSP
- Store allocation in `revenue_allocations`.

Acceptance:
- Allocations sum to total transaction price.

### 6.5 Schedule Generation
- Straight-line recognition:
  - allocate evenly across service period
- Usage-based recognition:
  - recognize based on usage events and billing cadence
- Support partial periods and contract amendments.

Acceptance:
- Schedules are generated for each obligation with correct periodization.

### 6.6 Deferred and Recognized Balances
- Compute deferred revenue balances per period.
- Record recognition events with dates and amounts.

Acceptance:
- Deferred balance and recognized totals reconcile to transaction price.

### 6.7 Reconciliation vs Billing
- Compare recognition schedules with invoiced amounts:
  - timing mismatch
  - amount variance
- Store variance in `revrec_reconciliations` with details.

Acceptance:
- Reconciliation outputs are available per contract and snapshot.

### 6.8 Worker Jobs and Orchestration
Implement worker jobs:
- `revrec.compute`:
  - load snapshot data
  - run rev-rec engine
  - persist outputs
- `revrec.reconcile`:
  - generate reconciliation outputs

Acceptance:
- Jobs are idempotent and retry-safe.

### 6.9 API Endpoints
- `GET /revrec/schedules?snapshot_id=...`
- `GET /revrec/obligations?snapshot_id=...`
- `GET /revrec/reconciliations?snapshot_id=...`

Requirements:
- Zod-validated query params.
- Read-only at this phase.

Acceptance:
- API exposes rev-rec results per snapshot.

### 6.10 Observability and Audit
- Log engine runtime, record counts, and errors.
- Audit job runs and reconciliation output generation.

Acceptance:
- Rev-rec runs are traceable and replayable.

### 6.11 Testing
- Unit tests for engine rules and allocation math.
- Integration tests:
  - contract + invoice -> schedule -> reconciliation

Acceptance:
- Tests pass in CI with deterministic fixtures.

### 6.12 Documentation
- Add `docs/revenue-recognition.md`:
  - obligation model
  - allocation and scheduling rules
  - reconciliation outputs

Acceptance:
- Documentation covers rev-rec logic and outputs.

## Phase 6 Exit Criteria
- Rev-rec schedules and obligations are produced per snapshot.
- Deferred and recognized totals reconcile to contract values.
- Reconciliation outputs are available via API.
- Outputs are immutable and auditable.

## Dependencies and Decisions
- Confirm required obligation types for MVP.
- Define allocation rules (SSP vs default).
- Decide how to handle amendments and mid-term changes.

