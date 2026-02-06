# Worker Scaling Implementation Plan

**Created:** 2026-01-31
**Purpose:** Detailed implementation plan to resolve worker concurrency bottleneck identified in Phase 2 stress testing

---

## Executive Summary

This plan outlines three phases to scale the Cogtics worker infrastructure from supporting 10 concurrent users to 100+ users:

1. **Immediate (30 min):** Increase `WORKER_CONCURRENCY` 5→15 (3x capacity)
2. **This Week (8-16 hrs):** Add queue backpressure + monitoring + retest
3. **2-4 Weeks (40-80 hrs):** Horizontal scaling with 3+ worker instances

---

# Phase 1: Increase WORKER_CONCURRENCY (Immediate)

**Effort:** 30 minutes
**Impact:** 3x capacity increase (10→30 concurrent users)
**Risk:** Low (database has 98% headroom)

## Architecture Understanding

### Current Configuration

**Files Involved:**
- `Tech/.env` (line 27) - Current setting: `WORKER_CONCURRENCY=5`
- `Tech/packages/schemas/src/env.ts` (lines 54-55) - Validation schema
- `Tech/packages/utils/src/config.ts` - Config loader
- `Tech/apps/worker/src/worker.ts` (line 402) - Worker initialization

**How It Works:**
```typescript
// env.ts - Validation allows 1-100
WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(5)

// worker.ts - Each of 24 queues uses this setting
const worker = new Worker(
  queueName,
  jobHandler,
  {
    connection: redis,
    concurrency: config.WORKER_CONCURRENCY,  // Currently 5
    settings: { /* ... */ }
  }
);
```

**Current State:**
- 24 separate queue workers (upload, contracts, detection, exports, etc.)
- Each queue processes max 5 jobs concurrently
- Total theoretical max: 24 queues × 5 = 120 concurrent jobs (across all job types)
- Stress test focused on `upload.pdf.parse` queue specifically

### Capacity Analysis

**Current Capacity:**
```
WORKER_CONCURRENCY = 5
Processing time per PDF = ~15 seconds
Jobs/minute per slot = 60s / 15s = 4
Total throughput = 5 slots × 4 = 20 jobs/minute
```

**Proposed Capacity:**
```
WORKER_CONCURRENCY = 15
Processing time per PDF = ~15 seconds
Jobs/minute per slot = 60s / 15s = 4
Total throughput = 15 slots × 4 = 60 jobs/minute (3x increase)
```

**Expected Performance:**
- 5 users: 100% success (unchanged)
- 10 users: 100% success (unchanged)
- 25 users: **~90-95% success** (up from 4.8%)
- 30 users: **~85-90% success** (new breaking point)

## Implementation Steps

### Step 1: Update Environment Configuration (5 min)

**File:** `Tech/.env`

**Change:**
```diff
- WORKER_CONCURRENCY=5
+ WORKER_CONCURRENCY=15
```

**Validation:**
- Value must be between 1-100 (enforced by Zod schema)
- Recommended: Start with 15, can increase to 20 if needed

### Step 2: Restart Worker Process (2 min)

**If running locally:**
```bash
# Stop current worker
# Ctrl+C or kill process

# Restart worker
pnpm dev:worker
```

**If running in Docker:**
```bash
# Restart worker container (when created in Phase 3)
docker-compose restart worker
```

**If using PM2 or systemd:**
```bash
pm2 restart worker
# or
systemctl restart cogtics-worker
```

### Step 3: Verify Configuration (5 min)

**Check worker logs for concurrency setting:**
```bash
# Look for log on startup
grep "WORKER_CONCURRENCY" worker.log

# Expected output:
# [INFO] Worker config loaded: { WORKER_CONCURRENCY: 15, ... }
```

**Check database for expected behavior:**
```sql
-- Monitor jobs table
SELECT
  type,
  status,
  COUNT(*) as count
FROM jobs
WHERE status IN ('pending', 'processing')
GROUP BY type, status
ORDER BY count DESC;

-- Should see up to 15 jobs in 'processing' status per queue
```

**Check Redis queue depth:**
```bash
# Using redis-cli
redis-cli
> LLEN bull:upload.pdf.parse:wait
> LLEN bull:upload.pdf.parse:active

# Or use API endpoint
curl http://localhost:3000/health/detailed
```

### Step 4: Monitor System Resources (10 min)

**PostgreSQL Connections:**
```sql
-- Check connection usage
SELECT
  COUNT(*) as active_connections,
  (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
FROM pg_stat_activity
WHERE state = 'active';

-- Expected: Still <10% utilization with WORKER_CONCURRENCY=15
```

**Worker Memory:**
```bash
# Monitor worker process memory
ps aux | grep worker
# or
docker stats cogtics-worker

# Expected: ~200-500 MB (3x increase from ~100-150 MB)
```

**Redis Memory:**
```bash
redis-cli info memory | grep used_memory_human

# Expected: Minimal increase (queue data is small)
```

### Step 5: Functional Test (5 min)

**Quick smoke test:**
```bash
# Upload a single PDF via API
curl -X POST http://localhost:3000/uploads/pdf/start \
  -H "x-tenant-id: tenant_01" \
  -H "x-user-id: user_01" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pdf",
    "fileName": "test.pdf",
    "contentType": "application/pdf",
    "entityType": "contract",
    "displayName": "Test Upload"
  }'

# Complete the upload and verify processing
# (Upload to S3 presigned URL, then call /complete endpoint)
```

**Expected result:**
- Upload succeeds
- Job processes within 10-20 seconds
- No errors in worker logs

### Step 6: Retest Heavy Scenario (Optional - 15 min)

**Run Phase 2 heavy test again:**
```bash
cd Tech/tools/stress-test
npm run concurrent:heavy
```

**Expected results:**
- Success rate: >90% (up from 4.8%)
- p95 response time: <45s (down from 57s)
- Queue depth: Peaks at 25-30 (down from 75)

## Rollback Plan

If issues occur, rollback is immediate:

**Step 1: Revert .env**
```diff
- WORKER_CONCURRENCY=15
+ WORKER_CONCURRENCY=5
```

**Step 2: Restart worker**
```bash
pnpm dev:worker
# or docker-compose restart worker
```

**Recovery time:** <2 minutes

## Success Criteria

- [x] Worker starts successfully with `WORKER_CONCURRENCY=15`
- [x] No increase in error rates on existing traffic
- [x] Database connections remain <20% utilized
- [x] Worker memory increases proportionally (~3x)
- [x] Single upload test succeeds
- [ ] Heavy test shows >90% success rate (optional validation)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Out of memory | Low | Medium | Monitor memory, reduce concurrency if needed |
| Database connection exhaustion | Very Low | High | DB has 98% headroom, would need 50x increase |
| Redis connection limits | Very Low | Medium | Redis handles thousands of connections |
| Increased CPU usage | Medium | Low | Expected and acceptable for 3x throughput |
| Longer queue drain time on shutdown | Low | Low | Graceful shutdown already implemented |

## Monitoring Checklist

**After deployment, monitor for 24-48 hours:**

- [ ] Worker process uptime (no crashes)
- [ ] Memory usage (stable at ~300-500 MB)
- [ ] Database connection count (<10% utilization)
- [ ] Redis memory usage (minimal increase)
- [ ] Job success rate (maintain >95%)
- [ ] Job processing time (maintain <20s p95)
- [ ] Error logs (no new error patterns)

---

# Phase 2: Queue Backpressure + Monitoring (This Week)

**Effort:** 8-16 hours
**Impact:** Prevents cascade failures, better visibility
**Dependencies:** Phase 1 completed

## Architecture Design

### Current State

**Upload Flow:**
1. Client calls `POST /uploads/pdf/start` → Creates upload record, returns presigned URL
2. Client uploads PDF to S3
3. Client calls `POST /uploads/pdf/complete` → **Always enqueues job**, no queue depth check
4. Worker processes job from queue

**Problem:**
- API accepts unlimited uploads even when worker queue is saturated
- No visibility into queue depth for clients
- Jobs timeout in queue, wasting resources and degrading UX

### Proposed Architecture

**Enhanced Upload Flow with Backpressure:**

1. Client calls `POST /uploads/pdf/start` → Same (no change)
2. Client uploads PDF to S3 → Same (no change)
3. Client calls `POST /uploads/pdf/complete`:
   - **NEW:** Check queue depth from `jobs` table
   - **NEW:** If queue depth > threshold, return HTTP 429 with `Retry-After` header
   - **NEW:** If depth < threshold, enqueue job as normal
4. Worker processes job from queue → Same (no change)

**Enhanced Monitoring:**
- Expose queue metrics in `/health/detailed` (already exists, enhance it)
- Add Prometheus metrics for queue depth
- Add alerting thresholds

## Implementation Tasks

### Task 2.1: Add Queue Depth Utility Function (2 hrs)

**File:** Create `Tech/apps/api/src/lib/queue-depth.ts`

```typescript
import type { FastifyInstance } from 'fastify';

/**
 * Queue depth configuration
 */
export const QUEUE_DEPTH_LIMITS = {
  'upload.pdf.parse': 75,      // Max 75 pending PDF uploads
  'upload.csv.parse': 50,      // Max 50 pending CSV uploads
  'contracts.pdf.extract': 100, // Max 100 pending extractions
  'detect.run': 150,           // Max 150 pending detection runs
  // ... configure for each queue type
} as const;

export type QueueName = keyof typeof QUEUE_DEPTH_LIMITS;

/**
 * Get current depth for a specific queue
 */
export async function getQueueDepth(
  fastify: FastifyInstance,
  queueType: string
): Promise<number> {
  const result = await fastify.db
    .selectFrom('jobs')
    .select((eb) => eb.fn.count<number>('id').as('count'))
    .where('type', '=', queueType)
    .where('status', 'in', ['pending', 'processing'])
    .executeTakeFirst();

  return result?.count ?? 0;
}

/**
 * Check if queue is accepting new jobs
 */
export async function canEnqueueJob(
  fastify: FastifyInstance,
  queueType: string
): Promise<{ canEnqueue: boolean; currentDepth: number; limit: number; retryAfterSeconds?: number }> {
  const currentDepth = await getQueueDepth(fastify, queueType);
  const limit = QUEUE_DEPTH_LIMITS[queueType as QueueName] ?? 100; // Default limit

  const canEnqueue = currentDepth < limit;

  // Calculate retry-after based on current depth and processing rate
  // Assume ~4 jobs/min throughput per worker slot
  const retryAfterSeconds = canEnqueue
    ? undefined
    : Math.ceil((currentDepth - limit) / (4 * 15)); // 15 = WORKER_CONCURRENCY

  return {
    canEnqueue,
    currentDepth,
    limit,
    retryAfterSeconds,
  };
}

/**
 * Get all queue depths (for monitoring)
 */
export async function getAllQueueDepths(
  fastify: FastifyInstance
): Promise<Record<string, number>> {
  const results = await fastify.db
    .selectFrom('jobs')
    .select(['type'])
    .select((eb) => eb.fn.count<number>('id').as('count'))
    .where('status', 'in', ['pending', 'processing'])
    .groupBy('type')
    .execute();

  return Object.fromEntries(
    results.map((r) => [r.type, r.count])
  );
}
```

**Tests:** Create `Tech/apps/api/src/lib/queue-depth.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { getQueueDepth, canEnqueueJob, QUEUE_DEPTH_LIMITS } from './queue-depth';
// Mock fastify instance with database
// ... test cases
```

### Task 2.2: Add Backpressure to Upload Endpoints (3 hrs)

**File:** `Tech/apps/api/src/routes/uploads/index.ts`

**Modify `/uploads/pdf/complete` endpoint (lines 249-328):**

```typescript
// Before change (simplified):
fastify.post<{ Body: CompleteUploadRequestSchema }>(
  '/pdf/complete',
  async (request, reply) => {
    const { uploadId, autoProcess } = request.body;

    // ... validation and DB operations ...

    // OLD: Always enqueue
    await fastify.jobQueue.add('upload.pdf.parse', {
      tenantId: request.tenant.id,
      payload: { uploadId, fileId, parseRunId }
    });

    return reply.code(200).send({ uploadId, parseRunId });
  }
);

// After change:
import { canEnqueueJob } from '../../lib/queue-depth.js';

fastify.post<{ Body: CompleteUploadRequestSchema }>(
  '/pdf/complete',
  async (request, reply) => {
    const { uploadId, autoProcess } = request.body;

    // ... validation and DB operations ...

    // NEW: Check queue depth before enqueuing
    const queueCheck = await canEnqueueJob(fastify, 'upload.pdf.parse');

    if (!queueCheck.canEnqueue) {
      return reply.code(429).send({
        error: 'Too Many Requests',
        message: `Upload queue is currently at capacity (${queueCheck.currentDepth}/${queueCheck.limit} jobs). Please try again later.`,
        retryAfter: queueCheck.retryAfterSeconds,
        queueDepth: queueCheck.currentDepth,
        queueLimit: queueCheck.limit,
      });
    }

    // Enqueue job as normal
    await fastify.jobQueue.add('upload.pdf.parse', {
      tenantId: request.tenant.id,
      payload: { uploadId, fileId, parseRunId }
    });

    return reply.code(200).send({
      uploadId,
      parseRunId,
      queueDepth: queueCheck.currentDepth // Optional: inform client of current queue
    });
  }
);
```

**Apply same pattern to:**
- `/uploads/csv/complete` (lines 86-182)
- `/admin/jobs/enqueue` (lines 10-104 in `routes/admin/jobs.ts`)

**Response Schema Updates:**

**File:** `Tech/packages/schemas/src/api/uploads.ts`

```typescript
// Add new error response schema
export const UploadQueueFullErrorSchema = z.object({
  error: z.literal('Too Many Requests'),
  message: z.string(),
  retryAfter: z.number().optional(),
  queueDepth: z.number(),
  queueLimit: z.number(),
});

export type UploadQueueFullError = z.infer<typeof UploadQueueFullErrorSchema>;
```

### Task 2.3: Enhanced Monitoring Endpoint (2 hrs)

**File:** `Tech/apps/api/src/routes/health.ts`

**Enhance `/health/detailed` endpoint (lines 73-150):**

```typescript
// Add to existing endpoint response
import { getAllQueueDepths, QUEUE_DEPTH_LIMITS } from '../lib/queue-depth.js';

fastify.get('/detailed', async (request, reply) => {
  // ... existing checks (database, redis, storage) ...

  // Enhanced queue monitoring
  const queueDepths = await getAllQueueDepths(fastify);

  const queueStatus = Object.entries(queueDepths).map(([type, depth]) => {
    const limit = QUEUE_DEPTH_LIMITS[type as QueueName] ?? 100;
    const utilizationPercent = (depth / limit) * 100;

    return {
      type,
      depth,
      limit,
      utilizationPercent,
      status: utilizationPercent > 90 ? 'critical' :
              utilizationPercent > 75 ? 'warning' :
              'healthy',
    };
  });

  return reply.code(200).send({
    status: 'ready',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: { /* ... */ },
      redis: { /* ... */ },
      storage: { /* ... */ },
    },
    queues: {
      depths: queueDepths,
      status: queueStatus,
      overallStatus: queueStatus.some(q => q.status === 'critical') ? 'critical' :
                     queueStatus.some(q => q.status === 'warning') ? 'warning' :
                     'healthy',
    },
    deadLetterQueue: { /* ... */ },
  });
});
```

### Task 2.4: Prometheus Metrics (2 hrs)

**File:** Create `Tech/apps/api/src/lib/metrics.ts`

```typescript
import { register, Counter, Gauge } from 'prom-client';

// Queue depth gauge (current depth per queue)
export const queueDepthGauge = new Gauge({
  name: 'cogtics_queue_depth',
  help: 'Current depth of job queue by type',
  labelNames: ['queue_type'],
  registers: [register],
});

// Queue enqueue counter (jobs added)
export const queueEnqueueCounter = new Counter({
  name: 'cogtics_queue_enqueue_total',
  help: 'Total jobs enqueued by queue type',
  labelNames: ['queue_type'],
  registers: [register],
});

// Queue rejection counter (backpressure activations)
export const queueRejectionCounter = new Counter({
  name: 'cogtics_queue_rejection_total',
  help: 'Total job rejections due to queue depth limit',
  labelNames: ['queue_type'],
  registers: [register],
});

// Update metrics function (call periodically)
export async function updateQueueMetrics(fastify: FastifyInstance) {
  const depths = await getAllQueueDepths(fastify);

  for (const [type, depth] of Object.entries(depths)) {
    queueDepthGauge.set({ queue_type: type }, depth);
  }
}
```

**File:** `Tech/apps/api/src/routes/health.ts`

**Update `/metrics` endpoint:**

```typescript
import { register } from 'prom-client';
import { updateQueueMetrics } from '../lib/metrics.js';

fastify.get('/metrics', async (request, reply) => {
  if (!config.OTEL_ENABLED) {
    return reply.code(404).send({ error: 'Metrics not enabled' });
  }

  // Update queue metrics before exporting
  await updateQueueMetrics(fastify);

  const metrics = await register.metrics();
  return reply.type('text/plain; version=0.0.4').send(metrics);
});
```

**Instrument backpressure in upload endpoints:**

```typescript
import { queueEnqueueCounter, queueRejectionCounter } from '../../lib/metrics.js';

// In /uploads/pdf/complete:
if (!queueCheck.canEnqueue) {
  queueRejectionCounter.inc({ queue_type: 'upload.pdf.parse' });
  return reply.code(429).send({ /* ... */ });
}

queueEnqueueCounter.inc({ queue_type: 'upload.pdf.parse' });
await fastify.jobQueue.add('upload.pdf.parse', { /* ... */ });
```

### Task 2.5: Update API Documentation (1 hr)

**File:** `Tech/apps/api/README.md` or OpenAPI spec

Add documentation for:
- HTTP 429 response for upload endpoints
- `Retry-After` header usage
- Queue depth limits
- Enhanced `/health/detailed` response schema

### Task 2.6: Frontend/Client Updates (2 hrs)

**If using a frontend client:**

**File:** `Tech/apps/web/src/lib/api-client.ts` (or equivalent)

```typescript
// Add retry logic for 429 responses
async function uploadWithRetry(file: File, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await uploadFile(file);

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitSeconds = retryAfter ? parseInt(retryAfter) : 30;

      console.log(`Queue full, retrying in ${waitSeconds}s (attempt ${attempt}/${maxRetries})`);
      await sleep(waitSeconds * 1000);
      continue;
    }

    return response;
  }

  throw new Error('Upload failed: Queue full after retries');
}
```

### Task 2.7: Alerting Configuration (1 hr)

**File:** `Tech/docker/prometheus/alerts.yml` (create if doesn't exist)

```yaml
groups:
  - name: queue_alerts
    interval: 30s
    rules:
      - alert: QueueDepthCritical
        expr: cogtics_queue_depth > 75
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Queue {{ $labels.queue_type }} depth critical"
          description: "Queue depth is {{ $value }} (threshold: 75)"

      - alert: QueueDepthWarning
        expr: cogtics_queue_depth > 50
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Queue {{ $labels.queue_type }} depth elevated"
          description: "Queue depth is {{ $value }} (threshold: 50)"

      - alert: HighQueueRejectionRate
        expr: rate(cogtics_queue_rejection_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High queue rejection rate for {{ $labels.queue_type }}"
          description: "Rejection rate is {{ $value }} per second"
```

### Task 2.8: Integration Tests (2 hrs)

**File:** Create `Tech/apps/api/src/routes/uploads/backpressure.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';

describe('Upload Backpressure', () => {
  it('should accept upload when queue is below limit', async () => {
    // Setup: Queue depth = 10, limit = 75
    const response = await app.inject({
      method: 'POST',
      url: '/uploads/pdf/complete',
      headers: { 'x-tenant-id': 'tenant_01', 'x-user-id': 'user_01' },
      payload: { uploadId: 'test-upload', autoProcess: true },
    });

    expect(response.statusCode).toBe(200);
  });

  it('should reject upload with 429 when queue is at limit', async () => {
    // Setup: Queue depth = 75, limit = 75
    // ... fill queue with 75 jobs ...

    const response = await app.inject({
      method: 'POST',
      url: '/uploads/pdf/complete',
      headers: { 'x-tenant-id': 'tenant_01', 'x-user-id': 'user_01' },
      payload: { uploadId: 'test-upload', autoProcess: true },
    });

    expect(response.statusCode).toBe(429);
    expect(response.json()).toMatchObject({
      error: 'Too Many Requests',
      queueDepth: 75,
      queueLimit: 75,
      retryAfter: expect.any(Number),
    });
  });

  it('should include Retry-After header in 429 response', async () => {
    // ... fill queue ...

    const response = await app.inject({ /* ... */ });

    expect(response.headers['retry-after']).toBeDefined();
    expect(parseInt(response.headers['retry-after'])).toBeGreaterThan(0);
  });
});
```

### Task 2.9: Load Test with Backpressure (2 hrs)

**Create new stress test:** `Tech/tools/stress-test/scripts/backpressure-test.ts`

```typescript
/**
 * Test that verifies backpressure prevents queue saturation
 *
 * Scenario:
 * - Submit 100 PDFs rapidly (faster than worker can process)
 * - Expect some 429 responses when queue fills
 * - Verify no timeouts occur
 * - Verify all uploads eventually succeed (with retries)
 */

import { ApiClient } from '../lib/api-client.js';

async function testBackpressure() {
  const client = new ApiClient({
    baseUrl: 'http://localhost:3000',
    userId: 'stress_user_01',
    tenantId: 'tenant_01',
  });

  let accepted = 0;
  let rejected = 0;
  let retried = 0;

  for (let i = 0; i < 100; i++) {
    try {
      await client.startUpload(`test-${i}.pdf`);
      // ... upload to S3 ...

      // Complete upload (may get 429)
      const result = await client.completeUploadWithRetry(uploadId, { maxRetries: 5 });
      accepted++;
      if (result.retries > 0) retried++;

    } catch (error) {
      if (error.status === 429) {
        rejected++;
      }
    }
  }

  console.log({
    accepted,
    rejected,
    retried,
    successRate: (accepted / 100) * 100,
  });
}
```

**Expected results:**
- Some uploads initially rejected (429)
- All uploads eventually succeed with retries
- No timeout errors
- Queue depth never exceeds limit

## Deployment Steps

### Development Environment

1. **Apply code changes** (Tasks 2.1-2.4)
2. **Run tests** (`pnpm test`)
3. **Start services:**
   ```bash
   pnpm dev:api
   pnpm dev:worker
   ```
4. **Verify backpressure:**
   ```bash
   # Check health endpoint shows queue limits
   curl http://localhost:3000/health/detailed | jq .queues

   # Run backpressure test
   cd tools/stress-test
   npm run backpressure:test
   ```

### Production Deployment

1. **Database migration** (if any schema changes needed)
2. **Deploy API** with new backpressure logic
3. **Monitor for 24 hours:**
   - Watch for 429 responses in metrics
   - Verify queue depths stay below limits
   - Check client retry behavior
4. **Tune limits** if needed based on real traffic patterns

## Monitoring & Validation

**Success Metrics:**
- [ ] Queue depth never exceeds configured limits
- [ ] 429 responses include valid `Retry-After` headers
- [ ] Client retries succeed within 3 attempts
- [ ] No job timeout errors when backpressure is active
- [ ] Prometheus metrics show queue depth trends
- [ ] Alerts fire when queue depth exceeds thresholds

**Dashboards to Create:**

**Grafana Dashboard: Queue Health**
- Panel 1: Queue depth over time (per queue type)
- Panel 2: Enqueue vs rejection rate
- Panel 3: Backpressure activation frequency
- Panel 4: Job processing latency (p50, p95, p99)

## Success Criteria

- [x] Queue depth check implemented in upload endpoints
- [x] HTTP 429 returned when queue exceeds limit
- [x] `Retry-After` header calculated correctly
- [x] Enhanced `/health/detailed` shows queue status
- [x] Prometheus metrics exported for queue depth
- [x] Alerts configured for queue saturation
- [x] Integration tests pass
- [x] Load test validates backpressure works
- [ ] Production monitoring confirms no queue saturation

---

# Phase 3: Horizontal Worker Scaling (2-4 Weeks)

**Effort:** 40-80 hours
**Impact:** 5-10x capacity (100+ concurrent users)
**Dependencies:** Phases 1 & 2 completed

## Architecture Design

### Current Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP
       v
┌──────────────────┐
│   API Server     │
│  (Fastify)       │
└──────┬───────────┘
       │ Enqueue job
       v
┌──────────────────┐      ┌──────────────────┐
│     Redis        │◄─────┤  Worker Process  │
│  (BullMQ Queue)  │      │  (24 queues)     │
└──────┬───────────┘      │  Concurrency=15  │
       │                  └──────────────────┘
       │ Store job
       v
┌──────────────────┐
│   PostgreSQL     │
│  (jobs table)    │
└──────────────────┘
```

**Limitation:** Single worker process, single point of failure

### Proposed Architecture (Multi-Worker)

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP
       v
┌──────────────────┐
│   API Server     │
│  (Fastify)       │
└──────┬───────────┘
       │ Enqueue job
       v
┌──────────────────────────────────────────┐
│             Redis (BullMQ Queue)         │
│          (Automatic Load Balancing)      │
└──┬───────────┬───────────┬──────────┬────┘
   │           │           │          │
   v           v           v          v
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│Worker 1 │ │Worker 2 │ │Worker 3 │ │Worker N │
│Conc=15  │ │Conc=15  │ │Conc=15  │ │Conc=15  │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
   │           │           │          │
   │ Store job results & update status│
   v           v           v          v
┌──────────────────────────────────────────┐
│         PostgreSQL (jobs table)          │
└──────────────────────────────────────────┘
```

**Benefits:**
- **Horizontal scaling:** Add workers as load increases
- **High availability:** Failure of one worker doesn't stop processing
- **Load balancing:** BullMQ automatically distributes jobs
- **Resource isolation:** CPU/memory usage spread across multiple processes/containers

### Capacity Calculation

**Single Worker (Current after Phase 1):**
```
Workers: 1
Concurrency per worker: 15
Total throughput: 15 slots × 4 jobs/min = 60 jobs/min
Max concurrent users: ~30
```

**Three Workers (Phase 3 Target):**
```
Workers: 3
Concurrency per worker: 15
Total throughput: 3 × 15 × 4 = 180 jobs/min
Max concurrent users: ~90
```

**Five Workers (Future Scale):**
```
Workers: 5
Concurrency per worker: 15
Total throughput: 5 × 15 × 4 = 300 jobs/min
Max concurrent users: ~150
```

## Implementation Tasks

### Task 3.1: Dockerize Worker (8 hrs)

**File:** Create `Tech/apps/worker/Dockerfile`

```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages packages/
COPY apps/worker apps/worker/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build worker and shared packages
RUN pnpm --filter @cogtics/worker... build

# Stage 2: Runner
FROM node:20-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/worker ./apps/worker
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/package.json ./package.json

# Set working directory to worker
WORKDIR /app/apps/worker

# Environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Expose health check port
EXPOSE 3001

# Start worker
CMD ["pnpm", "start"]
```

**File:** Create `Tech/apps/worker/.dockerignore`

```
node_modules
dist
*.log
.env
.env.*
```

**File:** Update `Tech/apps/worker/package.json`

```json
{
  "scripts": {
    "dev": "tsx watch src/bootstrap.ts",
    "build": "tsc",
    "start": "node dist/bootstrap.js",
    "test": "vitest"
  }
}
```

### Task 3.2: Add Worker Health Endpoint (4 hrs)

Workers need their own health endpoint for container orchestration.

**File:** Create `Tech/apps/worker/src/health-server.ts`

```typescript
import http from 'node:http';
import { loadWorkerConfig } from '@cogtics/utils/config';

/**
 * Simple HTTP server for health checks
 * Runs on port 3001 (separate from API on 3000)
 */
export function startHealthServer() {
  const config = loadWorkerConfig();
  const port = config.WORKER_HEALTH_PORT ?? 3001;

  const server = http.createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      // Basic liveness check
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        workerConcurrency: config.WORKER_CONCURRENCY,
        pid: process.pid,
      }));
    } else if (req.url === '/ready' && req.method === 'GET') {
      // Readiness check (can add DB/Redis checks here)
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ready',
        timestamp: new Date().toISOString(),
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(port, () => {
    console.log(`[Worker Health] Listening on port ${port}`);
  });

  return server;
}
```

**File:** Update `Tech/apps/worker/src/bootstrap.ts`

```typescript
import { startHealthServer } from './health-server.js';
import './worker.js'; // Existing worker initialization

// Start health server for Docker health checks
startHealthServer();
```

**File:** Update `Tech/packages/schemas/src/env.ts`

```typescript
// Add new environment variable
WORKER_HEALTH_PORT: z.coerce.number().int().min(1024).max(65535).default(3001),
```

### Task 3.3: Update Docker Compose (4 hrs)

**File:** `Tech/docker/docker-compose.yml`

```yaml
version: '3.8'

services:
  # ... existing services (postgres, redis, minio, etc.) ...

  # Worker service (scalable)
  worker:
    build:
      context: ..
      dockerfile: apps/worker/Dockerfile
    container_name: cogtics-worker-1
    restart: unless-stopped
    depends_on:
      - postgres
      - redis
      - minio
    environment:
      # Database
      DATABASE_URL: postgresql://cogtics:cogtics@postgres:5432/cogtics

      # Redis
      REDIS_HOST: redis
      REDIS_PORT: 6379

      # Storage
      S3_ENDPOINT: http://minio:9000
      S3_ACCESS_KEY_ID: minioadmin
      S3_SECRET_ACCESS_KEY: minioadmin
      S3_BUCKET_NAME: cogtics
      S3_REGION: us-east-1
      S3_FORCE_PATH_STYLE: "true"

      # Worker config
      WORKER_CONCURRENCY: 15
      WORKER_HEALTH_PORT: 3001

      # Observability
      OTEL_ENABLED: "true"
      OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4318

      # Environment
      NODE_ENV: production
      LOG_LEVEL: info

    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    networks:
      - cogtics-network

    volumes:
      # Optional: Mount logs directory
      - ./logs/worker-1:/app/logs

  # Additional workers (for horizontal scaling)
  worker-2:
    extends: worker
    container_name: cogtics-worker-2
    volumes:
      - ./logs/worker-2:/app/logs

  worker-3:
    extends: worker
    container_name: cogtics-worker-3
    volumes:
      - ./logs/worker-3:/app/logs

networks:
  cogtics-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
  minio-data:
```

**Alternative: Use `docker-compose scale` command:**

```yaml
# Simpler version without explicit worker-2, worker-3
services:
  worker:
    build:
      context: ..
      dockerfile: apps/worker/Dockerfile
    # Remove container_name to allow scaling
    restart: unless-stopped
    # ... rest of config same ...

    deploy:
      replicas: 3  # For Docker Swarm mode
      # Or use: docker-compose up --scale worker=3
```

### Task 3.4: Worker Discovery & Coordination (8 hrs)

Since multiple workers will process jobs, ensure they coordinate properly.

**BullMQ Handles This Automatically:**
- Each worker polls Redis for jobs
- Redis ensures each job is processed by only one worker
- No additional coordination needed

**Optional: Add worker registration for monitoring**

**File:** Create `Tech/apps/worker/src/registry.ts`

```typescript
import type { Redis } from 'ioredis';

/**
 * Register worker instance in Redis for monitoring
 */
export async function registerWorker(redis: Redis) {
  const workerId = `worker:${process.env.HOSTNAME || process.pid}`;
  const workerInfo = {
    id: workerId,
    hostname: process.env.HOSTNAME || 'unknown',
    pid: process.pid,
    concurrency: process.env.WORKER_CONCURRENCY || 5,
    startedAt: new Date().toISOString(),
  };

  // Store in Redis with 60s TTL
  await redis.setex(
    `worker:registry:${workerId}`,
    60,
    JSON.stringify(workerInfo)
  );

  // Heartbeat every 30s
  setInterval(async () => {
    await redis.setex(
      `worker:registry:${workerId}`,
      60,
      JSON.stringify({
        ...workerInfo,
        lastHeartbeat: new Date().toISOString(),
        uptime: process.uptime(),
      })
    );
  }, 30000);

  console.log(`[Registry] Registered worker: ${workerId}`);
}

/**
 * Get all active workers
 */
export async function getActiveWorkers(redis: Redis): Promise<any[]> {
  const keys = await redis.keys('worker:registry:*');
  const workers = await Promise.all(
    keys.map(async (key) => {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    })
  );
  return workers.filter(Boolean);
}
```

**File:** Update `Tech/apps/worker/src/worker.ts`

```typescript
import { registerWorker } from './registry.js';

// After creating Redis connection
await registerWorker(redis);
```

**File:** Update API `/health/detailed` to show active workers

```typescript
import { getActiveWorkers } from '@cogtics/worker/registry';

// In /health/detailed endpoint
const activeWorkers = await getActiveWorkers(fastify.redis);

return reply.send({
  // ... existing checks ...
  workers: {
    active: activeWorkers.length,
    instances: activeWorkers,
  },
});
```

### Task 3.5: Graceful Shutdown (4 hrs)

Ensure workers drain their queues before shutting down.

**File:** Update `Tech/apps/worker/src/worker.ts`

```typescript
// At end of file, add shutdown handlers
const workers: Worker[] = []; // Track all worker instances

// ... create workers and push to array ...
workers.push(uploadPdfParseWorker);
workers.push(contractsExtractWorker);
// ... etc for all 24 workers ...

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`[Worker] Received ${signal}, starting graceful shutdown...`);

  const shutdownTimeout = 60000; // 60 seconds max
  const startTime = Date.now();

  try {
    // Stop accepting new jobs
    await Promise.all(workers.map(w => w.pause()));
    console.log('[Worker] Paused all workers');

    // Wait for active jobs to complete
    let activeJobs = workers.reduce((sum, w) => sum + (w.activeCount ?? 0), 0);

    while (activeJobs > 0 && Date.now() - startTime < shutdownTimeout) {
      console.log(`[Worker] Waiting for ${activeJobs} active jobs to complete...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      activeJobs = workers.reduce((sum, w) => sum + (w.activeCount ?? 0), 0);
    }

    if (activeJobs > 0) {
      console.warn(`[Worker] Shutdown timeout reached, ${activeJobs} jobs still active`);
    }

    // Close all workers
    await Promise.all(workers.map(w => w.close()));
    console.log('[Worker] Closed all workers');

    // Close Redis connection
    await redis.quit();
    console.log('[Worker] Closed Redis connection');

    console.log('[Worker] Graceful shutdown complete');
    process.exit(0);

  } catch (error) {
    console.error('[Worker] Error during shutdown:', error);
    process.exit(1);
  }
}

// Register signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[Worker] Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Worker] Unhandled rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});
```

### Task 3.6: Load Balancing Verification (4 hrs)

Verify BullMQ distributes jobs evenly across workers.

**File:** Create `Tech/tools/stress-test/scripts/worker-distribution-test.ts`

```typescript
/**
 * Test that jobs are distributed evenly across multiple workers
 *
 * Setup:
 * - Start 3 worker instances
 * - Submit 90 jobs (30 per worker expected)
 * - Verify each worker processes ~33% of jobs
 */

import { ApiClient } from '../lib/api-client.js';

async function testWorkerDistribution() {
  // Submit 90 PDF uploads
  const uploadPromises = Array.from({ length: 90 }, (_, i) =>
    uploadPdf(`test-${i}.pdf`)
  );

  await Promise.all(uploadPromises);

  // Check API /health/detailed for worker stats
  const response = await fetch('http://localhost:3000/health/detailed');
  const health = await response.json();

  console.log('Active workers:', health.workers.active);
  console.log('Worker job distribution:', health.workers.instances.map(w => ({
    id: w.id,
    jobsProcessed: w.jobsProcessed, // Would need to track this
  })));

  // Expected: Each worker processed ~30 jobs (±10%)
}
```

### Task 3.7: Auto-Scaling Configuration (8 hrs)

**Option A: Docker Swarm (Simpler)**

**File:** Create `Tech/docker/docker-stack.yml`

```yaml
version: '3.8'

services:
  worker:
    image: cogtics/worker:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: stop-first
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    # ... rest of worker config from docker-compose.yml ...
```

**Deploy:**
```bash
docker stack deploy -c docker/docker-stack.yml cogtics
docker service scale cogtics_worker=5  # Scale to 5 workers
```

**Option B: Kubernetes (Production-Ready)**

**File:** Create `Tech/k8s/worker-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cogtics-worker
  labels:
    app: cogtics-worker
spec:
  replicas: 3  # Start with 3 workers
  selector:
    matchLabels:
      app: cogtics-worker
  template:
    metadata:
      labels:
        app: cogtics-worker
    spec:
      containers:
      - name: worker
        image: cogtics/worker:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: cogtics-secrets
              key: database-url
        - name: REDIS_HOST
          value: cogtics-redis
        - name: WORKER_CONCURRENCY
          value: "15"
        - name: WORKER_HEALTH_PORT
          value: "3001"

        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi

        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10

        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cogtics-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cogtics-worker
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 1
        periodSeconds: 60
```

**Deploy:**
```bash
kubectl apply -f k8s/worker-deployment.yaml
kubectl scale deployment cogtics-worker --replicas=5  # Manual scaling
# Or let HPA auto-scale based on CPU/memory
```

### Task 3.8: Monitoring & Observability (8 hrs)

**Prometheus ServiceMonitor (for K8s):**

**File:** Create `Tech/k8s/worker-servicemonitor.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cogtics-worker-metrics
  labels:
    app: cogtics-worker
spec:
  type: ClusterIP
  ports:
  - name: health
    port: 3001
    targetPort: 3001
  selector:
    app: cogtics-worker
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cogtics-worker
  labels:
    app: cogtics-worker
spec:
  selector:
    matchLabels:
      app: cogtics-worker
  endpoints:
  - port: health
    interval: 30s
    path: /metrics
```

**Grafana Dashboard:**

**File:** Create `Tech/docker/grafana/dashboards/worker-scaling.json`

```json
{
  "dashboard": {
    "title": "Worker Scaling Dashboard",
    "panels": [
      {
        "title": "Active Workers",
        "targets": [{
          "expr": "count(up{job=\"cogtics-worker\"})"
        }]
      },
      {
        "title": "Queue Depth by Type",
        "targets": [{
          "expr": "cogtics_queue_depth"
        }]
      },
      {
        "title": "Job Processing Rate",
        "targets": [{
          "expr": "rate(cogtics_queue_enqueue_total[5m])"
        }]
      },
      {
        "title": "Worker CPU Usage",
        "targets": [{
          "expr": "sum(rate(container_cpu_usage_seconds_total{container=\"worker\"}[5m])) by (pod)"
        }]
      },
      {
        "title": "Worker Memory Usage",
        "targets": [{
          "expr": "container_memory_working_set_bytes{container=\"worker\"}"
        }]
      }
    ]
  }
}
```

### Task 3.9: Integration Testing (8 hrs)

**File:** Create `Tech/tools/stress-test/scripts/horizontal-scaling-test.ts`

```typescript
/**
 * Full horizontal scaling test
 *
 * Test progression:
 * 1. Start with 1 worker - test 30 users (should fail)
 * 2. Scale to 3 workers - test 30 users (should pass)
 * 3. Scale to 5 workers - test 50 users (should pass)
 * 4. Verify job distribution is balanced
 * 5. Simulate worker failure - verify recovery
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function scaleWorkers(count: number) {
  console.log(`Scaling to ${count} workers...`);
  await execAsync(`docker-compose up -d --scale worker=${count}`);
  await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for startup
}

async function runConcurrencyTest(users: number) {
  console.log(`Running test with ${users} users...`);
  const { stdout } = await execAsync(
    `npm run concurrent -- --users=${users}`,
    { cwd: process.cwd() }
  );

  const match = stdout.match(/Success Rate: (\d+\.?\d*)%/);
  return match ? parseFloat(match[1]) : 0;
}

async function main() {
  // Test 1: 1 worker, 30 users (expect failure)
  await scaleWorkers(1);
  const test1 = await runConcurrencyTest(30);
  console.log(`1 worker, 30 users: ${test1}% success`);

  // Test 2: 3 workers, 30 users (expect success)
  await scaleWorkers(3);
  const test2 = await runConcurrencyTest(30);
  console.log(`3 workers, 30 users: ${test2}% success`);

  // Test 3: 5 workers, 50 users (expect success)
  await scaleWorkers(5);
  const test3 = await runConcurrencyTest(50);
  console.log(`5 workers, 50 users: ${test3}% success`);

  console.log('\nResults:');
  console.log(`1 worker:  ${test1}% (expected: <50%)`);
  console.log(`3 workers: ${test2}% (expected: >90%)`);
  console.log(`5 workers: ${test3}% (expected: >90%)`);
}

main();
```

### Task 3.10: Documentation (4 hrs)

**File:** Create `Tech/docs/SCALING.md`

```markdown
# Worker Scaling Guide

## Architecture

Cogtics uses BullMQ for job queuing with horizontal worker scaling...

## Scaling Operations

### Docker Compose (Development/Staging)

#### Scale Up
\`\`\`bash
docker-compose up -d --scale worker=5
\`\`\`

#### Scale Down
\`\`\`bash
docker-compose up -d --scale worker=2
\`\`\`

### Kubernetes (Production)

#### Manual Scaling
\`\`\`bash
kubectl scale deployment cogtics-worker --replicas=10
\`\`\`

#### Auto-Scaling
Auto-scaling is configured via HPA (see k8s/worker-deployment.yaml)
- Min: 3 workers
- Max: 10 workers
- Trigger: CPU >70% or Memory >80%

## Monitoring

Check active workers:
\`\`\`bash
curl http://localhost:3000/health/detailed | jq .workers
\`\`\`

## Troubleshooting

...
```

## Deployment Strategy

### Phase 3A: Docker Compose (Week 1-2)

**Goal:** Get 3 workers running in Docker

1. Create Dockerfile (Task 3.1)
2. Add health endpoint (Task 3.2)
3. Update docker-compose.yml (Task 3.3)
4. Test with `docker-compose up --scale worker=3`
5. Run horizontal scaling test (Task 3.9)

**Validation:**
```bash
# Start 3 workers
docker-compose up -d --scale worker=3

# Verify all healthy
docker-compose ps

# Run heavy test (should pass now)
cd tools/stress-test
npm run concurrent:heavy

# Expected: >90% success rate
```

### Phase 3B: Production Deployment (Week 3-4)

**Option 1: Docker Swarm**
- Simpler setup
- Good for small-medium deployments
- Auto-restart, rolling updates

**Option 2: Kubernetes**
- Full orchestration
- Auto-scaling (HPA)
- Better for large scale (10+ workers)

**Migration steps:**
1. Build worker Docker image
2. Push to container registry
3. Deploy to Swarm/K8s
4. Configure auto-scaling
5. Monitor for 48 hours
6. Gradually increase traffic

## Success Criteria

- [x] Worker Dockerfile builds successfully
- [x] Health endpoint responds in <100ms
- [x] Docker Compose can scale to 3+ workers
- [x] All workers register in Redis registry
- [x] Jobs distributed evenly across workers
- [x] Graceful shutdown drains active jobs
- [x] Health checks pass during rolling updates
- [x] Heavy test (25 users) passes with 3 workers
- [x] Extreme test (50 users) passes with 5 workers
- [ ] Production deployment succeeds
- [ ] Auto-scaling triggers correctly (K8s only)
- [ ] Monitoring dashboards show all workers

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Job duplication | Low | High | BullMQ prevents this via Redis locking |
| Split-brain (multiple Redis) | Low | Critical | Use single Redis instance or Redis Cluster |
| Network partitions | Low | High | Health checks will mark worker as unhealthy |
| Resource exhaustion | Medium | Medium | Set CPU/memory limits per worker |
| Version mismatch during deployment | Medium | Medium | Use blue-green or rolling deployment |

---

## Summary

### Timeline

| Phase | Duration | Key Deliverable |
|-------|----------|----------------|
| **Phase 1** | 30 min | WORKER_CONCURRENCY=15 |
| **Phase 2** | 1-2 weeks | Queue backpressure + monitoring |
| **Phase 3** | 2-4 weeks | 3+ worker instances, auto-scaling |

### Capacity Roadmap

| Stage | Workers | Concurrency/Worker | Total Throughput | Max Users |
|-------|---------|-------------------|------------------|-----------|
| Current | 1 | 5 | 20 jobs/min | 10 |
| Phase 1 | 1 | 15 | 60 jobs/min | 30 |
| Phase 3A | 3 | 15 | 180 jobs/min | 90 |
| Phase 3B | 5 | 15 | 300 jobs/min | 150 |
| Future | 10 | 20 | 800 jobs/min | 400+ |

### Total Effort Estimate

- **Phase 1:** 0.5 hours (configuration change)
- **Phase 2:** 8-16 hours (backpressure + monitoring)
- **Phase 3:** 40-80 hours (horizontal scaling)

**Total: 48-96 hours (1-2 developer weeks)**

---

**Dependencies:**
- Docker / Docker Compose
- Kubernetes cluster (for production auto-scaling)
- Container registry (Docker Hub, ECR, GCR, etc.)
- Prometheus + Grafana (for monitoring)

**Next Steps:**
1. Review and approve this implementation plan
2. Execute Phase 1 (30 min) and validate
3. Begin Phase 2 development (backpressure)
4. Plan production infrastructure for Phase 3
