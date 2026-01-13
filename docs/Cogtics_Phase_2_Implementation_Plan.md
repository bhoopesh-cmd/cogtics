# Cogtics Phase 2 Implementation Plan (Canonical Data Model + Ingestion)

This plan builds on Phase 0 (foundations) and Phase 1 (connectors) to implement the
canonical data model and ingestion pipeline. It preserves immutable snapshots, Zod validation
at every boundary, Kysely-only data access, and stateless workers.

## Phase 2 Goals
- Define the canonical schema and snapshot model used by all downstream engines.
- Implement an ingestion pipeline that transforms raw connector batches into canonical tables.
- Ensure idempotent, retry-safe ingestion with clear lineage and auditability.
- Produce immutable snapshots with completeness/coverage metadata.

## Deliverables
- Canonical schema + migrations with snapshot-scoped tables.
- Ingestion worker jobs (staging -> normalize -> upsert -> snapshot finalize).
- Zod schemas for normalized and canonical models.
- Data quality checks and coverage metrics for each snapshot.
- API endpoints to list snapshot status and ingestion runs.

## Phase 2 Work Breakdown

### 2.1 Canonical Schema Design
Define the canonical entities and their relationships (snapshot-scoped):
- `snapshots`: id, tenant_id, source_run_id, status, started_at, completed_at, metadata_json
- `sync_runs`: id, tenant_id, type, status, started_at, finished_at, error_code, error_message
- `customers`: id, tenant_id, snapshot_id, external_ids_json, name, status, created_at
- `contracts`: id, tenant_id, snapshot_id, customer_id, external_ids_json, status, start_date, end_date, created_at
- `contract_versions`: id, tenant_id, snapshot_id, contract_id, version, source, created_at
- `contract_terms`: id, tenant_id, snapshot_id, contract_version_id, term_type, value_json, confidence, source_clause, created_at
- `invoices`: id, tenant_id, snapshot_id, customer_id, external_ids_json, invoice_date, currency, total, status
- `invoice_lines`: id, tenant_id, snapshot_id, invoice_id, product_code, quantity, unit_price, amount, service_start, service_end
- `payments`: id, tenant_id, snapshot_id, invoice_id, amount, payment_date, method, status
- `usage_events`: id, tenant_id, snapshot_id, customer_id, metric, quantity, event_time, source
- `products`: id, tenant_id, snapshot_id, sku, name, category, status
- `price_plans`: id, tenant_id, snapshot_id, product_id, billing_cadence, price_json, currency

Notes:
- All canonical tables include `snapshot_id` and `tenant_id`.
- Only immutable snapshot-scoped data; no in-place updates.
- Create views for latest snapshot to simplify API access (read-only).

Acceptance:
- Canonical schema is defined and migrated.
- Kysely types reflect snapshot_id on all canonical entities.

### 2.2 Staging Model and Raw Batch Lineage
- Create staging tables to ingest raw connector records:
  - `staging_records`: id, tenant_id, connection_id, object_type, raw_json, received_at, batch_id
- Add lineage columns in canonical tables:
  - `source_batch_id`, `source_record_id`, `source_system`
- Store raw batches in S3/MinIO and track in `raw_batches` (from Phase 1).

Acceptance:
- Each canonical record links back to source batch and system.
- Raw payloads remain immutable and retrievable.

### 2.3 Ingestion Pipeline Orchestration
Implement ingestion jobs in `apps/worker`:
- `ingest.load`:
  - Reads `raw_batches` and writes records to `staging_records`.
  - Validates raw payloads with Zod.
- `ingest.normalize`:
  - Maps provider objects -> normalized intermediate shape.
  - Uses pure functions in `packages/utils` or `packages/schemas`.
- `ingest.upsert`:
  - Writes normalized records into canonical tables with `snapshot_id`.
  - Enforces idempotency keys.
- `ingest.snapshot_finalize`:
  - Marks snapshot complete.
  - Computes coverage metrics and completeness.

Acceptance:
- Ingestion pipeline runs end-to-end for a tenant.
- Each stage is retry-safe with idempotency.
- Snapshot transitions from `building` to `complete`.

### 2.4 Normalization and Mapping Functions
- Create `packages/schemas/normalized` with Zod schemas for intermediate shapes:
  - `NormalizedCustomer`, `NormalizedInvoice`, `NormalizedContract`, etc.
- Implement provider mapping functions (pure, stateless):
  - `mapStripeInvoice`, `mapSalesforceOpportunity`, etc.
- All normalization functions return Zod-validated objects or errors.

Acceptance:
- Mapping functions are unit tested with fixtures.
- Invalid inputs fail fast with clear error metadata.

### 2.5 Idempotent Canonical Writes
- Use stable keys:
  - `external_ids_json` includes provider + object ID.
- Unique constraints:
  - `(tenant_id, snapshot_id, external_id)` per entity.
- Upsert logic:
  - Kysely `insert ... on conflict do nothing` for idempotency.
- Use `idempotency_keys` for ingestion jobs and for batch-level writes.

Acceptance:
- Re-running ingestion does not duplicate canonical records.
- Idempotency works across retries and partial failures.

### 2.6 Snapshot Creation and Finalization
- Add snapshot lifecycle:
  - `building` -> `validating` -> `complete` or `failed`.
- Store snapshot metadata:
  - record counts per object
  - missing coverage per connection
  - data freshness timestamp
- Expose API endpoint:
  - `GET /snapshots`
  - `GET /snapshots/:id`

Acceptance:
- API shows snapshots and their completeness metadata.
- Snapshot IDs are used in all canonical queries.

### 2.7 Data Quality Checks
- Build a basic quality check suite:
  - missing required fields
  - negative amounts where not allowed
  - duplicate invoice numbers in a snapshot
- Store quality results in `snapshot_metadata` or a `snapshot_quality` table.

Acceptance:
- Failed checks are logged and visible in snapshot metadata.

### 2.8 API for Canonical Data (Read-Only)
Add read-only endpoints with snapshot scoping:
- `GET /customers?snapshot_id=...`
- `GET /contracts?snapshot_id=...`
- `GET /invoices?snapshot_id=...`

Requirements:
- Zod-validated query params.
- Default to latest snapshot when not provided.

Acceptance:
- API returns canonical data for the latest snapshot.
- Data is read-only at this phase.

### 2.9 Logging and Observability
- Ingestion jobs emit logs with:
  - tenant_id, snapshot_id, run_id, batch_id, object_type
- Store ingestion run status and errors in `sync_runs`.

Acceptance:
- Failures are visible with enough context to replay.

### 2.10 Testing
- Unit tests:
  - normalization functions
  - idempotent writes
- Integration tests:
  - ingest raw batch -> canonical rows -> snapshot finalized

Acceptance:
- Tests pass in CI with sample connector fixtures.

### 2.11 Documentation
- Add `docs/ingestion.md`:
  - pipeline stages
  - snapshot lifecycle
  - canonical schema overview
- Add `docs/canonical-model.md` describing entity relationships and IDs.

Acceptance:
- New developers can follow ingestion flow from raw batch to canonical tables.

## Phase 2 Exit Criteria
- Canonical tables are created with snapshot scoping.
- Ingestion pipeline runs end-to-end from raw batches to canonical data.
- Snapshots are immutable, complete, and auditable.
- API can read canonical data by snapshot_id.
- Idempotency and retry safety are proven in tests.

## Dependencies and Decisions
- Confirm canonical entity list and required fields.
- Confirm which provider objects map to which canonical entities.
- Decide on coverage metrics and snapshot completeness thresholds.

