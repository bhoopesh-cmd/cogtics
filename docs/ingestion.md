# Ingestion Pipeline

This document describes the Cogtics ingestion pipeline that transforms raw connector data into canonical tables.

## Overview

The ingestion pipeline is a 4-stage process that:
1. Downloads raw data batches from S3/MinIO
2. Normalizes provider-specific formats to canonical schemas
3. Upserts normalized records to canonical tables
4. Finalizes the snapshot with quality checks

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Load     │────▶│  Normalize  │────▶│   Upsert    │────▶│  Finalize   │
│             │     │             │     │             │     │             │
│ S3 → Staging│     │ Raw → Mapped│     │ → Canonical │     │ Checks &    │
│             │     │             │     │   Tables    │     │ Complete    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

## Pipeline Stages

### Stage 1: Load (`ingest.load`)

**Purpose**: Download raw batches from S3 and insert into staging table.

**Input**:
- `tenantId`: Tenant identifier
- `snapshotId`: Target snapshot ID
- `batchIds`: Array of raw batch IDs to process
- `connectionId`: Source connection ID

**Process**:
1. Fetch batch metadata from `raw_batches` table
2. Download JSONL content from S3 using batch's `s3_key`
3. Parse JSONL lines and extract external IDs
4. Insert records into `staging_records` with status `pending`
5. Use `ON CONFLICT DO NOTHING` for idempotency

**Output**:
- `staging_records` populated with raw JSON
- `sync_runs` entry with `run_type: 'load'`

### Stage 2: Normalize (`ingest.normalize`)

**Purpose**: Transform raw provider data to canonical format using mapper functions.

**Input**:
- `tenantId`: Tenant identifier
- `snapshotId`: Target snapshot ID

**Process**:
1. Query `staging_records` with status `pending`
2. Group by `object_type` and route to appropriate mapper:
   - `stripe-customers` → `mapStripeCustomer`
   - `stripe-invoices` → `mapStripeInvoice`
   - `salesforce-Account` → `mapSalesforceCustomer`
3. Validate output with Zod schemas
4. Update `staging_records.raw_json` with normalized data
5. Set status to `normalized` (or `failed` with error message)

**Mapper Functions**:
Located in `packages/connectors/src/{provider}/mappers.ts`:
- `mapStripeCustomer`, `mapStripeInvoice`, `mapStripePayment`
- `mapSalesforceCustomer`, `mapSalesforceContract`

**Output**:
- `staging_records` updated with normalized JSON
- `sync_runs` entry with `run_type: 'normalize'`

### Stage 3: Upsert (`ingest.upsert`)

**Purpose**: Write normalized records to canonical tables.

**Input**:
- `tenantId`: Tenant identifier
- `snapshotId`: Target snapshot ID

**Process**:
1. Query `staging_records` with status `normalized`
2. Process entities in dependency order:
   - Customers first (no foreign keys)
   - Products
   - Contracts (depends on customers)
   - Invoices (depends on customers, contracts)
   - Payments (depends on invoices, customers)
3. Map normalized JSON to canonical table columns
4. Insert with `ON CONFLICT DO NOTHING` on unique constraints
5. Handle foreign key lookups (e.g., find `customer_id` by `external_id`)

**Canonical Tables**:
- `customers`: Customer records
- `contracts`: Contract/subscription records
- `invoices`: Invoice headers
- `invoice_lines`: Invoice line items
- `products`: Product catalog
- `price_plans`: Pricing information
- `payments`: Payment transactions

**Output**:
- Canonical tables populated with snapshot-scoped data
- `sync_runs` entry with `run_type: 'upsert'`

### Stage 4: Finalize (`ingest.finalize`)

**Purpose**: Mark snapshot complete and run quality checks.

**Input**:
- `tenantId`: Tenant identifier
- `snapshotId`: Target snapshot ID

**Process**:
1. Compute record counts for each canonical table
2. Run data quality checks:
   - Required fields populated
   - No negative amounts where invalid
   - Referential integrity (e.g., invoices have valid customers)
   - Duplicate detection
3. Store quality results in `snapshots.quality_results`
4. Update `snapshots.status` to `complete` or `failed`
5. Set `snapshots.completed_at` timestamp

**Quality Checks**:
| Check Name | Description | Severity |
|------------|-------------|----------|
| `required_fields` | Critical fields are populated | Error |
| `valid_amounts` | No invalid negative values | Error |
| `referential_integrity` | Foreign keys resolve | Warning |
| `duplicates` | No duplicate external IDs | Warning |

**Output**:
- Snapshot marked complete with metadata
- `sync_runs` entry with `run_type: 'finalize'`

## Idempotency Guarantees

The pipeline is designed to be safely re-run:

1. **Load Stage**: Uses `ON CONFLICT (snapshot_id, object_type, external_id) DO NOTHING`
2. **Normalize Stage**: Skips already-normalized records
3. **Upsert Stage**: Uses `ON CONFLICT DO NOTHING` on canonical tables
4. **Finalize Stage**: Can be re-run to recalculate counts

## Error Handling

### Stage-Level Errors
Each stage tracks success/failure in `sync_runs`:
- `status: 'completed'` or `status: 'failed'`
- `error_code` and `error_message` for failures

### Record-Level Errors
Individual records can fail without failing the stage:
- `staging_records.status = 'failed'`
- `staging_records.error_message` contains details

### Retry Safety
- All stages use database transactions
- Partial progress is preserved on failure
- Re-running resumes from where it left off

## Monitoring

### API Endpoints

```
GET /ingestion/status/:snapshotId  - Current pipeline stage and progress
GET /ingestion/runs/:snapshotId    - All sync runs for snapshot
GET /ingestion/staging/:snapshotId/stats - Staging record counts
GET /ingestion/active              - Currently running ingestions
```

### Key Metrics
- Records loaded per batch
- Normalization success/failure rate
- Canonical records created per type
- Pipeline duration per stage
- Quality check pass/fail rates

## Configuration

Environment variables:
```
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=cogtics
S3_REGION=us-east-1
```

## Troubleshooting

### Common Issues

**Batch not found in S3**:
- Check `raw_batches.s3_key` matches actual S3 object
- Verify MinIO/S3 credentials

**Normalization failures**:
- Check `staging_records.error_message`
- Verify mapper handles all fields in raw data
- Check Zod schema matches normalized output

**Upsert conflicts**:
- Verify unique constraints on canonical tables
- Check for duplicate external IDs in source data

**Quality check failures**:
- Review `snapshots.quality_results` for details
- Address data issues in source system or mappers
