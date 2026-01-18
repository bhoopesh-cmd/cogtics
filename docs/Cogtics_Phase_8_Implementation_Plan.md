# Cogtics Phase 8 Implementation Plan (Evidence Generation)

This phase builds immutable evidence packs for each issue, tying together source records,
calculations, contract clauses, and snapshot metadata. It extends Phase 7 detection outputs
and prepares artifacts for audit and export workflows.

## Phase 8 Goals
- Generate immutable, audit-grade evidence for every issue.
- Link evidence to source records, contract clauses, and calculations.
- Provide structured evidence APIs for UI and export services.
- Maintain snapshot-level determinism and replayability.

## Deliverables
- Evidence schema + migrations.
- Evidence generation worker jobs.
- Structured evidence API endpoints.
- Evidence completeness scoring and coverage metadata.
- Documentation for evidence contents and formats.

## Phase 8 Work Breakdown

### 8.1 Evidence Schema
Add tables in `packages/db/migrations`:
- `issue_evidence`: id, tenant_id, snapshot_id, issue_id, evidence_type, title, summary, data_json, created_at
- `issue_evidence_sources`: id, tenant_id, issue_id, source_type, source_id, source_system, s3_key, created_at
- `issue_evidence_calculations`: id, tenant_id, issue_id, calc_type, inputs_json, outputs_json, created_at
- `issue_evidence_clauses`: id, tenant_id, issue_id, clause_id, excerpt, created_at
- `issue_evidence_audit`: id, tenant_id, issue_id, evidence_version, status, generated_at

Notes:
- Evidence is immutable; new evidence creates a new record/version.
- Evidence links back to `issue_sources` when possible.
- Enforce RLS on all tenant-scoped evidence tables.

Acceptance:
- Migrations apply cleanly and are RLS-protected.

### 8.2 Evidence Generation Pipeline
Worker jobs in `apps/worker`:
- `evidence.generate`:
  - load issue, snapshot, and source data
  - compile evidence pack
  - compute completeness score
  - write evidence rows + audit record
- `evidence.regenerate` (optional):
  - regenerate for a snapshot or rule version

Acceptance:
- Evidence generation is idempotent and replay-safe.

### 8.3 Evidence Pack Structure
Define a canonical evidence structure:
- `summary`: short explanation of the issue
- `expected`: normalized expected values with sources
- `actual`: observed values with sources
- `calculations`: tables/formulas used
- `contract_clauses`: clause excerpts + offsets
- `source_records`: identifiers + system references
- `snapshot_metadata`: snapshot_id, sync timestamps, rule version

Acceptance:
- Evidence packs are consistent across rules.

### 8.4 Calculations and Reproducibility
- Store full calculation inputs/outputs in `issue_evidence_calculations`.
- Include rule metadata and rule version.
- Ensure all inputs reference snapshot-scoped data.

Acceptance:
- A reviewer can reproduce the exact calculation from stored evidence.

### 8.5 Clause and Document Evidence
- Link to `contract_clauses` and store excerpts.
- Optionally store clause image or PDF snippet in S3/MinIO.

Acceptance:
- Evidence includes source contract clause excerpts with provenance.

### 8.6 Evidence Completeness Scoring
- Score based on:
  - available source records
  - contract readiness
  - missing data coverage
  - calculation reproducibility
- Store score in `issue_evidence_audit` or `issue_evidence` metadata.

Acceptance:
- Evidence completeness is visible and filterable.

### 8.7 API Endpoints
Add endpoints:
- `GET /issues/:id/evidence`
- `GET /issues/:id/evidence/summary`
- `POST /issues/:id/evidence/regenerate` (admin)

Requirements:
- Zod validation on inputs/outputs.
- Read-only for CFO; Admin can trigger regeneration.

Acceptance:
- UI can render evidence without ad-hoc joins.

### 8.8 Storage Integration
- Store large evidence artifacts (PDF snippets, CSV calc tables) in S3/MinIO.
- Reference S3 keys in `issue_evidence_sources`.

Acceptance:
- Evidence artifacts are retrievable and tenant-scoped.

### 8.9 Observability and Audit
- Log evidence generation runtime and errors.
- Track evidence versioning in `issue_evidence_audit`.
- Audit evidence regeneration requests.

Acceptance:
- Evidence changes are traceable and auditable.

### 8.10 Testing
- Unit tests:
  - evidence assembly per rule
  - completeness scoring
- Integration tests:
  - issue -> evidence -> API output

Acceptance:
- Tests pass in CI with deterministic fixtures.

### 8.11 Documentation
- Add `docs/evidence-packs.md`:
  - evidence structure
  - completeness scoring
  - replay/regen behavior

Acceptance:
- Docs explain evidence contents and usage.

## Phase 8 Exit Criteria
- Every issue has an immutable evidence pack.
- Evidence is reproducible and tied to snapshot data.
- Evidence APIs serve UI and export workflows.
- Evidence completeness is measurable and visible.

## Dependencies and Decisions
- Decide evidence versioning strategy (per rule vs per snapshot).
- Define completeness scoring thresholds.
- Decide which evidence artifacts are stored in S3 vs DB.

