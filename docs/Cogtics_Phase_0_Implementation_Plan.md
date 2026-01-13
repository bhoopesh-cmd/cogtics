# Cogtics Phase 0 Implementation Plan (Foundations)

This plan aligns to the approved stack and constraints:
Node.js LTS, Fastify, Zod, Postgres, Kysely, BullMQ + Redis, S3 API (MinIO in dev),
pino logging, and worker-side PDF rendering. Zod is used at every boundary. Kysely only.
SQL must be readable and debuggable. Workers are stateless and retry-safe.

## Phase 0 Goals
- Stand up a production-grade monorepo foundation with clear boundaries and shared tooling.
- Provide tenant isolation, RBAC, and audit logging primitives end to end.
- Wire database migrations, job queue, and object storage in dev with MinIO + Postgres + Redis.
- Establish validation, idempotency, and observability patterns used by all later phases.

## Deliverables
- Monorepo with `apps/` and `packages/` matching the defined layout.
- Running Fastify API with request validation, tenant scoping, and audit logging.
- Running BullMQ worker with job validation and idempotent job registration.
- Postgres schema + migrations for core identity, tenancy, audit, jobs, idempotency, and storage metadata.
- Docker Compose for local infra: Postgres, Redis, MinIO, pgAdmin.
- Minimal docs: environment setup, local run instructions, and system architecture notes.

## Phase 0 Work Breakdown

### 0.1 Monorepo and Tooling
- Initialize workspace (`apps/`, `packages/`, `docker/`).
- Choose package manager and workspace config (pnpm or npm workspaces).
- Add base TS config and shared build config.
- Add linting and formatting for TS/JS.
- Define absolute import aliases consistent across apps/packages.

Acceptance:
- `apps/api` and `apps/worker` compile and run.
- `packages/db`, `packages/schemas`, `packages/utils` compile and publish locally.

### 0.2 Local Infrastructure
- Create `docker/docker-compose.yml` with:
  - Postgres (volume, user, password, db)
  - Redis
  - MinIO (S3 compatible) with console
  - pgAdmin
- Provide `.env.example` and `ENVIRONMENT.md`.
- Include a `make dev` or `npm run dev` style wrapper to start infra + apps.

Acceptance:
- One command brings up Postgres, Redis, MinIO, pgAdmin.
- API and worker can connect using env vars.

### 0.3 Configuration and Validation (Zod Everywhere)
- Implement `packages/schemas` for:
  - Env schema per app (api, worker)
  - Common IDs (tenant_id, user_id, request_id, snapshot_id)
  - Job payloads + job results (phase 0 stubs)
- Implement `packages/utils/config`:
  - Zod env parsing with clear error output
  - Typed config exports per app
- In API: validate all request params/body with Zod.
- In worker: validate job payloads and job outputs with Zod.

Acceptance:
- Server fails fast on invalid env.
- API returns 400 with structured Zod errors on invalid payload.
- Worker rejects invalid job payloads.

### 0.4 Database Layer and Migrations
- Decide migration tool:
  - Option A: dbmate (plain SQL migrations)
  - Option B: drizzle-kit (schema generation only, no ORM usage)
- Create `packages/db`:
  - `db.ts` to configure Kysely with pooled connections
  - `types.ts` with DB schema types
  - `migrations/` for SQL files
- Add base schema (minimum Phase 0 tables):
  - `tenants`: id, name, status, created_at
  - `users`: id, email, name, status, created_at
  - `memberships`: id, tenant_id, user_id, role_id, created_at
  - `roles`: id, name
  - `permissions`: id, name
  - `role_permissions`: role_id, permission_id
  - `audit_logs`: id, tenant_id, actor_user_id, action, resource, metadata_json, request_id, created_at
  - `idempotency_keys`: id, tenant_id, scope, key, status, response_json, created_at, expires_at
  - `jobs`: id, tenant_id, type, status, payload_json, result_json, idempotency_key_id, created_at, updated_at
  - `object_objects`: id, tenant_id, bucket, key, content_type, size, checksum, created_at
- Add indexes for tenant_id and common query patterns.
- Enable Row Level Security (RLS) on tenant-scoped tables.
- Add RLS policies that require `app.tenant_id` to match row tenant_id.

Acceptance:
- `migrate up` creates schema in a fresh db.
- RLS prevents cross-tenant access in a test query.
- Kysely types are available to API and worker.

### 0.5 API Skeleton (Fastify)
- Create `apps/api` with Fastify:
  - Base server with pino logging
  - Request ID generation and propagation
  - `health` endpoint
- Core plugins:
  - `config` (validated env)
  - `db` (Kysely)
  - `auth` (dev auth: header-based or local JWT)
  - `tenant` (sets `app.tenant_id` per request)
  - `rbac` (role + permission checks)
  - `audit` (log request + explicit action events)
- Routes (minimal, for phase 0 verification):
  - `GET /health`
  - `GET /me` (returns user + tenant context)
  - `POST /admin/tenants` (create tenant)
  - `POST /admin/users` (create user + membership)
  - `GET /admin/audit-logs` (tenant scoped)

Acceptance:
- API responds with tenant-scoped data.
- RBAC blocks unauthorized access.
- Audit log records create/read actions.

### 0.6 RBAC and Auth Primitives
- Implement `roles` and `permissions` seed:
  - Roles: Admin, CFO, Analyst
  - Permissions: tenant.manage, user.manage, audit.read, jobs.enqueue, exports.read
- Implement role resolution from membership.
- Implement `requirePermission()` middleware.
- Provide dev auth adapter for local testing.

Acceptance:
- Admin can access admin routes; non-admin cannot.
- Permissions are enforced per route.

### 0.7 Audit Logging
- Add `audit.log()` helper with explicit action names.
- Log key operations and include metadata:
  - user_id, tenant_id, action, resource_id, request_id
- Ensure audit writes are append-only.

Acceptance:
- Actions create audit entries with request_id.
- Logs are tenant scoped and readable via API.

### 0.8 Job Queue + Worker
- Create `apps/worker` with BullMQ:
  - Define queue names: `sync`, `detect`, `simulate`, `export`
  - Add worker processors (phase 0 stub handlers)
- Job payload validation with Zod.
- Job registration:
  - Store job metadata in `jobs` table
  - Enforce idempotency via `idempotency_keys`
- Add API endpoint to enqueue a stub job (admin only).

Acceptance:
- Enqueue job through API, worker processes and updates job status.
- Duplicate job with same idempotency key is ignored or returns prior result.

### 0.9 Object Storage (S3 API)
- Add `packages/utils/storage`:
  - S3 client setup
  - `putObject`, `getSignedUrl`, `deleteObject`
  - tenant-prefixed keys: `tenants/{tenant_id}/...`
- Store object metadata in `object_objects`.

Acceptance:
- Upload and download a test object in MinIO.
- Object metadata is stored and tenant scoped.

### 0.10 Observability Baseline
- Configure pino in API and worker with JSON logs.
- Include request_id, tenant_id, user_id in log context.
- Add health endpoints for API and worker.

Acceptance:
- Logs are structured and searchable by request_id.
- Health endpoints return ready status.

### 0.11 Documentation
- Add `docs/phase-0.md` (this plan).
- Add `docs/local-dev.md`:
  - How to run infra
  - How to run api + worker
  - How to seed a tenant/user
- Add `docs/architecture.md`:
  - High-level runtime flow
  - Tenant isolation + RLS approach

Acceptance:
- A new developer can run the stack in under 15 minutes.

## Phase 0 Exit Criteria
- API and worker run locally against Postgres, Redis, MinIO.
- Tenant isolation enforced via RLS and `app.tenant_id` per request.
- RBAC enforced with roles + permissions.
- Audit log writing works and is tenant scoped.
- Job enqueue + processing works with idempotency.
- Storage client works with MinIO and persists metadata.
- All inputs/outputs validated with Zod at boundaries.

## Dependencies and Decisions
- Choose migration tool: dbmate or drizzle-kit (schema only).
- Choose package manager: pnpm or npm workspaces.
- Decide dev auth strategy (header-based or local JWT).

