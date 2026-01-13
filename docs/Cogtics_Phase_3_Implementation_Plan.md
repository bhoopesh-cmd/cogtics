# Cogtics Phase 3 Implementation Plan (Identity Resolution)

This plan implements deterministic and assisted identity resolution across CRM, billing,
accounting, and contract sources. It builds on the canonical model and snapshots from Phase 2.

## Phase 3 Goals
- Establish a canonical customer identity model with deterministic and assisted matching.
- Generate a human confirmation queue for ambiguous matches.
- Support suppression rules and manual overrides with auditability.
- Ensure identity resolution is snapshot-scoped, idempotent, and replayable.

## Deliverables
- Identity resolution tables and migrations (snapshot-scoped).
- Worker jobs for automated matching, queue generation, and decision application.
- Zod schemas for identity inputs, match features, and decisions.
- API endpoints for identity review and resolved customer views.
- Deterministic matching rules with confidence scoring and versioning.

## Phase 3 Work Breakdown

### 3.1 Identity Resolution Configuration
- Add tenant-level settings:
  - primary CRM source (Salesforce or HubSpot)
  - matching thresholds (auto-merge, review)
  - blocking keys (domain, tax_id, normalized name, address)
- Store settings in a `tenant_settings` table or config JSON on `tenants`.

Acceptance:
- Each tenant can select a primary CRM and thresholds.

### 3.2 Identity Resolution Schema
Add tables in `packages/db/migrations`:
- `identity_runs`: id, tenant_id, snapshot_id, status, started_at, finished_at, rules_version, stats_json, error_code, error_message
- `customer_identities`: id, tenant_id, snapshot_id, primary_customer_id, confidence, method, created_at
- `customer_identity_members`: id, tenant_id, snapshot_id, identity_id, customer_id, source_system, confidence, role, created_at
- `identity_candidates`: id, tenant_id, snapshot_id, customer_id_a, customer_id_b, score, features_json, status, created_at
- `identity_tasks`: id, tenant_id, snapshot_id, candidate_id, status, assigned_to, created_at, resolved_at
- `identity_decisions`: id, tenant_id, snapshot_id, task_id, decision, actor_user_id, notes, created_at
- `identity_overrides`: id, tenant_id, snapshot_id, customer_id, identity_id, method, actor_user_id, created_at
- `identity_suppressions`: id, tenant_id, customer_id_a, customer_id_b, reason, created_at

Notes:
- All identity tables include `tenant_id` and `snapshot_id`.
- `identity_suppressions` may be global (no snapshot) to prevent future matches.
- Add indexes on `(tenant_id, snapshot_id)` and on customer IDs for candidate lookups.
- Enforce RLS on all tenant-scoped identity tables.

Acceptance:
- Migrations apply cleanly and are RLS-protected.
- Kysely types include identity tables.

### 3.3 Deterministic Matching Rules
Implement versioned rules in `packages/utils/identity`:
- Blocking keys:
  - exact external ID match
  - exact tax ID match
  - exact domain match + high name similarity
  - exact billing address + high name similarity
- Scoring features:
  - normalized name similarity (Jaro-Winkler or trigram)
  - domain match
  - address match
  - tax ID match
  - external ID overlap
- Decision thresholds:
  - score >= auto_merge_threshold -> auto-merge
  - score >= review_threshold -> queue for review
  - else -> no match

Acceptance:
- Deterministic matches are repeatable across runs.
- Rules are versioned and stored with each `identity_run`.

### 3.4 Identity Resolution Job Pipeline
Implement jobs in `apps/worker`:
- `identity.resolve`:
  - Loads customers in snapshot.
  - Generates candidate pairs using blocking keys.
  - Scores candidates, applies thresholds, writes `identity_candidates`.
  - Creates `customer_identities` and `customer_identity_members` for auto-merges.
  - Creates `identity_tasks` for review candidates.
- `identity.apply_decisions`:
  - Applies manual decisions to create or merge identities.
  - Writes `identity_decisions` and `identity_overrides`.
  - Updates membership rows for the snapshot.
- `identity.carry_forward` (optional):
  - Carries forward prior snapshot identity mapping when no conflicts exist.

Acceptance:
- Identity resolution completes for a snapshot with auto-merge and queue results.
- Manual decisions are applied idempotently.

### 3.5 Canonical Resolved Customer View
- Create a read-only view `resolved_customers`:
  - One row per identity_id
  - Includes primary customer fields and aggregated external IDs
- Add API endpoint:
  - `GET /customers/resolved?snapshot_id=...`

Acceptance:
- API returns resolved customers scoped to a snapshot.

### 3.6 Review and Decision API
Add endpoints:
- `GET /identity/queue?snapshot_id=...`
- `GET /identity/candidates/:id`
- `POST /identity/decisions` (confirm, reject, merge, split)
- `GET /identity/summary?snapshot_id=...`

Requirements:
- Zod validation on requests and responses.
- RBAC for reviewers (Admin or Analyst).
- Audit log entries for decisions.

Acceptance:
- Reviewers can resolve identity tasks and see updates in resolved customers.

### 3.7 Suppression and Overrides
- Allow manual suppression of false matches:
  - `identity_suppressions` prevents auto-merge in future runs.
- Allow manual overrides to force matches:
  - `identity_overrides` with `method=manual`.

Acceptance:
- Suppressed pairs are excluded from candidates.
- Manual overrides are durable and replayable.

### 3.8 Observability
- Emit logs for:
  - total candidates, auto-merges, queued tasks
  - run duration, error counts
- Store run stats in `identity_runs.stats_json`.

Acceptance:
- Identity run metrics are visible and searchable.

### 3.9 Testing
- Unit tests:
  - matching rules and scoring
  - suppression behavior
- Integration tests:
  - run identity pipeline on sample snapshot
  - apply decisions and verify resolved view

Acceptance:
- Tests pass in CI with deterministic results.

### 3.10 Documentation
- Add `docs/identity-resolution.md`:
  - rules and thresholds
  - review workflow
  - snapshot-scoped identity model

Acceptance:
- Documented workflow is clear for engineering and operations.

## Phase 3 Exit Criteria
- Identity resolution runs produce deterministic matches and review queues.
- Manual decisions and suppressions are applied and audited.
- Resolved customer view is available via API.
- Identity run metrics are captured and observable.

## Dependencies and Decisions
- Confirm matching thresholds per tenant or global defaults.
- Decide primary CRM precedence rules for each tenant.
- Confirm the minimum set of blocking keys for candidate generation.

