# Production Readiness Test Plan (End-to-End)

This document defines a comprehensive production readiness and robustness test plan for the Cogtics monorepo. It is grounded in the current repo structure and the synthetic datasets already generated under `tools/synthetic-data/output`.

## 1) Objectives

- Validate end-to-end correctness of all critical flows (API, workers, frontend, integrations).
- Confirm robustness under load, concurrency, and failure conditions.
- Verify multi-tenant isolation (RLS), auth/RBAC, and audit coverage.
- Validate AI-augmented detection (if enabled) against ground truth.
- Establish performance baselines and release exit criteria.

## 2) Scope and System Under Test

### Services
- API: `apps/api`
- Web: `apps/web`
- Worker: `apps/worker`
- Infra: Postgres, Redis, MinIO, Observability stack via `docker/docker-compose.yml`

### Major Feature Areas
- Ingestion, snapshots, identity resolution, manual uploads
- Contract intelligence, detection, evidence generation
- RevRec and simulations
- Exports and digests
- Integrations (connectors)
- Observability

## 3) Datasets and Fixtures

### Primary Functional Dataset (deterministic)
- `tools/synthetic-data/output/test_comprehensive`
  - Summary: `tools/synthetic-data/output/test_comprehensive/summary.json`
  - Intended for deterministic validation and fast regression.

### Load/Scale Dataset (multi-tenant)
- `tools/synthetic-data/output/stress_test`
  - Summary: `tools/synthetic-data/output/stress_test/summary.json`
  - Includes multi-tenant and multi-snapshot data.

### Ground Truth and Expected Outputs
- `tools/synthetic-data/output/stress_test/expected_outputs/expected_issues.json`
- `tools/synthetic-data/output/stress_test/expected_outputs/ai_test_cases.json`
- `tools/synthetic-data/output/stress_test/expected_outputs/rule_coverage.json`

### Upload Fixtures
- Valid uploads: `tools/synthetic-data/output/stress_test/uploads/valid`
- Malformed uploads: `tools/synthetic-data/output/stress_test/uploads/malformed`

### Connector Payloads
- `tools/synthetic-data/output/stress_test/connectors/*`

## 4) Environments

### Required Local Services
- Postgres, Redis, MinIO, Prometheus, Grafana, Loki, Tempo
- Docker compose: `docker/docker-compose.yml`

### Service Startup
- Infra: `pnpm docker:up`
- API: `pnpm dev:api`
- Web: `pnpm dev:web`
- Worker: `pnpm dev:worker`

### Seeded Test Users
Defined in `CLAUDE.md` after `pnpm db:seed`:
- Admin: `user_01` / `tenant_01`
- CFO: `user_02` / `tenant_01`
- Analyst: `user_03` / `tenant_01`

## 5) Test Phases and Detailed Steps

### Phase A: Baseline Regression (Automated)

#### A1. Unit and Integration Tests
- Command: `pnpm test`
- Coverage includes:
  - API smoke tests: `apps/api/tests/smoke/*`
  - API integration tests: `apps/api/tests/integration/*`
  - Rules engine: `packages/rules/src/__tests__/*`
  - RevRec: `packages/revrec/src/__tests__/*`
  - Simulation engine: `packages/utils/src/simulation/__tests__/*`
  - LLM utilities: `packages/utils/src/llm/__tests__/*`

#### A2. Type and Lint Checks
- Commands:
  - `pnpm typecheck`
  - `pnpm lint`

#### A3. Determinism and Pure Function Checks
- Validate that rules, revrec, and simulation outputs are deterministic for a fixed input set.
- Run the same inputs twice and confirm identical outputs (no hidden state or side effects).
- Targets:
  - `packages/rules`
  - `packages/revrec`
  - `packages/utils/src/simulation`

Expected Results:
- All tests and checks pass without errors.

---

### Phase B: Data Preparation

#### B1. Migrations and Seed
- Commands:
  - `pnpm db:migrate`
  - `pnpm db:seed`

#### B2. Import Synthetic CSV Dataset (if needed)
Use the import script when database population is required directly from CSVs:
- Command:
  - `pnpm tsx packages/db/src/import-dataset.ts <dataset-path>`
- Example:
  - `pnpm tsx packages/db/src/import-dataset.ts tools/synthetic-data/output/stress_test/data/csv`

Expected Results:
- Import completes with expected row counts printed by the script.

#### B3. Backup, Restore, and Migration Rollback
- Verify backup creation (e.g., pg_dump or platform backup).
- Restore into a clean environment and validate row counts and critical flows.
- Test migration rollback on a staging database and confirm schema and data integrity.

---

### Phase C: API and Worker Health

#### C1. API Health
- Check: `GET /health`
- Expected: HTTP 200

#### C2. Worker Health
- Check each worker:
  - `http://localhost:3011/health`
  - `http://localhost:3012/health`
  - `http://localhost:3013/health`
- Expected: HTTP 200 with `{"status":"ok"}` and uptime data.

---

### Phase D: Core End-to-End Functional Flows

#### D0. Schema Validation at Boundaries (Zod)
- API requests: send invalid payloads for each major route and confirm 400 with validation details.
- Connector payloads: inject invalid shapes and confirm rejects and error logging.
- Job payloads: enqueue malformed jobs and confirm worker rejects without side effects.
- Expected: invalid inputs are rejected consistently at every boundary.

#### D1. Auth, Tenant Isolation, RBAC
- Validate requests across roles (admin, cfo, analyst).
- Verify RLS and tenant isolation using `x-tenant-id`.
- Expected: cross-tenant access denied; correct permissions enforced.

#### D2. Ingestion and Snapshots
- Use ingestion routes:
  - `/ingestion`, `/snapshots`, `/data`
- Steps:
  1) Create snapshot
  2) Load synthetic data
  3) Verify snapshot-scoped queries
- Verify `snapshot_id` is required and present in payloads, outputs, and stored records.
- Expected: snapshot data is isolated and queryable by tenant.

#### D3. Identity Resolution
- Routes: `/identity`
- Validate deduped identities for multi-tenant data.
- Expected: identities resolve, merges recorded, no cross-tenant leakage.

#### D3b. Connector OAuth and Failure Handling
- Simulate expired/invalid tokens, revoked access, and partial scope failures.
- Validate graceful degradation and actionable errors without data corruption.

#### D4. Manual Uploads (CSV/PDF)
- Routes: `/uploads/*`
- Steps:
  - Upload valid CSVs from `tools/synthetic-data/output/stress_test/data/csv`
  - Upload PDF fixtures from `tools/synthetic-data/output/stress_test/pdfs*`
  - Test malformed upload fixtures
- Expected:
  - Valid files parse and ingest successfully
  - Malformed uploads produce row-level errors and fail cleanly

#### D5. Contract Intelligence
- Routes: `/contracts/*`
- Validate:
  - extraction jobs
  - clause segmentation
  - term extraction
  - readiness scoring
- Expected: contract documents linked to snapshots, readiness scores computed.

#### D6. RevRec
- Routes: `/revrec/*`
- Validate generated obligations and schedules against synthetic data output.
- Expected: correct schedule generation and reconciliation results.

#### D7. Detection and Issues
- Routes: `/issues/*`
- Run detection jobs and compare results to `expected_issues.json`.
- Expected: precision/recall within acceptable thresholds.

#### D8. Simulations
- Routes: `/simulations/*`
- Steps:
  - Create simulation
  - Apply overrides
  - Run and replay simulations
- Expected: simulation results and deltas are correct and reproducible.

#### D9. Exports and Digests
- Routes: `/exports/*`, `/digests/*`
- Validate:
  - export generation (CSV/PDF)
  - signed URL downloads
  - export integrity (hash or checksum) and presign expiry behavior
  - audit logs
- Expected: exports complete, downloads succeed, audit events captured.

#### D10. Idempotency and Replay Safety
- Re-run ingestion, detection, and export jobs with the same idempotency key.
- Confirm no duplicate writes, issues, or exports are produced.

#### D11. Worker Statelessness
- Restart workers mid-processing and confirm jobs resume using only DB state and payloads.
- Validate no reliance on in-memory state across restarts.

---

### Phase E: AI-Augmented Detection Validation (Optional)

#### E1. AI Detection Validation
- Script: `tools/synthetic-data/validate-ai-detection.ts`
- Command:
  - `pnpm tsx tools/synthetic-data/validate-ai-detection.ts`
- Requires `OPENAI_API_KEY` in `.env`.
- Expected: AI tiers produce enrichments and anomalies within config limits.

#### E2. Comprehensive AI Validation
- Script: `tools/synthetic-data/validate_comprehensive.py`
- Command:
  - `python tools/synthetic-data/validate_comprehensive.py --data-dir tools/synthetic-data/output/test_comprehensive/data --output-file validation_report.json`
- Expected: F1 and precision/recall thresholds met; output report saved.

---

### Phase F: Frontend Functional Testing

#### F1. Core UI Flows
- Validate UI routes corresponding to API paths:
  - Connections, uploads, contracts, issues, simulations, exports, digests
- Verify loading states, error handling, and retry flows.

#### F2. Browser and Responsive
- Chrome, Edge, Safari
- Mobile breakpoints and tablets
- Expected: no layout breaks, actions succeed on all targets.

#### F3. Accessibility
- Keyboard navigation, focus indicators, contrast checks.
- Expected: no blocking accessibility issues.

---

### Phase G: Performance and Stress

#### G1. Volume and Concurrency Tests
- Use `tools/stress-test`:
  - `npm run test:small`
  - `npm run test:medium`
  - `npm run test:large`
  - `npm run test:all`
- Validate metrics in `tools/stress-test/results` and reports in `tools/stress-test/outputs`.

#### G2. Mixed Workload and Multi-Tenant
- Run scripts in `tools/stress-test/scripts`:
  - `mixed-workload-test.ts`
  - `multi-tenant-test.ts`
  - `concurrency-test.ts`

#### G3. SLOs and Success Criteria
- Define per-endpoint latency SLOs (p50/p95/p99) and error-rate budgets.
- Define per-queue throughput and latency targets.
- Record baselines and compare against prior releases.

Expected Results:
- Success rate >95%
- Avg process time <10s per PDF
- Peak queue depth <1000
- Worker memory <2GB

---

### Phase H: Resilience and Failure Testing

#### H1. Worker Crash/Restart
- Stop a worker mid-processing and verify job retry and idempotency.

#### H2. Redis/Postgres Restart
- Restart Redis/Postgres and verify reconnection and processing recovery.

#### H3. MinIO Failure
- Disable MinIO and validate error handling and retry behavior.

#### H4. DLQ, Backoff, and Poison Messages
- Inject a poison payload that always fails and confirm it lands in DLQ.
- Validate exponential backoff and max retries per job type.
- Confirm DLQ requeue workflow is safe and audited.

Expected Results:
- No data corruption
- Retries occur with exponential backoff
- System returns to steady state

---

### Phase I: Security and Compliance

- Validate RBAC boundaries for admin-only routes (`/admin`, exports management).
- Confirm RLS enforcement with explicit negative cases (cross-tenant joins, exports, issues, audits).
- Auth hardening: invalid/expired JWTs, refresh flows, key rotation, CSRF (if cookie auth is used).
- Rate limiting and abuse: validate throttling and error surfaces under burst requests.
- Data retention and PII workflows: deletion, redaction, and retention policy checks.
- Verify audit logs for sensitive operations (uploads, exports, simulations).

---

### Phase J: Observability

- Confirm `/metrics` endpoints for API and worker are scraped.
- Validate worker health dashboard from `docker/grafana/provisioning/dashboards/worker-health.json`.
- Ensure trace correlation IDs are present in logs.

## 6) Exit Criteria (Release Gates)

- All unit, integration, and smoke tests pass.
- No P0/P1 issues remaining.
- Detection validation meets F1 and precision/recall thresholds.
- Load tests meet throughput and latency targets.
- No cross-tenant data leakage.
- Idempotency, DLQ, and retry behaviors are verified.
- Backup/restore and rollback procedures are validated.
- Observability dashboards and alerts are operational.

## 7) Artifacts and Reporting

- Test logs, reports, and summaries saved to:
  - `tools/stress-test/results`
  - `tools/stress-test/outputs`
  - Validation reports from AI scripts
- Store performance baselines and compare across releases.

## 8) Notes

- Use `tools/synthetic-data/README.md` for dataset generation and stress scenarios.
- Use `docs/ai-detection-rollout.md` for AI configuration and rollout thresholds.
- Ensure `.env` is set with proper credentials before AI validation.
