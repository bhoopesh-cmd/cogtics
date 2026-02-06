# Quick Start Guide - Phase 1 Volume Testing

This guide will help you run your first stress test in under 5 minutes.

## Prerequisites

1. All Docker services running (`pnpm docker:up` from project root)
2. Database seeded (`pnpm db:seed` from project root)
3. API and Worker services running (`pnpm dev:api` and `pnpm dev:worker`)

## Step-by-Step

### 1. Install Dependencies

```bash
cd tools/stress-test
npm install
```

### 2. Verify Setup

```bash
npm run verify
```

Expected output:
```
✓ Docker: Docker is running
✓ PostgreSQL: Connected successfully
✓ Redis: Connected successfully
✓ MinIO: Service is running
✓ API: Service is healthy
⚠ PDF Data: Only 365 PDFs found (need 2400 for full stress test)
```

If you see any ✗ failures, fix them before proceeding.

### 3. Run Your First Test

```bash
npm run test:small
```

This will:
- Upload 50 PDFs with 5 concurrent uploads
- Monitor system metrics every 5 seconds
- Process PDFs through the worker
- Save results to `results/` directory

Expected output:
```
=== Starting Volume Test ===
Batch Size: 50 | Concurrency: 5
Found 50 PDF files to upload

[1/50] Uploading con_000b88705713.pdf...
[1/50] ✓ con_000b88705713.pdf - Upload: 1234ms, Process: 2345ms
...

=== Test Complete ===
Total Time: 45.67s
Success: 50 | Failed: 0
Avg Upload Time: 1234ms
Avg Process Time: 2345ms
Peak Queue Depth: 8
Peak Memory: 456MB

Results saved to results/volume-50-5-1738259123456.json
```

### 4. Generate Report

```bash
npm run report
```

This creates:
- `outputs/volume-test-{timestamp}.json` - Raw data
- `outputs/volume-test-{timestamp}.md` - Readable report
- `outputs/volume-test-{timestamp}.csv` - Time-series metrics

Open the `.md` file to see detailed analysis.

### 5. Run Additional Tests

Now that you've verified everything works, run larger tests:

```bash
# Medium batch (100 PDFs)
npm run test:medium

# Large batch (500 PDFs) - will take 10-15 minutes
npm run test:large

# Generate updated report
npm run report
```

## Running All Tests

To run the full test suite:

```bash
npm run test:all
```

This runs: small → medium → large → xlarge → generates report.

**Warning**: This will take 30-60 minutes depending on your system.

## Monitoring During Tests

In a separate terminal, run real-time monitoring:

```bash
npm run monitor
```

Press Ctrl+C when done. Metrics will be saved to CSV.

## What's Next?

After completing Phase 1 Volume Testing, you can:

1. Analyze breaking points in the generated reports
2. Tune worker concurrency or batch sizes based on results
3. Move to Phase 2: Concurrency Testing
4. Move to Phase 3: Detection Accuracy Testing

## Common Issues

### "No PDF files found"

Generate PDFs first:
```bash
cd ../synthetic-data
python examples/generate_pdfs.py \
  --input output/stress_test/data/contracts.json \
  --output output/stress_test/pdfs \
  --batch-size 50
```

### "Connection refused" to API

Start the API:
```bash
cd ../../  # Back to project root
pnpm dev:api
```

### Tests timing out

Check worker is processing jobs:
```bash
docker-compose logs -f worker
```

### High failure rate

Check for errors in the API/worker logs and ensure database migrations are up to date.

## Understanding the Results

Key metrics to watch:

- **Success Rate**: Should be >95%
- **Avg Process Time**: Should be <10s per PDF
- **Peak Queue Depth**: Should stay <1000
- **Peak Memory**: Worker should stay <2GB

If any of these thresholds are exceeded, the report will flag them with ✗.
