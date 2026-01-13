# Cogtics Phase 7 Implementation Plan (Detection Engine)

This phase implements deterministic revenue leakage and rev-rec mismatch detection rules.
It builds on canonical data (Phase 2), identity resolution (Phase 3), and rev-rec outputs (Phase 6).
All rules are pure functions with no side effects.

## Phase 7 Goals
- Implement a rule framework for deterministic detection.
- Generate issues with severity, confidence, and expected vs actual values.
- Provide a workflow-ready issues API with basic status transitions.
- Ensure detection is snapshot-scoped, idempotent, and replayable.

## Deliverables
- Detection schema + migrations (runs, issues, status history).
- Rule framework in `packages/rules` with versioning.
- Worker jobs to execute rule sets and persist issues.
- API endpoints to list and update issues.
- Initial MVP rule set for revenue leakage and rev-rec mismatches.

## Phase 7 Work Breakdown

### 7.1 Detection Schema
Add tables in `packages/db/migrations`:
- `detection_runs`: id, tenant_id, snapshot_id, ruleset_version, status, started_at, finished_at, stats_json, error_code, error_message
- `issues`: id, tenant_id, snapshot_id, rule_id, rule_version, status, severity, confidence, impact_amount, currency, expected_json, actual_json, dimensions_json, created_at
- `issue_status_history`: id, tenant_id, issue_id, from_status, to_status, actor_user_id, reason, created_at
- `issue_sources`: id, tenant_id, issue_id, source_type, source_id, source_system, created_at

Notes:
- `issues` are derived data; use `snapshot_id + rule_id + rule_version + dimensions_json hash` for idempotent writes.
- `issue_sources` stores minimal references for Phase 8 evidence packs.
- Enforce RLS on all tenant-scoped tables.

Acceptance:
- Migrations apply cleanly and are RLS-protected.

### 7.2 Rule Framework (Pure Functions)
Implement `packages/rules`:
- Rule interface:
  - `id`, `version`, `description`, `inputs`, `run(ctx) -> Issue[]`
- Zod schemas for:
  - rule inputs (snapshot data selectors)
  - rule outputs (Issue shape)
- Rule registry:
  - static list with versioned rules
  - optional `rule_hash` for auditability

Acceptance:
- Rules can be registered and executed deterministically.
- Rule outputs validate against Zod schemas.

### 7.3 MVP Rule Set
Implement initial deterministic rules:
- Missing invoice (contract active, no invoice in expected period)
- Underbilling (invoice < contract expected)
- Overbilling (invoice > contract expected)
- Expired discount applied
- Billing beyond contract term
- Duplicate billing
- Wrong price vs contract term
- Wrong period (billing outside service window)
- Currency mismatch
- Recognized vs invoiced mismatch (rev-rec vs billing)

Acceptance:
- Each rule produces issues with expected vs actual values and severity.

### 7.4 Detection Job Pipeline
Worker jobs in `apps/worker`:
- `detect.run`:
  - load snapshot data and rev-rec outputs
  - run ruleset in deterministic order
  - write issues and issue_sources
  - store run stats in `detection_runs`
- `detect.replay` (optional):
  - re-run a snapshot with a specified ruleset version

Acceptance:
- Detection runs are idempotent and retry-safe.
- Replays reproduce the same outputs for the same snapshot + ruleset.

### 7.5 Issue Lifecycle
- Default status: `open`
- Allowed transitions: `open -> resolved`, `open -> dismissed`, `resolved -> open`, `dismissed -> open`
- Store transitions in `issue_status_history`.
- Enforce RBAC for status updates.

Acceptance:
- Status transitions are auditable and permissioned.

### 7.6 API Endpoints
Add endpoints:
- `GET /issues?snapshot_id=...`
- `GET /issues/:id`
- `POST /issues/:id/status`
- `GET /issues/summary?snapshot_id=...`

Requirements:
- Zod-validated query params and bodies.
- Read-only for CFO role; Analyst/Admin can update status.
- Audit log entries for status changes.

Acceptance:
- Issues are listable and status updates are recorded.

### 7.7 Severity and Confidence Model
- Define severity levels: `low`, `medium`, `high`, `critical`.
- Confidence scoring based on:
  - data completeness
  - rule determinism
  - contract readiness
- Store confidence in `issues.confidence`.

Acceptance:
- Issues are consistently scored and filterable by severity/confidence.

### 7.8 Idempotency and De-duplication
- Use deterministic issue keys per rule to avoid duplicates.
- On rerun with same ruleset version:
  - delete + insert within a transaction, or
  - upsert with deterministic keys.

Acceptance:
- Reruns do not create duplicates.

### 7.9 Observability
- Log run start/end, rule counts, issue counts, error counts.
- Store per-rule stats in `detection_runs.stats_json`.

Acceptance:
- Detection runs are traceable and replayable.

### 7.10 Testing
- Unit tests for each rule with fixtures.
- Integration tests:
  - snapshot + rev-rec -> issues -> API read

Acceptance:
- Tests pass in CI with deterministic outputs.

### 7.11 Documentation
- Add `docs/detection-rules.md`:
  - rule definitions and inputs
  - severity/confidence model
  - replay behavior

Acceptance:
- Documentation covers rules and operational semantics.

## Phase 7 Exit Criteria
- Detection rules generate issues for each snapshot.
- Issues are versioned, idempotent, and auditable.
- Status lifecycle is enforced and logged.
- API exposes issues and summaries per snapshot.

## Dependencies and Decisions
- Confirm MVP rule set and thresholds.
- Decide ruleset versioning strategy and release cadence.
- Confirm severity/confidence calibration.

