# Cogtics Observability Guide

This document describes the observability stack for Cogtics, including metrics, logs, traces, and dashboards.

## Overview

Cogtics uses the LGTM stack for observability:
- **Loki** - Log aggregation
- **Grafana** - Dashboards and visualization
- **Tempo** - Distributed tracing
- **Mimir/Prometheus** - Metrics storage

All telemetry is collected via **OpenTelemetry** and routed through the **OTel Collector**.

## Architecture

```
┌─────────────┐     ┌─────────────┐
│   API       │     │   Worker    │
│   Server    │     │             │
└──────┬──────┘     └──────┬──────┘
       │                   │
       │  OTel SDK         │
       └───────┬───────────┘
               │
       ┌───────▼───────┐
       │  OTel         │
       │  Collector    │
       └───────┬───────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼───┐  ┌───▼───┐  ┌───▼───┐
│Promethe│  │ Loki  │  │ Tempo │
└───┬───┘  └───┬───┘  └───┬───┘
    │          │          │
    └──────────┼──────────┘
               │
       ┌───────▼───────┐
       │   Grafana     │
       └───────────────┘
```

## Metrics Reference

### API Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `cogtics_api_request_duration_seconds` | Histogram | method, route, status | Request latency |
| `cogtics_api_requests_total` | Counter | method, route, status | Total requests |
| `cogtics_api_errors_total` | Counter | method, route, status | Error count |

### Worker Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `cogtics_job_duration_seconds` | Histogram | job_type, status | Job processing time |
| `cogtics_job_total` | Counter | job_type, status | Total jobs processed |
| `cogtics_job_failures_total` | Counter | job_type | Failed jobs |
| `cogtics_job_retries_total` | Counter | job_type | Job retries |
| `cogtics_queue_depth` | Gauge | queue_name | Current queue size |

### Business Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `cogtics_snapshot_duration_seconds` | Histogram | status | Snapshot creation time |
| `cogtics_snapshots_total` | Counter | status | Snapshots created |
| `cogtics_detection_issues_total` | Counter | severity, category | Issues detected |
| `cogtics_export_size_bytes` | Histogram | export_type | Export file sizes |
| `cogtics_dlq_entries_total` | Counter | queue_name, job_type | Jobs sent to DLQ |

## Log Correlation

All logs include trace context for correlation:

```json
{
  "level": "info",
  "message": "Processing request",
  "trace_id": "abc123...",
  "span_id": "def456...",
  "service": "cogtics-api",
  "requestId": "req_xyz"
}
```

To find logs for a specific trace:
1. Open Grafana → Explore → Loki
2. Query: `{service_name="cogtics-api"} |= "trace_id=YOUR_TRACE_ID"`

## Dashboards

### API Health Dashboard
- Request rate and throughput
- Latency percentiles (p50, p95, p99)
- Error rate
- Top endpoints by traffic

### Worker Health Dashboard
- Job throughput by type
- Queue depths
- Failure rates
- Processing time distribution
- DLQ entries

## Accessing the Stack

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3001 | admin/admin |
| Prometheus | http://localhost:9090 | - |
| Loki | http://localhost:3100 | - |
| Tempo | http://localhost:3200 | - |

## Enabling Telemetry

Set the following environment variables:

```bash
# Enable OpenTelemetry
OTEL_ENABLED=true

# OTel Collector endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Loki endpoint for logs
LOKI_URL=http://localhost:3100

# Prometheus metrics ports
PROMETHEUS_PORT=9464        # API
WORKER_PROMETHEUS_PORT=9465 # Worker
```

## Trace Sampling

By default, all requests are traced. For high-volume production:

```bash
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # Sample 10%
```

## SLO Targets

| SLO | Target | Measurement |
|-----|--------|-------------|
| API Availability | 99.9% | Non-5xx / total |
| Ingestion Success | 99% | Successful snapshots / total |
| Detection Latency | < 2h | Time to detect after snapshot |
| Export Latency | < 10m | Time to generate export |
| Job Success Rate | 95% | Successful jobs / total |

## Alert Rules

Critical alerts are configured in Grafana:

1. **API Error Rate > 5%** (5 min window) - Critical
2. **Queue Backlog > 1000** (15 min) - Critical
3. **Job Failure Rate > 10%** (10 min) - Warning
4. **Snapshot Stalled > 4h** - Warning
5. **DLQ Depth > 0** - Info

## Troubleshooting

### No metrics appearing
1. Verify `OTEL_ENABLED=true`
2. Check OTel Collector is running: `docker compose ps otel-collector`
3. Check Prometheus targets: http://localhost:9090/targets

### No traces appearing
1. Verify Tempo is running: `docker compose ps tempo`
2. Check OTel Collector config exports to Tempo
3. Verify trace_id in application logs

### Logs not in Loki
1. Check pino-loki transport is configured
2. Verify LOKI_URL environment variable
3. Check Loki ingestion: http://localhost:3100/ready
