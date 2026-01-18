# Cogtics Operational Runbooks

This document provides step-by-step procedures for common operational tasks and incident response.

## Table of Contents

1. [Dead Letter Queue Management](#dead-letter-queue-management)
2. [Job Replay Procedures](#job-replay-procedures)
3. [Data Backfill](#data-backfill)
4. [Incident Response](#incident-response)
5. [Connector Failure Recovery](#connector-failure-recovery)
6. [Database Maintenance](#database-maintenance)

---

## Dead Letter Queue Management

### Viewing DLQ Entries

**Via Admin UI:**
1. Navigate to `/admin/dlq`
2. Filter by status, queue, or job type
3. Click on error message to view stack trace

**Via API:**
```bash
# List failed jobs
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/dlq?status=failed

# Get DLQ statistics
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/dlq/stats
```

### Requeuing Jobs

**Single Job:**
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/dlq/{dlq_id}/requeue
```

**Bulk Requeue:**
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"queue_name": "sync", "limit": 50}' \
  http://localhost:3000/admin/dlq/requeue-batch
```

### Discarding Jobs

Only discard jobs that are:
- Known to be unrecoverable
- From deprecated job types
- Test/development artifacts

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/dlq/{dlq_id}
```

---

## Job Replay Procedures

### Replay a Snapshot

Use when snapshot data needs reprocessing:

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"force": true}' \
  http://localhost:3000/admin/replay/snapshot/{snapshot_id}
```

**Caution:** This reprocesses all ingestion steps. May take significant time.

### Replay Detection Run

Use when detection rules have been updated:

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/replay/detection/{detection_run_id}
```

### Regenerate Evidence

Use when evidence templates have changed:

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/replay/evidence/{snapshot_id}
```

### Monitoring Replay Progress

1. Check replay audit log:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/replay
```

2. Monitor job status in Jobs page (`/settings/jobs`)

---

## Data Backfill

### Historical Data Backfill

Use to import historical data for a date range:

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-12-31T23:59:59Z",
    "entity_types": ["contracts", "invoices"]
  }' \
  http://localhost:3000/admin/replay/backfill/historical
```

### Best Practices

1. Start with small date ranges to validate
2. Monitor queue depths during backfill
3. Run during off-peak hours
4. Verify record counts after completion

---

## Incident Response

### High Error Rate Alert

**Symptoms:** API error rate > 5%

**Steps:**
1. Check `/health/detailed` for degraded services
2. Check Grafana API dashboard for affected endpoints
3. Search Loki for error logs: `{service_name="cogtics-api"} |= "error"`
4. Check database/Redis connectivity
5. Review recent deployments

### Queue Backlog Alert

**Symptoms:** Queue depth > 1000 for extended period

**Steps:**
1. Check worker health: `docker compose ps worker`
2. Check worker logs: `docker compose logs worker --tail=100`
3. Verify Redis connectivity
4. Check for stuck jobs (long processing time)
5. Scale workers if needed

### Job Failure Spike

**Symptoms:** Job failure rate > 10%

**Steps:**
1. Check DLQ for common error patterns
2. Identify affected job types from metrics
3. Review recent code changes
4. Check external service dependencies (Stripe, etc.)
5. Temporarily pause affected queues if needed

### Database Connection Issues

**Symptoms:** Database health check failing

**Steps:**
1. Check PostgreSQL status: `docker compose ps postgres`
2. Check connection count: `SELECT count(*) FROM pg_stat_activity;`
3. Review connection pool settings
4. Check for long-running queries
5. Restart database connection pool

---

## Connector Failure Recovery

### Stripe Sync Failure

**Steps:**
1. Check Stripe API status: https://status.stripe.com
2. Verify API key is valid
3. Check rate limiting in logs
4. Retry sync job from DLQ

### OAuth Token Expiry

**Symptoms:** 401 errors from connectors

**Steps:**
1. Check connection status in Connections page
2. Re-authenticate if token expired
3. Verify refresh token flow

### Webhook Delivery Failure

**Steps:**
1. Check webhook endpoint accessibility
2. Verify webhook signature validation
3. Review webhook queue depth
4. Replay missed webhooks if needed

---

## Database Maintenance

### Running Migrations

```bash
# Check pending migrations
docker compose -f docker/docker-compose.yml exec -T postgres psql -U cogtics -d cogtics \
  -c "SELECT * FROM schema_migrations ORDER BY version;"

# Run migration
cat packages/db/migrations/XXX_migration.up.sql | \
  docker compose -f docker/docker-compose.yml exec -T postgres psql -U cogtics -d cogtics
```

### Integrity Checks

Run data integrity checks:

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"check_types": ["record_count", "referential_integrity"]}' \
  http://localhost:3000/admin/integrity/run
```

### Vacuum and Analyze

For large tables after bulk operations:

```sql
VACUUM ANALYZE customers;
VACUUM ANALYZE contracts;
VACUUM ANALYZE invoices;
```

---

## Contact Escalation

| Issue Type | First Contact | Escalation |
|------------|--------------|------------|
| API Issues | On-call Engineer | Platform Lead |
| Data Issues | Data Engineer | Data Lead |
| Security | Security Team | CISO |
| Infrastructure | DevOps | Infrastructure Lead |
