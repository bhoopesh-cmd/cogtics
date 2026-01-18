# Cogtics Phase 10 Implementation Plan (Exports & Digests)

This phase delivers CSV exports, server-rendered PDFs, and scheduled email digests.
All exports are snapshot-scoped, immutable, and audit-grade.

## Phase 10 Goals
- Provide point-in-time CSV and PDF exports from snapshots.
- Generate audit bundles with evidence links and calculation traces.
- Deliver scheduled email digests for high-impact issues and changes.
- Ensure exports are secure, auditable, and repeatable.

## Deliverables
- Export schema + migrations (requests, files, schedules, audit).
- Worker jobs to generate CSVs, render PDFs, and send digests.
- API endpoints to request, list, and download exports.
- HTML template system for PDF reports.
- Documentation for export types and digest behavior.

## Phase 10 Work Breakdown

### 10.1 Export Schema
Add tables in `packages/db/migrations`:
- `exports`: id, tenant_id, snapshot_id, export_type, format, status, requested_by, created_at, completed_at, error_code, error_message
- `export_files`: id, tenant_id, export_id, s3_key, file_name, content_type, size, checksum, created_at
- `export_items`: id, tenant_id, export_id, item_type, item_id, metadata_json, created_at
- `export_schedules`: id, tenant_id, name, cadence, scope_json, status, created_by, created_at, updated_at
- `export_runs`: id, tenant_id, schedule_id, status, started_at, finished_at, error_code, error_message
- `export_audit`: id, tenant_id, export_id, action, actor_user_id, details_json, created_at

Notes:
- `export_type` examples: `issues_csv`, `revrec_csv`, `contracts_pdf`, `audit_bundle_pdf`.
- All tables include `tenant_id` and enforce RLS.

Acceptance:
- Migrations apply cleanly and are RLS-protected.

### 10.2 Export Types and Definitions
Define export type registry (Zod-validated):
- CSV exports:
  - Issues list (with severity/confidence)
  - Rev-rec schedules
  - Contract terms (readiness + confidence)
- PDF exports:
  - Audit report bundle (issues + evidence summaries)
  - Executive summary report

Acceptance:
- Export types are versioned and documented.

### 10.3 CSV Export Pipeline
Worker job `export.csv.generate`:
- Load snapshot-scoped data.
- Stream CSV rows to S3/MinIO.
- Store `export_files` metadata.
- Write `export_items` for traceability (optional).

Acceptance:
- CSV exports are generated and downloadable.

### 10.4 PDF Export Pipeline
Worker job `export.pdf.render`:
- Render HTML templates with snapshot data.
- Convert to PDF using server-side renderer (Playwright/Puppeteer).
- Store PDF in S3/MinIO and persist metadata.

Acceptance:
- PDFs render consistently and are stored with checksums.

### 10.5 Evidence Integration
- Embed evidence summaries in PDF exports.
- Link to full evidence packs via signed URLs.
- Include snapshot_id, ruleset_version, and timestamps in all exports.

Acceptance:
- Exports are audit-grade and traceable.

### 10.6 Email Digests
Add tables in `packages/db/migrations`:
- `digest_subscriptions`: id, tenant_id, cadence, scope_json, recipients_json, status, created_at
- `digest_runs`: id, tenant_id, subscription_id, status, started_at, finished_at, error_code, error_message

Worker job `digest.send`:
- Aggregate changes since last run (issues, high-impact deltas).
- Render HTML email + attach/export links.
- Send via provider (SES/SendGrid); dev uses console or file sink.

Acceptance:
- Digests send on schedule and include snapshot references.

### 10.7 API Endpoints
Add endpoints:
- `POST /exports` (request export)
- `GET /exports` (list exports)
- `GET /exports/:id` (export status + files)
- `POST /exports/:id/regenerate`
- `GET /exports/:id/download` (signed URL)
- `POST /digests` / `GET /digests` / `PATCH /digests/:id`

Requirements:
- Zod-validated requests.
- RBAC enforced (CFO/Admin for export creation).

Acceptance:
- API supports export lifecycle and digest scheduling.

### 10.8 Security and Access Control
- Signed URLs with short TTL.
- Export access limited to tenant + role.
- Audit every export request, download, and regeneration.

Acceptance:
- Exports are access-controlled and auditable.

### 10.9 Observability
- Log export/digest jobs with request_id, export_id, schedule_id.
- Track job runtimes and failure rates.

Acceptance:
- Export activity is traceable and observable.

### 10.10 Testing
- Unit tests for CSV and PDF renderers.
- Integration tests:
  - export request -> file stored -> signed URL
  - digest run -> email payload constructed

Acceptance:
- Tests pass in CI with deterministic fixtures.

### 10.11 Documentation
- Add `docs/exports.md`:
  - export types and formats
  - template structure
  - digest cadence and scope

Acceptance:
- Docs explain usage and operational behavior.

## Phase 10 Exit Criteria
- Users can request CSV and PDF exports tied to a snapshot.
- Exports are stored in S3/MinIO with metadata and audit logs.
- Scheduled email digests run reliably with snapshot references.
- All export actions are secure, auditable, and repeatable.

## Dependencies and Decisions
- Choose PDF renderer (Playwright vs Puppeteer).
- Confirm email provider and delivery settings.
- Define export type list and minimum dataset per export.

