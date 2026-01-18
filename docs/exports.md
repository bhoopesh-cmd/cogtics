# Exports & Digests (Phase 10)

This document describes the exports and email digests system implemented in Phase 10.

## Overview

Phase 10 provides:
- **CSV Exports**: Snapshot-scoped data exports for issues, revenue recognition, and contracts
- **PDF Reports**: Formatted reports including audit bundles and executive summaries
- **Email Digests**: Scheduled email summaries delivered to configured recipients

All exports are immutable, snapshot-scoped, and audit-grade.

## Export Types

### CSV Exports

| Type | Description | Columns |
|------|-------------|---------|
| `issues_csv` | Detected issues with severity and impact | id, severity, category, status, rule_id, confidence, impact_amount, etc. |
| `revrec_csv` | Revenue recognition schedules | contract_id, obligation_id, period_start/end, amounts, status |
| `contracts_csv` | Contract details with readiness scores | id, name, customer_id, status, dates, ARR, readiness |

### PDF Exports

| Type | Template | Description |
|------|----------|-------------|
| `audit_bundle_pdf` | `audit-bundle.hbs` | Full audit report with issues and evidence summaries |
| `executive_summary_pdf` | `executive-summary.hbs` | High-level metrics dashboard for executives |
| `contracts_pdf` | `contracts-report.hbs` | Contract readiness details |

## API Endpoints

### Exports

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/exports` | Request a new export |
| `GET` | `/exports` | List exports with filters |
| `GET` | `/exports/:id` | Get export details with files |
| `POST` | `/exports/:id/regenerate` | Re-run an export |
| `GET` | `/exports/:id/download` | Get signed download URL |
| `DELETE` | `/exports/:id` | Cancel or delete an export |

### Digests

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/digests` | Create a digest subscription |
| `GET` | `/digests` | List subscriptions |
| `GET` | `/digests/:id` | Get subscription details |
| `PATCH` | `/digests/:id` | Update subscription |
| `DELETE` | `/digests/:id` | Delete subscription |
| `GET` | `/digests/:id/runs` | List run history |
| `POST` | `/digests/:id/trigger` | Manually trigger a digest |

## Creating an Export

```typescript
// Request a CSV export
const response = await fetch('/exports', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    snapshotId: 'snap_abc123',
    exportType: 'issues_csv',
    options: {
      includeEvidence: false,
      dateRange: {
        start: '2024-01-01T00:00:00Z',
        end: '2024-12-31T23:59:59Z',
      },
    },
  }),
});

const { export: exportRecord, jobId } = await response.json();
// exportRecord.status will be 'pending'
```

## Downloading an Export

```typescript
// Get download URL for completed export
const response = await fetch(`/exports/${exportId}/download`);
const { downloadUrl, expiresAt, fileName } = await response.json();

// Open the signed URL to download
window.open(downloadUrl, '_blank');
```

## Digest Subscriptions

### Creating a Subscription

```typescript
const response = await fetch('/digests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Weekly Issues Summary',
    cadence: 'weekly',
    recipients: ['cfo@company.com', 'finance@company.com'],
    scope: {
      issuesSeverity: ['high', 'critical'],
      includeResolved: false,
      includeSimulationDeltas: true,
      deltaThreshold: 1000,
    },
  }),
});
```

### Cadence Options

- `daily`: Sent every day at 6:00 AM UTC
- `weekly`: Sent every Monday at 6:00 AM UTC
- `monthly`: Sent on the 1st of each month at 6:00 AM UTC

## Digest Content

Each digest includes:

- **Issues Summary**: New issues, resolved issues, total open
- **By Severity**: Breakdown of issues by severity level
- **By Category**: Breakdown of issues by category
- **High Impact Items**: Top 5 critical/high severity issues
- **Simulation Deltas**: Recent simulation results exceeding threshold

## Worker Jobs

### export.csv.generate

Processes CSV export requests:
1. Queries snapshot-scoped data
2. Streams rows to CSV format
3. Uploads to S3/MinIO
4. Creates export_files record with checksum

### export.pdf.render

Processes PDF export requests:
1. Gathers data for the template
2. Renders HTML using Handlebars
3. Converts to PDF using Puppeteer
4. Uploads to S3/MinIO

### digest.send

Processes scheduled digest deliveries:
1. Aggregates changes since last run
2. Builds digest content
3. Renders email HTML
4. Sends to all recipients

## Templates

PDF templates are located in `apps/worker/src/templates/`:

- `audit-bundle.hbs` - Issues with evidence summaries
- `executive-summary.hbs` - Key metrics dashboard
- `contracts-report.hbs` - Contract readiness details

### Template Variables

| Variable | Description |
|----------|-------------|
| `snapshotId` | Current snapshot ID |
| `generatedAt` | ISO timestamp of generation |
| `snapshot` | Snapshot metadata |
| `issues` | Array of issue objects (audit-bundle) |
| `issuesSummary` | Aggregated issue statistics |
| `metrics` | High-level metrics (executive-summary) |
| `contracts` | Array of contract objects (contracts-report) |

## Security

### Access Control
- Export creation requires `admin` or `cfo` role
- Downloads generate signed URLs with 5-minute TTL
- All actions are tenant-scoped via RLS

### Audit Logging
Every export action is logged:
- `requested` - Export created
- `started` - Processing began
- `completed` - Successfully generated
- `failed` - Generation failed
- `downloaded` - File accessed
- `regenerated` - Re-run requested
- `cancelled` - Export cancelled
- `deleted` - Export removed

## Database Tables

### Export Tables
- `exports` - Export requests and status
- `export_files` - Generated files with S3 keys
- `export_items` - Traceability records
- `export_schedules` - Scheduled export configs
- `export_runs` - Schedule execution history
- `export_audit` - Action audit log

### Digest Tables
- `digest_subscriptions` - Email subscription configs
- `digest_runs` - Delivery history and content

## Troubleshooting

### Export Stuck in Processing

Check worker logs for errors:
```bash
docker compose logs worker | grep "export.csv.generate"
```

Regenerate if needed:
```bash
curl -X POST /exports/{id}/regenerate
```

### Digest Not Sending

1. Verify subscription is active
2. Check digest_runs for error messages
3. Verify SMTP configuration in production
4. In development, emails are logged to console

### PDF Generation Fails

Ensure Puppeteer dependencies are installed:
```bash
apt-get install -y chromium-browser
```

Or use the Dockerfile with Chrome pre-installed.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MINIO_ENDPOINT` | S3/MinIO endpoint | `http://localhost:9000` |
| `MINIO_BUCKET` | Storage bucket | `cogtics-uploads` |
| `SMTP_HOST` | Email server host | `localhost` |
| `SMTP_PORT` | Email server port | `587` |
| `EMAIL_FROM` | Sender address | `noreply@cogtics.io` |
| `APP_URL` | Application URL for links | `https://app.cogtics.io` |
