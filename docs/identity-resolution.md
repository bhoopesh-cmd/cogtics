# Identity Resolution

Phase 3 of the Cogtics platform provides automated identity resolution to merge customer records across multiple source systems (e.g., Stripe and Salesforce) into unified customer identities.

## Overview

Identity resolution addresses a common problem in revenue operations: the same customer may exist as separate records in different systems. This creates challenges for:

- **Revenue reporting**: Aggregating revenue across fragmented customer records
- **Contract analysis**: Understanding full customer relationships
- **Data quality**: Maintaining a single source of truth for customer data

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Identity Resolution Pipeline                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐ │
│  │ Blocking │───►│ Scoring  │───►│ Threshold │───►│ Output   │ │
│  │ Keys     │    │ Features │    │ Check     │    │ Decision │ │
│  └──────────┘    └──────────┘    └───────────┘    └──────────┘ │
│       │                                │                         │
│       ▼                                ▼                         │
│  Reduce O(n²)                    Auto-Merge (≥90)               │
│  comparisons                     Review (70-89)                  │
│                                  Skip (<70)                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Matching Rules

### Blocking Keys

Blocking keys reduce the computational complexity from O(n²) to approximately O(n) by only comparing customers that share a common attribute:

| Key Type | Description | Example |
|----------|-------------|---------|
| `domain` | Email domain extracted from customer email | `domain:acme.com` |
| `normalized_name` | First 3 chars + length of normalized company name | `name:acm_4` |
| `tax_id` | Tax identification number (digits only) | `tax:123456789` |
| `address` | Hash of normalized billing address | `addr:abc123` |

### Scoring Features

Each candidate pair is scored on multiple features:

| Feature | Weight | Description |
|---------|--------|-------------|
| `name_similarity` | 40% | Jaro-Winkler similarity of normalized names |
| `domain_match` | 25% | Boolean: email domains match exactly |
| `tax_id_match` | 20% | Boolean: tax IDs match exactly |
| `address_match` | 10% | Boolean: normalized addresses match |
| `external_id_overlap` | 5% | Boolean: same external ID across systems |

### Thresholds

Default thresholds (configurable per tenant):

- **Auto-Merge**: Score ≥ 90 → Automatically create unified identity
- **Review**: Score 70-89 → Queue for human review
- **Skip**: Score < 70 → No action taken

## Workflow

### 1. Trigger Resolution

Resolution can be triggered via:
- API: `POST /identity/trigger`
- After ingestion pipeline completes
- Manual trigger from UI

### 2. Candidate Generation

The worker process:
1. Loads all customers from the snapshot
2. Generates blocking keys for each customer
3. Finds pairs sharing at least one blocking key
4. Excludes suppressed pairs

### 3. Scoring

For each candidate pair:
1. Compute all match features
2. Calculate weighted score
3. Apply thresholds
4. Route to appropriate output

### 4. Human Review

Medium-confidence matches enter the review queue:
- Reviewers see side-by-side customer comparison
- Feature breakdown shows why the pair matched
- Actions: **Confirm** (merge), **Reject** (suppress)

### 5. Identity Output

Resolved identities contain:
- Primary customer (from preferred CRM)
- Member customers (linked records)
- Confidence score
- Resolution method (auto/manual)

## API Reference

### Summary

```
GET /identity/summary
```

Returns resolution statistics for the current snapshot.

**Response:**
```json
{
  "snapshotId": "snap_xxx",
  "runId": "irun_xxx",
  "runStatus": "completed",
  "stats": {
    "total_customers": 1500,
    "candidates_generated": 120,
    "auto_merged": 45,
    "queued_for_review": 30,
    "skipped": 45
  },
  "queue": {
    "pending": 25,
    "assigned": 3,
    "resolved": 2
  }
}
```

### Trigger Resolution

```
POST /identity/trigger
```

**Request:**
```json
{
  "snapshotId": "snap_xxx",
  "config": {
    "auto_merge_threshold": 90,
    "review_threshold": 70
  }
}
```

### Review Queue

```
GET /identity/queue
```

**Query Parameters:**
- `status`: Filter by status (pending, assigned, resolved)
- `limit`: Max results (default 50)
- `offset`: Pagination offset

### Submit Decision

```
POST /identity/decisions
```

**Request:**
```json
{
  "taskId": "itask_xxx",
  "decision": "confirm",
  "notes": "Verified via LinkedIn"
}
```

### Resolved Identities

```
GET /identity/resolved
```

Returns list of unified customer identities.

```
GET /identity/resolved/:identityId
```

Returns identity detail with all member records.

## Configuration

### Tenant Settings

```typescript
interface IdentityConfig {
  auto_merge_threshold: number;  // 0-100, default 90
  review_threshold: number;       // 0-100, default 70
  primary_crm_source?: string;    // 'salesforce' | 'stripe' | 'hubspot'
  blocking_keys: string[];        // ['domain', 'normalized_name']
  scoring_weights?: {
    name_similarity: number;      // default 40
    domain_match: number;         // default 25
    tax_id_match: number;        // default 20
    address_match: number;        // default 10
    external_id_overlap: number;  // default 5
  };
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `IDENTITY_AUTO_MERGE_THRESHOLD` | Auto-merge score threshold | 90 |
| `IDENTITY_REVIEW_THRESHOLD` | Review queue score threshold | 70 |

## Database Tables

### identity_runs
Tracks resolution pipeline executions.

### customer_identities
Merged identity groups.

### customer_identity_members
Individual customers within an identity.

### identity_candidates
Potential match pairs with scores.

### identity_tasks
Human review queue items.

### identity_decisions
Recorded reviewer decisions.

### identity_suppressions
Permanently blocked pairs (from rejections).

## Troubleshooting

### High False Positive Rate

If too many non-matches are being auto-merged:
1. Increase `auto_merge_threshold` (e.g., 95)
2. Review scoring weights
3. Add more blocking keys for precision

### Missing Matches

If known duplicates aren't being found:
1. Check if blocking keys are too restrictive
2. Lower `review_threshold` to catch edge cases
3. Verify source data quality (names, emails)

### Performance Issues

For large customer datasets (>100k):
1. Add appropriate database indexes
2. Increase worker concurrency
3. Consider batch processing by connection

## Best Practices

1. **Start Conservative**: Begin with high thresholds and lower as you gain confidence
2. **Review Regularly**: Check the review queue daily during initial deployment
3. **Document Decisions**: Use notes field to explain non-obvious confirmations/rejections
4. **Monitor Suppressions**: Periodically review suppressions to catch errors
5. **Source Priority**: Configure `primary_crm_source` to prefer your authoritative system
