# Cogtics Phase 1 Implementation Plan (Connector Framework)

This plan builds on Phase 0 foundations and implements the connector framework with
OAuth, schema discovery, incremental sync, rate limiting, retries, logging, and health checks.
Stripe and Salesforce are the first two production-grade connectors.

## Phase 1 Goals
- Standardize connector contracts in `packages/connectors`.
- Enable OAuth-based connections with secure credential storage and refresh.
- Support schema discovery and object selection.
- Implement incremental sync with idempotent, retry-safe jobs.
- Persist raw payloads and sync metadata for Phase 2 ingestion.

## Deliverables
- Connector SDK and interface contract (auth, discover, sync, health).
- API endpoints for connection lifecycle and schema discovery.
- Worker processors to run sync jobs and persist raw payloads.
- Postgres tables for connections, credentials, schemas, cursors, runs, and raw batches.
- Stripe and Salesforce connectors with full incremental sync and rate limit handling.

## Phase 1 Work Breakdown

### 1.1 Connector Contract and Package Structure
- Create `packages/connectors` with:
  - `types.ts` for shared connector interfaces
  - `base/` helpers (pagination, retry, rate limit, logging)
  - `stripe/` and `salesforce/` implementations
- Define connector interface:
  - `getAuthUrl()`
  - `exchangeCode()`
  - `refreshToken()`
  - `discoverSchema()`
  - `syncObject()`
  - `healthCheck()`
- Use Zod to validate:
  - OAuth responses
  - API payloads
  - Connector config and sync settings

Acceptance:
- A mock connector can be registered and invoked through the common interface.
- All connector inputs/outputs are Zod-validated.

### 1.2 Database Schema Extensions (Connector Metadata)
Add tables in `packages/db/migrations`:
- `connections`: id, tenant_id, provider, status, display_name, config_json, created_by, created_at, updated_at, last_sync_at, last_success_at, last_error_at, last_error_code, last_error_message
- `connection_credentials`: id, connection_id, access_token_enc, refresh_token_enc, token_type, scopes, expires_at, external_account_id, created_at, updated_at, last_refreshed_at
- `connector_schemas`: id, connection_id, object_type, schema_json, discovered_at
- `connector_cursors`: id, connection_id, object_type, cursor_json, updated_at, last_seen_at
- `connector_runs`: id, connection_id, run_type, status, started_at, finished_at, records_fetched, objects_fetched, error_code, error_message, idempotency_key_id
- `raw_batches`: id, tenant_id, connection_id, run_id, object_type, s3_key, record_count, min_updated_at, max_updated_at, checksum, created_at

Notes:
- Store raw payloads in S3/MinIO as JSONL batches; keep DB rows small.
- Enforce RLS on all tenant-scoped tables.
- Add unique indexes where needed (connection_id + object_type for cursors).

Acceptance:
- Migrations apply cleanly.
- Kysely types generated for new tables.
- RLS blocks cross-tenant access.

### 1.3 Credential Security
- Implement envelope encryption for tokens:
  - Local dev: `TOKEN_ENCRYPTION_KEY`
  - Prod: KMS-managed keys
- Never log tokens or sensitive headers.
- Implement token refresh flow with backoff.

Acceptance:
- Tokens are encrypted at rest and decryptable for use.
- Refresh flow updates `connection_credentials` without downtime.

### 1.4 Connection Lifecycle API
Add API endpoints:
- `POST /connections/:provider/start` -> returns OAuth URL
- `POST /connections/:provider/callback` -> stores credentials, creates connection
- `GET /connections` -> list connections (tenant scoped)
- `GET /connections/:id/schema` -> stored schema
- `POST /connections/:id/discover` -> run schema discovery
- `POST /connections/:id/sync` -> enqueue sync job (admin or system role)
- `POST /connections/:id/health` -> run health check

Requirements:
- Zod validation on all requests.
- RBAC enforced for each endpoint.
- Audit log entries for create, update, and sync actions.

Acceptance:
- A user can connect Stripe or Salesforce and see it in `GET /connections`.
- Schema discovery persists and returns objects/fields.
- Sync job enqueueing works and is idempotent.

### 1.5 Schema Discovery
- Stripe:
  - Use static schema map for core objects.
- Salesforce:
  - Use `sobjects/describe` and per-object `describe` calls.
- Persist schema to `connector_schemas` with discovered timestamp.

Acceptance:
- Stripe schema returns objects: customers, subscriptions, invoices, invoice_lines, charges, refunds, products, prices.
- Salesforce schema returns objects: accounts, opportunities, opportunity_line_items, contracts, pricebook_entries, users.

### 1.6 Incremental Sync Engine
Common sync flow:
- Load connection config and credentials from DB.
- For each selected object type:
  - Read cursor from `connector_cursors`
  - Fetch pages with rate limit handling
  - Validate each payload with Zod
  - Write raw batches to S3 as JSONL
  - Update cursor and `connector_runs` stats
- Mark run complete and update connection `last_sync_at`.

Acceptance:
- Initial sync loads full history for core objects.
- Subsequent sync uses cursor and only fetches deltas.
- Sync runs are idempotent and retry-safe.

### 1.7 Rate Limiting and Retries
- Implement shared retry helper:
  - Exponential backoff for 429 and 5xx
  - Respect `Retry-After` when present
- Implement per-connector throttling:
  - Stripe: global rate limit per account
  - Salesforce: API usage limits and daily caps
- Emit structured log events for rate limit hits.

Acceptance:
- Sync jobs do not fail on temporary rate limiting.
- Retry logic is observable in logs.

### 1.8 Health Checks
- Connector `healthCheck()` verifies:
  - Token validity
  - API access to a lightweight endpoint
  - Provider account ID matches stored data
- Update `connections.status` and error details.

Acceptance:
- Health check results visible via API.
- Failed checks set `status=error` with error details.

### 1.9 Worker Execution Model
- Use BullMQ in `apps/worker`:
  - Job payload: connection_id, object_types, run_type, requested_by, idempotency_key
  - Validate payload with Zod
  - Load connection and credentials at runtime (stateless worker)
- Persist `connector_runs` and `raw_batches` with each job.

Acceptance:
- Worker processes multiple object types per run.
- Jobs can be safely retried without duplicate raw batches.

### 1.10 Logging and Metrics
- Emit pino logs at:
  - auth start/callback
  - schema discovery
  - sync start/end
  - rate limit events
- Include `tenant_id`, `connection_id`, `run_id`, `request_id`.

Acceptance:
- Logs are searchable by connection and run.
- Failed syncs capture error_code and message.

### 1.11 Testing
- Unit tests:
  - OAuth helpers
  - Cursor management
  - Rate limiter behavior
- Integration tests (local):
  - Mock Stripe/Salesforce API with fixtures
  - Validate raw batch storage and cursor updates

Acceptance:
- Unit tests pass in CI.
- Integration tests validate at least one object per connector.

### 1.12 Documentation
- Add `docs/connectors.md`:
  - Connector lifecycle
  - OAuth flow
  - Schema discovery
  - Sync semantics and cursor format
- Add `docs/stripe-connector.md` and `docs/salesforce-connector.md`.

Acceptance:
- Docs describe how to add a new connector using the framework.

## Phase 1 Exit Criteria
- Stripe and Salesforce connectors can authenticate and run incremental syncs.
- Schema discovery works and persists results.
- Raw payloads are stored in S3/MinIO with DB metadata.
- Sync jobs are idempotent, retry-safe, and observable.
- Connection health and status are visible via API.

## Dependencies and Decisions
- Confirm list of Stripe and Salesforce objects for initial sync.
- Confirm OAuth redirect URLs and callback handling per environment.
- Decide token encryption strategy for production (KMS provider).

