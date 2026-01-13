# Cogtics Phase 5 Implementation Plan (Contract Intelligence)

This phase implements contract storage, versioning, clause-level extraction, confidence scoring,
override workflows, and readiness gating. It builds on PDF uploads (Phase 4) and snapshots (Phase 2).

## Phase 5 Goals
- Store and version contract documents with immutable lineage.
- Extract clause-level terms into structured data with confidence scores.
- Provide a human override workflow for ambiguous or missing terms.
- Gate contract readiness for downstream revenue recognition and detection.

## Deliverables
- Contract storage and versioning tables with snapshot linkage.
- PDF text extraction pipeline and clause segmentation.
- Term extraction outputs with confidence, offsets, and provenance.
- Override and review workflow for contract terms.
- Readiness status and gating logic per contract version.

## Phase 5 Work Breakdown

### 5.1 Contract Storage Model
Add tables in `packages/db/migrations`:
- `contract_documents`: id, tenant_id, snapshot_id, customer_id, source_system, source_id, s3_key, file_name, checksum, status, uploaded_at
- `contract_versions`: id, tenant_id, snapshot_id, contract_id, version, source, created_at
- `contract_clauses`: id, tenant_id, snapshot_id, contract_version_id, clause_type, text, start_offset, end_offset, page_number, created_at
- `contract_terms`: id, tenant_id, snapshot_id, contract_version_id, term_type, value_json, confidence, source_clause_id, created_at
- `contract_term_overrides`: id, tenant_id, snapshot_id, term_id, override_value_json, actor_user_id, reason, created_at
- `contract_readiness`: id, tenant_id, snapshot_id, contract_version_id, readiness_status, missing_terms_json, updated_at

Notes:
- `contract_versions` already exists in Phase 2; in Phase 5 extend it with contract intelligence fields.
- All tables include `tenant_id` + `snapshot_id` and enforce RLS.

Acceptance:
- Contracts and versions are stored with immutable lineage and S3 file references.

### 5.2 PDF Ingestion and Text Extraction
- Worker job `contracts.pdf.extract`:
  - Load PDF from S3/MinIO.
  - Extract text + layout metadata (page, offsets).
  - Store raw text in `contract_documents` metadata or separate table if large.
- Store extraction status and errors.

Acceptance:
- PDF text is persisted and retrievable for clause extraction.

### 5.3 Clause Segmentation
- Implement clause segmentation in `packages/utils/contracts`:
  - Identify headings, numbering, and paragraph blocks.
  - Split into `contract_clauses` with offsets and page numbers.
- Use deterministic rules first; add ML hooks later.

Acceptance:
- Clauses are stored with offsets and can be traced to original PDF.

### 5.4 Term Extraction (Rule + Model Hybrid)
- Implement extraction for MVP term types:
  - pricing model, billing cadence, discount, renewal terms, termination terms, usage caps, payment terms, uplift.
- Use a hybrid approach:
  - deterministic regex/rules for common patterns
  - optional LLM or model output for ambiguous cases (flagged)
- Store `confidence` and `source_clause_id`.

Acceptance:
- Extracted terms are persisted with confidence and provenance.

### 5.5 Override Workflow
- API endpoints:
  - `GET /contracts/:id/terms`
  - `POST /contracts/:id/terms/:term_id/override`
  - `GET /contracts/:id/clauses`
- Record overrides in `contract_term_overrides`.
- Mark overridden terms as authoritative for downstream use.

Acceptance:
- Users can override ambiguous terms and changes are auditable.

### 5.6 Readiness Gating
- Define readiness rules:
  - required term set per contract type
  - minimum confidence threshold
  - no critical missing terms
- Compute readiness in `contract_readiness` and expose API:
  - `GET /contracts/:id/readiness`

Acceptance:
- Contracts show `ready` or `needs_review` states.
- Downstream systems only use ready contracts.

### 5.7 Integration with Canonical Contracts
- Link contract intelligence to canonical `contracts` and `contract_versions`.
- Ensure `contract_terms` references the correct snapshot.
- Support multiple versions per contract (amendments).

Acceptance:
- Contract intelligence is snapshot-scoped and versioned.

### 5.8 Observability and Audit
- Log extraction runs, term counts, and low-confidence flags.
- Audit overrides and readiness changes.

Acceptance:
- Extraction and override actions are fully traceable.

### 5.9 Testing
- Unit tests for clause segmentation and term extraction rules.
- Integration tests for PDF -> clauses -> terms -> readiness.

Acceptance:
- Tests pass in CI with sample contract PDFs.

### 5.10 Documentation
- Add `docs/contracts-intelligence.md`:
  - term types and readiness rules
  - override workflow
  - clause segmentation approach

Acceptance:
- Documentation covers extraction and review processes.

## Phase 5 Exit Criteria
- Contract PDFs are stored and versioned with clause-level extraction.
- Terms are extracted with confidence and provenance.
- Overrides are supported and auditable.
- Contracts have readiness status gating downstream usage.

## Dependencies and Decisions
- Decide PDF extraction library and clause segmentation strategy.
- Confirm required term set and confidence thresholds.
- Determine if/when LLM-based extraction is used.

