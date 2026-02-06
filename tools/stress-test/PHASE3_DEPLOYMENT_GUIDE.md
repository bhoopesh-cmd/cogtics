# Phase 3: Multi-Worker Deployment Guide

**Date:** 2026-01-31
**Status:** Ready for Testing

---

## Quick Start

### Step 1: Build Worker TypeScript Code

Before building Docker images, compile the TypeScript code:

```bash
cd "D:\cogtics main\Tech"

# Build worker and all dependencies
pnpm --filter @cogtics/worker... build

# Verify build succeeded
ls apps/worker/dist/
# Should see: bootstrap.js, worker.js, health-server.js, etc.
```

### Step 2: Build Worker Docker Image

```bash
cd "D:\cogtics main\Tech"

# Build worker image (from Tech directory, not docker/)
docker build -f apps/worker/Dockerfile -t cogtics-worker:latest .

# Verify image was created
docker images | grep cogtics-worker
```

**Note:** The Dockerfile uses multi-stage build:
- Stage 1: Installs dependencies and builds TypeScript
- Stage 2: Creates production image with only runtime dependencies

### Step 3: Start Multi-Worker Stack

```bash
cd "D:\cogtics main\Tech\docker"

# Start infrastructure + 3 workers
docker-compose up -d worker-1 worker-2 worker-3

# Check worker health
curl http://localhost:3011/health  # worker-1
curl http://localhost:3012/health  # worker-2
curl http://localhost:3013/health  # worker-3

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-01-31T...",
  "uptime": 123.45,
  "workerConcurrency": 15,
  "pid": 1,
  "memory": {
    "heapUsed": 50,
    "heapTotal": 100,
    "rss": 150
  }
}
```

### Step 4: Monitor Workers

**View logs:**
```bash
# All workers
docker-compose logs -f worker-1 worker-2 worker-3

# Specific worker
docker-compose logs -f worker-1
```

**Check container status:**
```bash
docker ps | grep worker

# Expected:
cogtics-worker-1   Up 2 minutes (healthy)
cogtics-worker-2   Up 2 minutes (healthy)
cogtics-worker-3   Up 2 minutes (healthy)
```

**Monitor job distribution:**
```bash
# Watch worker logs to see which worker picks up jobs
docker-compose logs -f --tail=50 worker-1 worker-2 worker-3
```

---

## Testing Multi-Worker Setup

### Test 1: Verify Health Endpoints

```bash
# Test all worker health endpoints
for port in 3011 3012 3013; do
  echo "Testing worker on port $port..."
  curl http://localhost:$port/health
  echo ""
done
```

**Expected:** All 3 workers return HTTP 200 with status "ok"

### Test 2: Submit Test Job

Upload a PDF to trigger job processing:

```bash
# Start API (if not already running)
cd "D:\cogtics main\Tech"
pnpm dev:api

# Submit test upload
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

# Complete upload (triggers job)
curl -X POST http://localhost:3000/uploads/pdf/complete \
  -H "x-tenant-id: tenant_01" \
  -H "x-user-id: user_01" \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "<upload_id>",
    "autoProcess": true
  }'
```

**Monitor worker logs** to see which worker picks up the job:
```bash
docker-compose logs -f worker-1 worker-2 worker-3 | grep "upload.pdf.parse"
```

**Expected:** Job appears in ONE worker's log (BullMQ load balances automatically)

### Test 3: Check Queue Status

```bash
curl http://localhost:3000/health/detailed | jq .queues

# Expected with multi-worker limits:
{
  "depths": {
    "upload.pdf.parse": 0
  },
  "status": [
    {
      "type": "upload.pdf.parse",
      "depth": 0,
      "limit": 225,           # <-- 3x from 75
      "utilizationPercent": 0,
      "status": "healthy"
    }
  ],
  "overallStatus": "healthy"
}
```

### Test 4: Load Test with Stress Tool

**Light load (should be easy for 3 workers):**
```bash
cd "D:\cogtics main\Tech\tools\stress-test"
npm run concurrent:medium

# Expected:
# - 100% success rate
# - Jobs distributed across 3 workers
# - Queue depth stays low (<50)
```

**Heavy load (validate capacity increase):**
```bash
npm run concurrent:heavy

# Expected with 3 workers:
# - 99%+ success rate
# - Queue depth <225 (within new limit)
# - No HTTP 429 responses
# - Processing time stable
```

**Extreme load (trigger backpressure):**
```bash
# Run custom test with 100+ users
node --loader tsx src/index.ts \
  --users 100 \
  --pdfs-per-user 10 \
  --concurrent

# Expected:
# - Some HTTP 429 responses (queue full)
# - System remains stable
# - No crashes or timeouts
# - Queue depth respects 225 limit
```

---

## Scaling Workers

### Add More Workers

Edit `docker/docker-compose.yml` to add worker-4 and worker-5:

```yaml
  worker-4:
    build:
      context: ..
      dockerfile: apps/worker/Dockerfile
    container_name: cogtics-worker-4
    # ... (copy config from worker-3)
    ports:
      - "3014:3001"

  worker-5:
    build:
      context: ..
      dockerfile: apps/worker/Dockerfile
    container_name: cogtics-worker-5
    # ... (copy config from worker-3)
    ports:
      - "3015:3001"
```

Then update queue limits in `apps/api/src/lib/queue-depth.ts`:

```typescript
// 5 workers × 15 concurrency = 75 slots
// 75 slots × 4 jobs/min = 300 jobs/min
export const QUEUE_DEPTH_LIMITS = {
  'upload.pdf.parse': 375,  // 5x from 75
  'upload.csv.parse': 250,  // 5x from 50
  // ... etc
}
```

Start new workers:
```bash
docker-compose up -d worker-4 worker-5
```

### Scale Down Workers

Stop specific workers:
```bash
docker-compose stop worker-3
docker-compose rm -f worker-3
```

Remaining workers automatically pick up the workload.

---

## Troubleshooting

### Workers Not Starting

**Check logs:**
```bash
docker-compose logs worker-1
```

**Common issues:**
- Database not ready: Wait for postgres health check
- Redis not ready: Wait for redis health check
- Build failed: Run `pnpm build` before docker build

### Workers Unhealthy

Check health endpoint:
```bash
curl -v http://localhost:3011/health
```

If 404:
- Health server not starting
- Check bootstrap.ts imports health-server.ts

If connection refused:
- Container crashed
- Check logs: `docker-compose logs worker-1`

### Jobs Not Distributing

All jobs going to one worker?

**Check:**
1. Are all workers connected to same Redis?
   ```bash
   docker-compose exec worker-1 env | grep REDIS_URL
   ```
2. Are all workers using same queue names?
   ```bash
   docker-compose logs worker-1 | grep "registered processor"
   ```

BullMQ automatically load balances across workers on same Redis.

### Memory Issues

Workers using too much memory?

**Check memory usage:**
```bash
docker stats

# Expected per worker:
# - Development: ~150-200MB RSS
# - Under load: ~300-500MB RSS
```

**Reduce concurrency if needed:**
```yaml
# In docker-compose.yml
environment:
  WORKER_CONCURRENCY: 10  # Reduce from 15
```

---

## Production Deployment

### Build Production Image

```bash
# Tag for registry
docker build -f apps/worker/Dockerfile \
  -t your-registry.com/cogtics-worker:v1.0.0 .

# Push to registry
docker push your-registry.com/cogtics-worker:v1.0.0
```

### Deploy to Kubernetes

Example Deployment (3 replicas):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cogtics-worker
spec:
  replicas: 3
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
        image: your-registry.com/cogtics-worker:v1.0.0
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: cogtics-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: cogtics-secrets
              key: redis-url
        - name: WORKER_CONCURRENCY
          value: "15"
        ports:
        - containerPort: 3001
          name: health
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 40
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 10
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "1000m"
```

Scale deployment:
```bash
kubectl scale deployment cogtics-worker --replicas=5
```

---

## Monitoring

### Prometheus Metrics

Workers expose metrics at `/metrics` (if configured):

```bash
curl http://localhost:3011/metrics
```

### Grafana Dashboards

Access Grafana at http://localhost:3002 (changed from 3001)

**Key metrics to monitor:**
- Job processing rate per worker
- Queue depth over time
- Worker CPU/memory usage
- Job success/failure rate

### Alerts to Configure

**Critical:**
- All workers down
- Queue depth >90% of limit
- Job failure rate >5%

**Warning:**
- Queue depth >75% of limit
- Worker memory >80% of limit
- Single worker down (2+ still healthy)

---

## Capacity Planning

### Current Capacity (3 Workers)

- **Throughput:** 180 jobs/min
- **Concurrent Users:** ~90 users
- **Queue Limit:** 225 PDF uploads
- **Backlog Tolerance:** ~75 seconds at full load

### Scaling Guidelines

| Workers | Concurrency | Throughput | Users | Queue Limit |
|---------|-------------|------------|-------|-------------|
| 1       | 15          | 60/min     | 30    | 75          |
| 3       | 15          | 180/min    | 90    | 225         |
| 5       | 15          | 300/min    | 150   | 375         |
| 10      | 15          | 600/min    | 300   | 750         |

**When to scale up:**
- HTTP 429 responses increasing
- Queue utilization consistently >75%
- Processing latency trending up

**When to scale down:**
- Queue utilization consistently <25%
- Off-peak hours with low traffic
- Cost optimization needed

---

## Success Criteria

Phase 3 is successful when:

- [x] Worker Dockerfile builds successfully
- [x] 3 workers start and pass health checks
- [x] Jobs distribute across all workers
- [ ] 100% success rate with 90 concurrent users
- [ ] Queue depth stays <225 under heavy load
- [ ] No single point of failure (kill 1 worker, others continue)
- [ ] Load test validates 3x capacity increase

---

## Next Steps

1. **Run Load Tests** - Validate 90+ user capacity
2. **Production Deploy** - Deploy to staging/production
3. **Monitor & Tune** - Adjust limits based on real traffic
4. **Auto-Scaling** - Implement HPA in k8s (optional)

---

**Phase 3 Status:** IMPLEMENTATION COMPLETE ✅
**Ready for:** Load testing and validation
