# Cogtics Architecture

This document describes the high-level architecture of the Cogtics backend system.

## Overview

Cogtics is a multi-tenant SaaS application for revenue intelligence. It syncs data from external systems (CRM, billing, contracts), detects discrepancies, runs simulations, and generates audit reports.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React SPA     │────▶│   Fastify API   │────▶│   PostgreSQL    │
│   (Frontend)    │     │   (Backend)     │     │   (Database)    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   Redis/BullMQ  │────▶│   Worker        │
                        │   (Job Queue)   │     │   (Processor)   │
                        └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │   MinIO (S3)    │
                                                │   (Storage)     │
                                                └─────────────────┘
```

## Components

### API Server (apps/api)

The Fastify-based REST API handles all client requests:

- **Authentication**: Dev mode uses header-based auth; production will use JWT
- **Authorization**: Role-based access control (RBAC) with permission checks
- **Tenant Isolation**: Each request is scoped to a tenant via session variables
- **Audit Logging**: All actions are logged for compliance

Request flow:
1. Request arrives with auth headers
2. Auth plugin extracts user context
3. Tenant plugin sets PostgreSQL session variable
4. RBAC plugin loads user permissions
5. Route handler processes request
6. Audit plugin logs the action

### Worker (apps/worker)

BullMQ workers process background jobs:

- **sync**: Fetch data from external systems
- **detect**: Run issue detection rules
- **simulate**: Execute revenue simulations
- **export**: Generate PDF/CSV reports

Jobs are:
- Validated with Zod schemas
- Tracked in the `jobs` table
- Deduplicated via idempotency keys
- Retried on failure (exponential backoff)

### Database (packages/db)

PostgreSQL with Kysely query builder:

- **Migrations**: Plain SQL files managed by dbmate
- **RLS**: Row Level Security for tenant isolation
- **Types**: TypeScript types for all tables

### Schemas (packages/schemas)

Zod schemas for validation at every boundary:

- Environment variables
- API request/response payloads
- Job payloads and results
- Branded ID types for type safety

### Utils (packages/utils)

Shared utilities:

- Configuration loading with Zod validation
- S3 client with tenant-prefixed keys
- Structured logging with Pino

## Tenant Isolation

Multi-tenancy is enforced at multiple levels:

### 1. Application Level

Every authenticated request includes a `tenantId`. The API validates that the user belongs to the tenant before processing.

### 2. Database Level (RLS)

PostgreSQL Row Level Security policies ensure data isolation:

```sql
-- Each request sets the tenant context
SET LOCAL app.tenant_id = 'tenant_123';

-- RLS policy example
CREATE POLICY tenant_isolation ON jobs
  USING (tenant_id = current_setting('app.tenant_id', true));
```

### 3. Storage Level

S3 objects are prefixed with tenant ID:
```
s3://cogtics/tenants/{tenant_id}/exports/report.pdf
```

## RBAC Model

```
Roles                 Permissions
┌─────────┐          ┌──────────────────┐
│  Admin  │─────────▶│ tenant.manage    │
│         │          │ user.manage      │
│         │          │ audit.read       │
│         │          │ jobs.enqueue     │
│         │          │ exports.read     │
│         │          │ contracts.read   │
│         │          │ issues.read      │
│         │          │ simulations.run  │
└─────────┘          └──────────────────┘

┌─────────┐          ┌──────────────────┐
│   CFO   │─────────▶│ audit.read       │
│         │          │ exports.read     │
│         │          │ contracts.read   │
│         │          │ issues.read      │
│         │          │ simulations.run  │
└─────────┘          └──────────────────┘

┌─────────┐          ┌──────────────────┐
│ Analyst │─────────▶│ contracts.read   │
│         │          │ issues.read      │
└─────────┘          └──────────────────┘
```

## Job Processing Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ API receives │────▶│ Create job   │────▶│ Add to queue │
│ enqueue req  │     │ in database  │     │ (BullMQ)     │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                                  ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Return       │◀────│ Update job   │◀────│ Worker picks │
│ job status   │     │ status       │     │ up job       │
└──────────────┘     └──────────────┘     └──────────────┘
```

## Idempotency

Jobs support idempotency keys to prevent duplicate processing:

1. Client sends request with `idempotencyKey`
2. API checks `idempotency_keys` table
3. If key exists and completed, return cached result
4. If key exists and pending, return "in progress"
5. Otherwise, create key and process request

Keys expire after 24 hours.

## Validation Strategy

Zod validates at every system boundary:

1. **Environment**: Config fails fast on missing/invalid vars
2. **API Input**: Request body/params validated before handlers
3. **API Output**: Response schemas for consistency
4. **Job Input**: Payloads validated before processing
5. **Job Output**: Results validated before storage

## Observability

### Logging

Pino produces structured JSON logs with:
- `requestId` for request tracing
- `tenantId` for multi-tenant debugging
- `userId` for user attribution

### Health Checks

- `GET /health` - Basic liveness check
- `GET /health/ready` - Dependency health (DB, Redis)

## Security Considerations

1. **No direct SQL**: All queries through Kysely
2. **RLS enforced**: Even if app bugs exist, DB blocks cross-tenant access
3. **Input validation**: Zod rejects malformed requests
4. **Audit trail**: All mutations logged with actor and request ID
5. **Least privilege**: Workers only access what they need

