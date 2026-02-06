# Phase 2: Concurrency Testing - Implementation Plan

**Date:** 2026-01-31
**Status:** PLANNED
**Prerequisites:** Phase 1 Complete ✅

---

## Executive Summary

Phase 2 focuses on testing the system's behavior under **concurrent user load**. Unlike Phase 1 (volume testing with sequential batches), Phase 2 simulates **multiple users performing operations simultaneously** to identify race conditions, connection pool exhaustion, deadlocks, and performance degradation under realistic multi-tenant load.

---

## Phase 1 Learnings Applied

### What Worked ✅
| Finding | Application to Phase 2 |
|---------|------------------------|
| 100% success rate at low volume | Baseline for comparison under concurrent load |
| Linear scaling (5→10 concurrent = 2x throughput) | Test if scaling continues at 25, 50, 100 concurrent |
| Upload time ~34s, Process time ~30s | Baseline metrics to monitor for degradation |
| 9.1 PDFs/min at 10 concurrent | Target: maintain throughput under multi-user load |

### Gaps Identified ⚠️
| Gap | Phase 2 Solution |
|-----|------------------|
| System metrics showing 0 (psql/redis-cli unavailable) | Use Docker exec or API-based monitoring |
| Detection rules didn't run | Test full contract pipeline, not just uploads |
| Single tenant testing only | Multi-tenant concurrent testing |
| No rate limiting tested | Test system behavior without limits |

### Current System Configuration
| Setting | Value | Limit | Risk |
|---------|-------|-------|------|
| `WORKER_CONCURRENCY` | 5 | 1-100 | Bottleneck at current setting |
| PostgreSQL pool | 10 connections | 100 max | Pool exhaustion at ~50 concurrent |
| Redis connections | Unlimited* | 10,000 | Low risk |
| API rate limiting | NONE | - | No protection from overload |

---

## Phase 2 Objectives

### Primary Goals
1. **Simulate 10-100 concurrent users** performing operations simultaneously
2. **Test multi-tenant isolation** under concurrent load
3. **Find breaking points** in connection pools, queues, and workers
4. **Measure performance degradation** as concurrency increases
5. **Validate system stability** after sustained concurrent load

### Success Criteria
| Metric | Target | Warning | Failure |
|--------|--------|---------|---------|
| Success rate | >95% | >90% | <90% |
| Response time (p95) | <5s | <10s | >30s |
| Error rate | <2% | <5% | >10% |
| Queue recovery | <5 min | <15 min | Never recovers |
| Memory growth | <20% | <50% | OOM |

---

## Test Scenarios

### Scenario 2.1: Multi-User Upload Simulation
**Goal:** Simulate N users uploading PDFs simultaneously

| Config | Users | PDFs/User | Total PDFs | Expected Behavior |
|--------|-------|-----------|------------|-------------------|
| Light | 5 | 10 | 50 | Smooth processing |
| Medium | 10 | 10 | 100 | Queue buildup |
| Heavy | 25 | 10 | 250 | Resource pressure |
| Stress | 50 | 10 | 500 | Find breaking point |
| Extreme | 100 | 5 | 500 | System limits |

**Test Flow:**
```
Each simulated user:
1. Authenticates (unique JWT token)
2. Uploads 10 PDFs with 100ms delay between each
3. Polls for completion status
4. Records timing and success/failure
```

### Scenario 2.2: Multi-Tenant Isolation
**Goal:** Verify tenant isolation under concurrent cross-tenant operations

| Config | Tenants | Users/Tenant | Operations/User |
|--------|---------|--------------|-----------------|
| Basic | 3 | 5 | 20 uploads |
| Extended | 5 | 10 | 20 uploads |

**Verification:**
- Tenant A cannot see Tenant B's uploads
- No data leakage in responses
- RLS enforced under load

### Scenario 2.3: Mixed Workload
**Goal:** Simulate realistic usage patterns with mixed operations

| Operation Type | % of Requests | Users |
|----------------|---------------|-------|
| PDF Upload | 40% | 20 |
| Get Upload Status | 30% | 15 |
| List Uploads | 20% | 10 |
| Reprocess Upload | 10% | 5 |

### Scenario 2.4: Worker Concurrency Scaling
**Goal:** Test different `WORKER_CONCURRENCY` settings

| Test | WORKER_CONCURRENCY | Load | Expected |
|------|-------------------|------|----------|
| A | 5 (default) | 50 concurrent uploads | Baseline |
| B | 10 | 50 concurrent uploads | 2x throughput |
| C | 20 | 50 concurrent uploads | Diminishing returns? |
| D | 50 | 100 concurrent uploads | Find limit |

### Scenario 2.5: Connection Pool Stress
**Goal:** Exhaust database connection pools

| Test | DB Pool Size | Concurrent Requests | Expected |
|------|--------------|---------------------|----------|
| A | 10 (default) | 20 | Normal |
| B | 10 | 50 | Pool wait/timeout |
| C | 10 | 100 | Failures expected |
| D | 30 | 100 | Test with increased pool |

### Scenario 2.6: Queue Saturation
**Goal:** Fill BullMQ queues faster than workers can process

| Test | Upload Rate | Workers | Expected Queue Depth |
|------|-------------|---------|---------------------|
| A | 10/sec | 5 | Growing |
| B | 20/sec | 5 | Rapid growth |
| C | 20/sec | 20 | Stabilize |
| D | 50/sec | 20 | Find saturation point |

---

## Implementation Architecture

### Directory Structure
```
tools/stress-test/
├── config/
│   ├── test-config.ts           # [EXISTS] Base config
│   ├── concurrency-config.ts    # [NEW] Phase 2 config
│   └── users.ts                 # [NEW] Test user definitions
├── scripts/
│   ├── volume-test.ts           # [EXISTS] Phase 1
│   ├── monitor.ts               # [EXISTS] System monitor
│   ├── report.ts                # [EXISTS] Report generator
│   ├── verify-setup.ts          # [EXISTS] Setup verification
│   ├── concurrency-test.ts      # [NEW] Main Phase 2 runner
│   ├── multi-tenant-test.ts     # [NEW] Tenant isolation tests
│   ├── mixed-workload-test.ts   # [NEW] Mixed operations
│   ├── pool-stress-test.ts      # [NEW] Connection pool testing
│   └── user-simulator.ts        # [NEW] User simulation class
├── lib/
│   ├── api-client.ts            # [NEW] Authenticated API client
│   ├── metrics-collector.ts     # [NEW] Docker-based metrics
│   └── jwt-generator.ts         # [NEW] JWT token generation
├── results/                     # Test results
├── outputs/                     # Reports
└── package.json                 # [UPDATE] New scripts
```

### New NPM Scripts
```json
{
  "scripts": {
    "concurrent:light": "tsx scripts/concurrency-test.ts --users=5 --pdfs=10",
    "concurrent:medium": "tsx scripts/concurrency-test.ts --users=10 --pdfs=10",
    "concurrent:heavy": "tsx scripts/concurrency-test.ts --users=25 --pdfs=10",
    "concurrent:stress": "tsx scripts/concurrency-test.ts --users=50 --pdfs=10",
    "concurrent:extreme": "tsx scripts/concurrency-test.ts --users=100 --pdfs=5",
    "tenant:test": "tsx scripts/multi-tenant-test.ts --tenants=3 --users=5",
    "mixed:test": "tsx scripts/mixed-workload-test.ts --duration=300",
    "pool:stress": "tsx scripts/pool-stress-test.ts --connections=100",
    "phase2:all": "npm run concurrent:light && npm run concurrent:medium && npm run concurrent:heavy && npm run report"
  }
}
```

---

## Detailed Implementation

### 1. User Simulator Class

**File:** `scripts/user-simulator.ts`

```typescript
interface UserConfig {
  userId: string;
  tenantId: string;
  token: string;
  uploadCount: number;
  delayBetweenUploads: number; // ms
}

interface UserResult {
  userId: string;
  tenantId: string;
  uploads: UploadResult[];
  totalTime: number;
  successRate: number;
  avgUploadTime: number;
  avgProcessTime: number;
  errors: string[];
}

class UserSimulator {
  // Simulates a single user's session
  async run(): Promise<UserResult>;

  // Upload a single PDF
  private async uploadPdf(filePath: string): Promise<UploadResult>;

  // Wait for all uploads to complete
  private async waitForCompletion(uploadIds: string[]): Promise<void>;
}
```

### 2. Concurrency Test Runner

**File:** `scripts/concurrency-test.ts`

```typescript
interface ConcurrencyTestConfig {
  userCount: number;
  pdfsPerUser: number;
  delayBetweenUsers: number; // Stagger user starts
  tenants: string[];
  timeout: number;
}

interface ConcurrencyTestResult {
  config: ConcurrencyTestConfig;
  startTime: number;
  endTime: number;
  totalUsers: number;
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  userResults: UserResult[];
  systemMetrics: SystemMetrics[];
  peakConcurrency: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorBreakdown: Record<string, number>;
}

class ConcurrencyTest {
  // Main test runner
  async run(config: ConcurrencyTestConfig): Promise<ConcurrencyTestResult>;

  // Spawn N users concurrently
  private async spawnUsers(count: number): Promise<UserResult[]>;

  // Collect metrics during test
  private async collectMetrics(): Promise<void>;

  // Calculate percentiles
  private calculatePercentiles(times: number[]): Percentiles;
}
```

### 3. Docker-Based Metrics Collector

**File:** `lib/metrics-collector.ts`

```typescript
// Fix for Windows: Use Docker exec instead of local CLI tools

class DockerMetricsCollector {
  // Get PostgreSQL stats via Docker exec
  async getPostgresStats(): Promise<{
    activeConnections: number;
    idleConnections: number;
    waitingQueries: number;
    maxConnections: number;
  }>;

  // Get Redis stats via Docker exec
  async getRedisStats(): Promise<{
    connectedClients: number;
    usedMemoryMB: number;
    totalCommands: number;
    queueDepths: Record<string, number>;
  }>;

  // Get container stats
  async getContainerStats(): Promise<{
    api: { cpuPercent: number; memoryMB: number };
    worker: { cpuPercent: number; memoryMB: number };
    postgres: { cpuPercent: number; memoryMB: number };
    redis: { cpuPercent: number; memoryMB: number };
  }>;
}
```

**Implementation approach:**
```typescript
// Instead of: psql -c "SELECT ..."
// Use: docker exec cogtics-postgres psql -c "SELECT ..."

async getPostgresStats() {
  const cmd = `docker exec cogtics-postgres psql -U cogtics -d cogtics -t -c "
    SELECT json_build_object(
      'active', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
      'idle', (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle'),
      'waiting', (SELECT count(*) FROM pg_stat_activity WHERE wait_event IS NOT NULL),
      'max', (SELECT setting FROM pg_settings WHERE name = 'max_connections')
    )
  "`;

  const output = execSync(cmd, { encoding: 'utf-8' });
  return JSON.parse(output.trim());
}
```

### 4. JWT Token Generator

**File:** `lib/jwt-generator.ts`

```typescript
// Generate JWT tokens for multi-user testing
// Based on: Tech/apps/api/src/plugins/auth.ts

import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

async function generateToken(userId: string, tenantId: string): Promise<string> {
  const jwt = await new jose.SignJWT({ sub: userId, tid: tenantId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(new TextEncoder().encode(JWT_SECRET));

  return jwt;
}

// Pre-generate tokens for test users
async function generateTestUsers(count: number, tenantId: string): Promise<UserConfig[]> {
  const users: UserConfig[] = [];

  for (let i = 0; i < count; i++) {
    const userId = `stress_user_${i.toString().padStart(3, '0')}`;
    const token = await generateToken(userId, tenantId);

    users.push({
      userId,
      tenantId,
      token,
      uploadCount: 10,
      delayBetweenUploads: 100,
    });
  }

  return users;
}
```

### 5. API Client with Authentication

**File:** `lib/api-client.ts`

```typescript
import axios, { AxiosInstance } from 'axios';

interface ApiClientConfig {
  baseUrl: string;
  token?: string;
  userId?: string;
  tenantId?: string;
  timeout?: number;
}

class ApiClient {
  private client: AxiosInstance;

  constructor(config: ApiClientConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: this.buildHeaders(config),
    });
  }

  private buildHeaders(config: ApiClientConfig): Record<string, string> {
    if (config.token) {
      return { 'Authorization': `Bearer ${config.token}` };
    }
    // Dev mode fallback
    return {
      'x-dev-user-id': config.userId || 'user_01',
      'x-dev-tenant-id': config.tenantId || 'tenant_01',
    };
  }

  // Upload operations
  async startUpload(fileName: string): Promise<StartUploadResponse>;
  async uploadToS3(presignedUrl: string, data: Buffer): Promise<void>;
  async completeUpload(uploadId: string): Promise<void>;
  async getUploadStatus(uploadId: string): Promise<UploadStatus>;
  async listUploads(limit?: number): Promise<Upload[]>;
  async reprocessUpload(uploadId: string): Promise<void>;
}
```

---

## Monitoring Dashboard

### Real-Time Metrics Display

During test execution, display live metrics:

```
╔══════════════════════════════════════════════════════════════════╗
║  PHASE 2: CONCURRENCY TEST - LIVE DASHBOARD                     ║
╠══════════════════════════════════════════════════════════════════╣
║  Config: 25 users, 10 PDFs/user, 250 total                      ║
║  Elapsed: 05:23 / Est. Remaining: 12:45                         ║
╠══════════════════════════════════════════════════════════════════╣
║  PROGRESS                                                        ║
║  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  32% (80/250)      ║
║  Success: 78 | Failed: 2 | Pending: 170                         ║
╠══════════════════════════════════════════════════════════════════╣
║  SYSTEM METRICS                                                  ║
║  ┌─────────────┬──────────┬──────────┬──────────┐               ║
║  │ Component   │ CPU %    │ Memory   │ Status   │               ║
║  ├─────────────┼──────────┼──────────┼──────────┤               ║
║  │ API         │ 45%      │ 512 MB   │ OK       │               ║
║  │ Worker      │ 78%      │ 1.2 GB   │ BUSY     │               ║
║  │ PostgreSQL  │ 32%      │ 256 MB   │ OK       │               ║
║  │ Redis       │ 12%      │ 64 MB    │ OK       │               ║
║  └─────────────┴──────────┴──────────┴──────────┘               ║
╠══════════════════════════════════════════════════════════════════╣
║  QUEUE STATUS                                                    ║
║  upload.pdf.parse:    ████████████████████ 45 waiting           ║
║  contracts.extract:   ████████░░░░░░░░░░░░ 18 waiting           ║
║  contracts.segment:   ████░░░░░░░░░░░░░░░░ 8 waiting            ║
╠══════════════════════════════════════════════════════════════════╣
║  DATABASE                                                        ║
║  Connections: 8/10 active | 2 idle | 0 waiting                  ║
║  Queries/sec: 156                                                ║
╠══════════════════════════════════════════════════════════════════╣
║  RESPONSE TIMES (last 60s)                                       ║
║  p50: 1.2s | p95: 4.8s | p99: 12.3s | max: 28.4s               ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Configuration Tuning Tests

### Test Matrix for Optimal Settings

| Test ID | WORKER_CONCURRENCY | DB_POOL | Users | Expected Result |
|---------|-------------------|---------|-------|-----------------|
| T1 | 5 | 10 | 25 | Baseline |
| T2 | 10 | 10 | 25 | +Throughput, -Latency |
| T3 | 20 | 10 | 25 | Pool exhaustion? |
| T4 | 20 | 20 | 25 | Better performance |
| T5 | 20 | 20 | 50 | Find new baseline |
| T6 | 50 | 30 | 50 | High performance |
| T7 | 50 | 30 | 100 | Breaking point? |

### Environment Variable Changes

**File:** `Tech/.env` modifications for testing:

```bash
# Test configurations to try:

# Default (current)
WORKER_CONCURRENCY=5

# Medium
WORKER_CONCURRENCY=10

# High
WORKER_CONCURRENCY=20

# Maximum tested
WORKER_CONCURRENCY=50
```

**Database pool changes** require code modification:

```typescript
// packages/db/src/client.ts - line 20
max: config.maxConnections ?? 30,  // Increase from 10
```

---

## Execution Plan

### Pre-Test Setup (30 min)

1. **Create test users in database**
   ```sql
   INSERT INTO users (id, email, tenant_id, role, created_at)
   SELECT
     'stress_user_' || lpad(i::text, 3, '0'),
     'stress' || i || '@test.com',
     'tenant_01',
     'analyst',
     now()
   FROM generate_series(1, 100) i;
   ```

2. **Verify infrastructure**
   ```bash
   npm run verify
   docker stats --no-stream
   ```

3. **Reset test data**
   ```bash
   # Clear previous stress test uploads
   curl -X DELETE http://localhost:3000/admin/stress-test/cleanup \
     -H "x-dev-tenant-id: tenant_01"
   ```

### Test Execution Order

| Order | Test | Duration | Purpose |
|-------|------|----------|---------|
| 1 | concurrent:light | 10 min | Validate test infrastructure |
| 2 | concurrent:medium | 20 min | Baseline concurrent performance |
| 3 | tenant:test | 15 min | Multi-tenant isolation |
| 4 | concurrent:heavy | 40 min | Find performance degradation |
| 5 | pool:stress | 30 min | Connection pool limits |
| 6 | mixed:test | 30 min | Realistic workload |
| 7 | concurrent:stress | 60 min | Breaking point discovery |

**Total estimated time: ~3.5 hours**

### Post-Test Analysis

1. **Generate comprehensive report**
   ```bash
   npm run report
   ```

2. **Compare against Phase 1 baselines**
   - Upload time degradation under load
   - Processing time scaling
   - Error rate by concurrency level

3. **Identify breaking points**
   - Max concurrent users before degradation
   - Connection pool exhaustion threshold
   - Queue saturation point

---

## Success Metrics

### Quantitative Targets

| Metric | Phase 1 Baseline | Phase 2 Target | Breaking Point |
|--------|------------------|----------------|----------------|
| Throughput | 9.1 PDFs/min (10 concurrent) | 20+ PDFs/min (25 concurrent) | <5 PDFs/min |
| Success Rate | 100% | >95% | <90% |
| p95 Response | 60s | <120s | >300s |
| Error Rate | 0% | <2% | >10% |
| Queue Recovery | N/A | <5 min | Never |

### Qualitative Goals

- [ ] No race conditions detected
- [ ] No data corruption under load
- [ ] No tenant isolation violations
- [ ] Graceful degradation (not crash)
- [ ] System recovers after load stops

---

## Files to Create

| File | Purpose | Priority |
|------|---------|----------|
| `config/concurrency-config.ts` | Phase 2 configuration | High |
| `config/users.ts` | Test user definitions | High |
| `lib/api-client.ts` | Authenticated HTTP client | High |
| `lib/metrics-collector.ts` | Docker-based metrics | High |
| `lib/jwt-generator.ts` | Token generation | Medium |
| `scripts/concurrency-test.ts` | Main test runner | High |
| `scripts/user-simulator.ts` | User simulation | High |
| `scripts/multi-tenant-test.ts` | Tenant isolation | Medium |
| `scripts/mixed-workload-test.ts` | Mixed operations | Medium |
| `scripts/pool-stress-test.ts` | Connection testing | Medium |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| OOM on worker | Monitor memory, set limits, graceful restart |
| DB connection exhaustion | Increase pool, add wait timeout |
| Redis memory growth | Set maxmemory policy, monitor queues |
| Test data corruption | Use separate test tenant, cleanup after |
| API unresponsive | Add timeout handling, graceful degradation |

---

## Dependencies

### New npm packages needed

```json
{
  "dependencies": {
    "axios": "^1.6.5",
    "p-limit": "^5.0.0",
    "jose": "^5.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.6",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "cli-progress": "^3.12.0",
    "chalk": "^5.3.0"
  }
}
```

---

## Summary

Phase 2 Concurrency Testing will:

1. **Build on Phase 1** infrastructure and learnings
2. **Fix monitoring gaps** using Docker exec for system metrics
3. **Test multi-user scenarios** with 5-100 concurrent users
4. **Validate tenant isolation** under concurrent load
5. **Find breaking points** in workers, connections, and queues
6. **Tune configuration** for optimal performance
7. **Establish baselines** for production capacity planning

**Estimated implementation time:** 4-6 hours
**Estimated test execution time:** 3-4 hours
**Total Phase 2 time:** 1 day

---

## Next Steps

1. Implement the files listed above
2. Run pre-test setup
3. Execute test scenarios in order
4. Analyze results and compare to Phase 1
5. Document breaking points and recommendations
6. Proceed to Phase 3 (Detection Accuracy) or repeat Phase 2 with tuned config

---

**Plan Location:** `Tech/tools/stress-test/PHASE2_PLAN.md`
**Author:** Claude Code
**Date:** 2026-01-31
