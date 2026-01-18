# Evidence Packs (Phase 8)

This document describes the Evidence Generation system in Cogtics, which creates immutable, audit-grade evidence packs for every detected issue.

## Overview

Evidence packs provide comprehensive documentation for each billing or revenue recognition issue detected by the Cogtics Detection Engine. They link:

- Source records (contracts, invoices, payments)
- Calculation steps with reproducible formulas
- Contract clause excerpts
- Snapshot metadata for determinism

## Architecture

```
Detection Run → Issues → Evidence Generation → Evidence Pack
                  ↓              ↓
            Issue Sources    Evidence Records
                             (sources, calculations, clauses, audit)
```

### Key Tables

| Table | Purpose |
|-------|---------|
| `issue_evidence` | Primary evidence pack metadata |
| `issue_evidence_sources` | Links to source records |
| `issue_evidence_calculations` | Reproducible calculation steps |
| `issue_evidence_clauses` | Contract clause excerpts |
| `issue_evidence_audit` | Generation audit trail |
| `evidence_generation_runs` | Batch generation tracking |

## Evidence Pack Structure

Each evidence pack contains:

```typescript
interface EvidencePack {
  summary: string;              // Human-readable description
  expected: Record<string, any>; // Expected values from contract
  actual: Record<string, any>;   // Observed values from invoice
  variance: {
    amount: number | null;
    percentage: number | null;
    direction: 'over' | 'under' | 'none';
    description: string;
  };
  calculations: CalculationStep[];  // Reproducible calc chain
  contractClauses: ClauseExcerpt[]; // Clause text + offsets
  sourceRecords: SourceReference[]; // IDs + system refs
  snapshotMetadata: {
    snapshotId: string;
    snapshotDate: string;
    rulesetVersion: string;
    ruleId: string;
    ruleVersion: string;
    detectionRunId?: string;
  };
}
```

## Completeness Scoring

Evidence completeness is scored from 0 to 1 based on four weighted components:

| Component | Weight | Description |
|-----------|--------|-------------|
| `source_coverage` | 30% | Percentage of expected sources present |
| `contract_ready` | 25% | Contract readiness confidence score |
| `calculation_reproducible` | 25% | All calculation inputs available |
| `clause_linked` | 20% | Relevant clauses attached |

### Thresholds

| Score | Label | UI Badge |
|-------|-------|----------|
| ≥ 0.9 | Complete | Green |
| ≥ 0.7 | Partial | Yellow |
| < 0.7 | Incomplete | Red |

## API Endpoints

### Get Evidence Pack

```
GET /issues/:id/evidence
```

Query parameters:
- `includeCalculations` (boolean): Include calculation steps
- `includeClauses` (boolean): Include contract clauses
- `includeSources` (boolean): Include source records
- `includeAudit` (boolean): Include audit trail

Response:
```json
{
  "evidence": { ... },
  "sources": [ ... ],
  "calculations": [ ... ],
  "clauses": [ ... ],
  "audit": [ ... ],
  "downloadUrl": "https://..."
}
```

### Get Evidence Summary

```
GET /issues/:id/evidence/summary
```

Returns lightweight summary without full data.

### Get Download URL

```
GET /issues/:id/evidence/download
```

Returns pre-signed S3 URL for large artifacts.

### Regenerate Evidence

```
POST /issues/:id/evidence/regenerate
```

Body:
```json
{
  "force": true,
  "reason": "Manual regeneration for audit review"
}
```

## Calculation Recording

Rules record calculation steps for reproducibility:

```typescript
const recorder = createCalculationRecorder('R002', '1.0.0');

// Record expected amount
recorder.recordExpected(
  'expected_monthly',
  'arr / 12',
  { arr: 120000 },
  10000
);

// Record variance
recorder.recordVariance('billing_variance', 10000, 8500);

// Get all steps for evidence
const steps = recorder.getSteps();
```

### Available Recording Methods

- `record()` - Generic calculation
- `recordExpected()` - Expected value calculation
- `recordActual()` - Actual value calculation
- `recordVariance()` - Variance calculation
- `recordProration()` - Prorated amount
- `recordDiscount()` - Discount application
- `recordFxConversion()` - Currency conversion

## Regeneration Behavior

Evidence regeneration:

1. Creates new version (never overwrites)
2. Records previous version in audit trail
3. Preserves original for comparison
4. Updates latest evidence pointer

### Triggers

| Trigger | Type | Description |
|---------|------|-------------|
| Detection run | `detection_run` | Automatic after detection |
| API call | `manual` | Admin triggers regeneration |
| Scheduled | `scheduled` | Periodic refresh (future) |

## Storage Integration

Large artifacts are offloaded to S3/MinIO:

```
tenants/{tenant_id}/evidence/{snapshot_id}/{issue_id}/
  ├── pack_v{version}.json       # Full evidence pack
  ├── calculations_v{version}.csv # Calculation export
  └── clauses_v{version}.pdf     # Clause snippets
```

### Upload Criteria

- JSON > 100KB → Upload to S3
- Full text > 10KB → Truncate, store full in S3

## Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Issue with no sources | Minimal evidence, 0.3 completeness cap |
| Contract missing | Evidence without clause/term data |
| Invoice orphan | Source-only evidence |
| Very large evidence | S3 offload, chunked storage |
| Detection run still running | Wait or skip evidence generation |
| Regeneration during active gen | Queue and deduplicate by issue_id |
| Source deleted after detection | Graceful null handling, flag stale |
| Snapshot archived | Read-only evidence, no regeneration |
| 10K+ issues per snapshot | Batch processing with parallelism |
| Missing exchange rate | Use 1.0 or contract rate, flag |
| Multiple contract versions | Use version at detection time |
| Clause extraction incomplete | Skip clause evidence, log warning |

## Frontend Integration

The `EvidencePanel` component displays evidence in the Issue Detail page:

- Completeness badge with score
- Collapsible sections for:
  - Summary with variance analysis
  - Calculation steps (expandable)
  - Contract clause excerpts
  - Source records table
- Download button for full pack
- Regenerate button (admin only)

## Testing

### Unit Tests

Located in `packages/rules/src/__tests__/evidence.test.ts`:
- Calculation recording
- Completeness scoring
- Utility functions

### Integration Tests

Located in `apps/api/tests/integration/evidence.test.ts`:
- API endpoint responses
- Query parameter handling
- Error cases

### Smoke Tests

Located in `apps/api/tests/smoke/evidence.smoke.ts`:
- Full detection → evidence cycle
- Performance under load (100+ issues)
- Concurrent regeneration safety
- Data integrity (cascading deletes)

## Running Migrations

```bash
# Via Docker (recommended)
docker compose -f docker/docker-compose.yml exec postgres psql -U cogtics -d cogtics -f /migrations/010_evidence_tables.up.sql

# Or via dbmate
cd packages/db && dbmate up
```

## Configuration

Evidence generation is configured per-tenant via `detection_configs`:

```typescript
{
  thresholds: {
    minCompletenessForReady: 0.7,
    clauseRelevanceThreshold: 0.5,
  },
  storage: {
    offloadThresholdKb: 100,
    maxClauseExcerptLength: 10000,
  },
}
```
