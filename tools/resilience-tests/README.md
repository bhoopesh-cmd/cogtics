# Resilience Test Scripts

This folder contains manual or semi-automated resilience checks. Use these on a staging or local environment only.

## Prerequisites
- Docker running
- Services started (`pnpm docker:up`, `pnpm dev:api`, `pnpm dev:worker`)

## Scripts

- `worker-restart.ps1`
  - Restarts all worker containers matching `cogtics-worker`.
  - Verify worker health on ports 3011-3013 afterward.

- `service-restart.ps1`
  - Restarts a named container (e.g., postgres, redis, minio).

## Suggested Manual Checks

1) Start a long-running job (CSV/PDF upload or export).
2) Restart a worker mid-job using `worker-restart.ps1`.
3) Confirm job retries and completion with no duplicates.
4) Restart Redis/Postgres with `service-restart.ps1`.
5) Confirm the system recovers and resumes processing.

## Notes
- Use these scripts with caution in shared environments.
- Capture logs and metrics for each run.
