# Cogtics Phase 4 Implementation Plan (Remaining Integrations + Manual Uploads)

This phase adds HubSpot, QuickBooks, and DocuSign connectors plus CSV/PDF manual uploads,
all mapped into the same ingestion pipeline and canonical model from Phase 2.

## Phase 4 Goals
- Implement remaining connectors with OAuth, schema discovery, and incremental sync.
- Provide manual CSV and PDF upload flows for customers without direct integrations.
- Normalize all new inputs into the canonical pipeline with full lineage and auditability.
- Maintain Zod validation at every boundary, idempotency, and stateless workers.

## Deliverables
- Connectors for HubSpot, QuickBooks, and DocuSign in `packages/connectors`.
- API endpoints for connection lifecycle, upload intake, and job orchestration.
- Worker jobs to parse/validate CSV and PDF uploads and create raw batches.
- Database tables for uploads, files, parse runs, and extraction results.
- Updated documentation and integration runbooks.

## Phase 4 Work Breakdown

### 4.1 Connector Implementations (HubSpot, QuickBooks, DocuSign)
- Implement connector modules with the Phase 1 contract:
  - `getAuthUrl`, `exchangeCode`, `refreshToken`, `discoverSchema`, `syncObject`, `healthCheck`
- Scope selection and token refresh handling:
  - HubSpot: CRM objects, companies, deals, line items, products, owners
  - QuickBooks: customers, invoices, payments, items, terms, accounts (read-only)
  - DocuSign: envelopes, documents, recipients, status, signed timestamps
- Rate-limit and retry handling per provider.

Acceptance:
- OAuth flow completes and tokens are stored securely.
- Incremental sync works for at least one core object per provider.

### 4.2 Schema Discovery and Object Selection
- Implement discovery for each provider:
  - HubSpot: API metadata + static schema map for MVP objects
  - QuickBooks: endpoints and entity schemas (static map)
  - DocuSign: envelope/document metadata (static map)
- Store `connector_schemas` entries and allow object selection per connection.

Acceptance:
- Discovered schemas persist and can be re-fetched on demand.

### 4.3 Connection Configuration + Permissions
- Extend `connections.config_json` to include:
  - selected objects
  - sync frequency
  - date ranges / backfill limits
- Add validation for config updates with Zod.
- Enforce RBAC for config changes.

Acceptance:
- Config changes are persisted, validated, and auditable.

### 4.4 Manual Upload Model (CSV/PDF)
Add tables in `packages/db/migrations`:
- `uploads`: id, tenant_id, type, status, created_by, created_at, completed_at, error_code, error_message
- `upload_files`: id, upload_id, file_name, content_type, s3_key, checksum, size, created_at
- `upload_mappings`: id, upload_id, entity_type, mapping_json, created_at
- `upload_parse_runs`: id, upload_id, status, stats_json, created_at, finished_at
- `upload_parse_errors`: id, upload_id, row_number, field, error_message, created_at

Notes:
- Store all files in S3/MinIO and keep DB rows small.
- Enforce RLS on upload tables.

Acceptance:
- Upload metadata is persisted and tenant scoped.

### 4.5 CSV Upload Pipeline
- API endpoints:
  - `POST /uploads/csv/start` -> signed URL + upload_id
  - `POST /uploads/csv/complete` -> enqueue parse job
  - `GET /uploads/:id` -> status + errors
- Worker jobs:
  - `upload.csv.parse`:
    - read CSV from S3/MinIO
    - validate rows with Zod + mapping rules
    - store row-level errors
    - write normalized rows to staging or directly to `raw_batches`
  - `upload.csv.finalize`:
    - write summary stats
    - mark upload complete

Acceptance:
- CSVs can be uploaded, parsed, validated, and ingested.
- Row-level errors are visible via API.

### 4.6 PDF Upload Pipeline (Contracts)
- API endpoints:
  - `POST /uploads/pdf/start` -> signed URL + upload_id
  - `POST /uploads/pdf/complete` -> enqueue parse job
- Worker jobs:
  - `upload.pdf.parse`:
    - store PDF in S3/MinIO
    - extract text and metadata (basic PDF parser)
    - create `raw_batches` record for downstream contract intelligence

Acceptance:
- PDFs can be uploaded and stored with lineage metadata.
- Parsed text is stored for Phase 5 extraction.

### 4.7 Normalization into Canonical Pipeline
- Map CSV uploads into the same normalized schemas used in Phase 2.
- Generate `raw_batches` for manual uploads to reuse ingestion pipeline.
- Ensure `source_system=manual_upload` and `source_batch_id` are set.

Acceptance:
- Manual data flows through the same ingestion stages as connector data.

### 4.8 Idempotency and Reprocessing
- Use upload-level idempotency keys to avoid duplicate ingestion.
- Allow reprocessing with a new upload run and explicit versioning.

Acceptance:
- Re-uploading does not duplicate canonical records unintentionally.

### 4.9 Observability and Audit
- Log upload start, completion, and errors with request_id + upload_id.
- Add audit log entries for uploads and mapping changes.

Acceptance:
- Upload actions are fully auditable.

### 4.10 Testing
- Unit tests for CSV parsers and mapping validators.
- Integration tests:
  - CSV upload -> parse -> raw batch -> canonical ingest
  - PDF upload -> raw batch creation

Acceptance:
- Tests pass in CI with sample fixtures.

### 4.11 Documentation
- Add `docs/uploads.md`:
  - CSV format requirements
  - mapping templates
  - error handling and reprocessing
- Add connector docs for HubSpot, QuickBooks, DocuSign.

Acceptance:
- Docs cover setup, scopes, and expected data shapes.

## Phase 4 Exit Criteria
- HubSpot, QuickBooks, and DocuSign connectors authenticate and sync incrementally.
- CSV uploads are validated, ingested, and visible in canonical data.
- PDF uploads are stored with extractable text for Phase 5.
- All new inputs retain lineage and are snapshot-scoped.

## Dependencies and Decisions
- Confirm initial object lists for HubSpot, QuickBooks, DocuSign.
- Define CSV templates for each canonical entity.
- Choose PDF parsing library and extraction depth for Phase 5 readiness.

