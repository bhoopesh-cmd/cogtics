# SLO Baselines (Template)

Define per-endpoint and per-queue targets here. Update after each release.

## API Latency Targets

| Endpoint | p50 (ms) | p95 (ms) | p99 (ms) | Error Rate | Notes |
| --- | --- | --- | --- | --- | --- |
| /health | TBD | TBD | TBD | <0.1% | Liveness check |
| /issues | TBD | TBD | TBD | <1.0% | Issue list |
| /uploads | TBD | TBD | TBD | <1.0% | CSV/PDF upload |
| /simulations | TBD | TBD | TBD | <1.0% | Run simulation |
| /exports | TBD | TBD | TBD | <1.0% | Export request |
| /contracts | TBD | TBD | TBD | <1.0% | Contract list |
| /snapshots | TBD | TBD | TBD | <1.0% | Trigger snapshot |

## Worker Queue Targets

| Queue | Throughput | p95 Latency | Max Retries | DLQ Enabled | Notes |
| --- | --- | --- | --- | --- | --- |
| ingest.load | TBD | TBD | 3 | Yes | Raw ingest |
| ingest.normalize | TBD | TBD | 3 | Yes | Normalize |
| ingest.upsert | TBD | TBD | 3 | Yes | Upsert |
| ingest.finalize | TBD | TBD | 3 | Yes | Finalize |
| detect.run | TBD | TBD | 3 | Yes | Detection |
| simulate.run | TBD | TBD | 3 | Yes | Simulations |
| export.csv | TBD | TBD | 3 | Yes | Export CSV |
| export.pdf | TBD | TBD | 3 | Yes | Export PDF |

## System Targets

- CPU utilization: TBD
- Memory utilization: TBD
- Disk utilization: TBD
- Redis memory: TBD
- Postgres connections: TBD

## Baseline Run Log

| Date | Dataset | Env | Notes |
| --- | --- | --- | --- |
| YYYY-MM-DD | test_comprehensive | local | TBD |
| YYYY-MM-DD | stress_test | local | TBD |
