# API Endpoint Test Inventory

This file tracks API endpoints and required test coverage. Update as routes evolve.

## Conventions
- Tenant headers (dev): `x-tenant-id`, `x-user-id`
- Auth headers (prod): `Authorization: Bearer <token>`

## Endpoint Matrix

| Area | Base Path | Example Endpoints | Auth | Tenant Header | Snapshot ID | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Health | `/health` | `GET /health` | No | No | No | e2e/auth.spec.ts | Basic liveness |
| Auth | `/auth` | `POST /auth/login` | No | No | No | TODO | Verify flows in dev and prod |
| Me | `/me` | `GET /me` | Yes | Yes | No | TODO | Current user info |
| Admin | `/admin` | `GET /admin/*` | Yes | Yes | No | TODO | RBAC enforced |
| Connections | `/connections` | `GET /connections` | Yes | Yes | No | TODO | Connector lifecycle |
| Webhooks | `/webhooks` | `POST /webhooks/*` | Yes | Yes | No | TODO | Signature verification |
| Snapshots | `/snapshots` | `POST /snapshots` | Yes | Yes | No | apps/api/tests/integration/snapshots.test.ts | Trigger + list |
| Data | `/data` | `GET /data/customers` | Yes | Yes | Optional | TODO | Canonical data access |
| Ingestion | `/ingestion` | `POST /ingestion/run` | Yes | Yes | Yes | TODO | Job orchestration |
| Identity | `/identity` | `POST /identity/resolve` | Yes | Yes | Yes | apps/api/tests/integration/identity.test.ts | Cross-tenant isolation |
| Uploads | `/uploads` | `POST /uploads/csv/start` | Yes | Yes | Yes | apps/api/tests/integration/uploads.test.ts | CSV/PDF upload pipeline |
| Contracts | `/contracts` | `GET /contracts` | Yes | Yes | Yes | e2e/tests/contracts.spec.ts | Contract intelligence |
| RevRec | `/revrec` | `POST /revrec/compute` | Yes | Yes | Yes | apps/api/tests/integration/revrec.test.ts | RevRec pipeline |
| Issues | `/issues` | `GET /issues` | Yes | Yes | Yes | e2e/tests/detection-workflow.spec.ts | Detection results |
| Simulations | `/simulations` | `POST /simulations` | Yes | Yes | Yes | e2e/tests/simulations.spec.ts | Simulation workflows |
| Exports | `/exports` | `POST /exports` | Yes | Yes | Yes | e2e/tests/exports.spec.ts | Export lifecycle |
| Digests | `/digests` | `POST /digests` | Yes | Yes | Optional | TODO | Digest subscriptions |
| Metrics | `/metrics` | `GET /metrics` | No | No | No | apps/api/tests/integration/observability.test.ts | Prometheus scrape |

## Coverage Notes
- Update this matrix when new routes are added or renamed.
- For each base path, add a minimal smoke test plus at least one negative test.
