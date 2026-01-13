# Revenue Recognition Engine (Phase 6)

## Overview

The Cogtics Revenue Recognition Engine implements ASC 606-compliant revenue recognition, providing automated identification of performance obligations, transaction price allocation, revenue schedule generation, and reconciliation with billing.

## ASC 606 Five-Step Model

The engine follows the ASC 606 five-step model:

1. **Identify the Contract** - Contracts are ingested from source systems (Phase 1-2)
2. **Identify Performance Obligations** - The engine analyzes contract terms to identify distinct performance obligations
3. **Determine Transaction Price** - Extracted from contract value terms or ARR
4. **Allocate Transaction Price** - Distributed to obligations using SSP, residual, or straight-line methods
5. **Recognize Revenue** - Generated schedules determine when revenue is recognized

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│  Contracts (P2/P5)  │────▶│  RevRec Engine      │
│  Contract Terms     │     │  (packages/revrec)  │
└─────────────────────┘     └──────────┬──────────┘
                                       │
                            ┌──────────┴──────────┐
                            ▼                     ▼
                    ┌───────────────┐    ┌───────────────┐
                    │  Obligations  │    │   Schedules   │
                    │  Allocations  │    │    Events     │
                    │               │    │   Balances    │
                    └───────────────┘    └───────────────┘
                                       │
                            ┌──────────┴──────────┐
                            ▼                     ▼
                    ┌───────────────┐    ┌───────────────┐
                    │   Invoices    │────│ Reconciliation│
                    │   (Phase 2)   │    │               │
                    └───────────────┘    └───────────────┘
```

## Components

### Database Schema

Located in `packages/db/migrations/008_revenue_recognition.up.sql`:

| Table | Description |
|-------|-------------|
| `revenue_obligations` | Performance obligations identified from contracts |
| `revenue_allocations` | Transaction price allocations to obligations |
| `revenue_schedules` | Recognition schedules by period |
| `recognition_events` | Individual recognition events |
| `deferred_revenue_balances` | Period-end deferred revenue tracking |
| `revrec_reconciliations` | Reconciliation results |

### RevRec Engine Package

Located in `packages/revrec/`:

```typescript
import * as revrec from '@cogtics/revrec';

// Identify obligations from contract
const obligations = revrec.identifyObligations(contract);

// Allocate transaction prices
const allocations = revrec.allocatePrices(obligations, totalPrice);

// Generate schedules
const schedules = revrec.generateSchedule(obligation, allocation);

// Create recognition events
const events = revrec.createRecognitionEvents(schedules);

// Compute deferred balances
const balances = revrec.computeDeferredBalances(schedules, events, totalPrice);

// Reconcile with invoices
const result = revrec.reconcileSchedulesWithInvoices(schedules, invoices, contractId);
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/revrec/summary` | Get rev-rec summary for snapshot |
| GET | `/revrec/obligations` | List performance obligations |
| GET | `/revrec/obligations/:id` | Get obligation with schedules |
| GET | `/revrec/schedules` | List recognition schedules |
| GET | `/revrec/reconciliations` | List reconciliation results |
| POST | `/revrec/compute` | Trigger rev-rec computation |
| POST | `/revrec/reconcile` | Trigger reconciliation |

### Worker Jobs

| Queue | Description |
|-------|-------------|
| `revrec.compute` | Computes obligations, allocations, schedules |
| `revrec.reconcile` | Reconciles schedules with invoices |

## Obligation Types

| Type | Description | Recognition Method |
|------|-------------|-------------------|
| `subscription` | Recurring subscription services | Straight-line |
| `usage` | Usage-based services | Usage-based |
| `one_time` | One-time fees (setup, etc.) | As-invoiced |
| `professional_services` | Implementation, consulting | Milestone |
| `support` | Support and maintenance | Straight-line |

## Allocation Methods

### SSP (Standalone Selling Price)

Used when all obligations have known SSP. Allocates proportionally:

```
Allocated Amount = (Obligation SSP / Total SSP) × Transaction Price
```

### Residual

Used when some obligations have unknown SSP:

1. Allocate known SSPs first
2. Distribute remainder to obligations without SSP

### Straight-Line

Equal allocation when no SSP data available:

```
Allocated Amount = Transaction Price / Number of Obligations
```

## Schedule Generation

### Straight-Line

Revenue recognized evenly over service period:

```
Daily Rate = Total Amount / Total Days
Period Amount = Daily Rate × Period Days
```

Handles:
- Partial first/last periods (pro-rata)
- Leap years
- Multi-year contracts

### Usage-Based

Placeholder schedules created; actual recognition via usage events.

### Milestone

Single schedule period; recognition upon milestone completion.

### As-Invoiced

Immediate recognition at service start date.

## Reconciliation

Compares recognition schedules against invoices per period:

| Status | Condition |
|--------|-----------|
| `matched` | Schedule and invoice amounts match (within threshold) |
| `timing_variance` | Amounts similar but dates differ |
| `amount_variance` | Amounts differ beyond threshold |
| `missing_invoice` | Schedule exists but no invoice found |
| `unmatched` | Invoice exists but no schedule found |

### Thresholds

Default thresholds (configurable):
- Amount variance: $100 or 1%
- Timing variance: 30 days

## Usage

### Trigger Computation

```bash
# Via API
curl -X POST /revrec/compute \
  -H "Content-Type: application/json" \
  -d '{"snapshotId": "snap_123", "forceRecompute": true}'

# Computes for all contracts in snapshot
```

### Trigger Reconciliation

```bash
curl -X POST /revrec/reconcile \
  -H "Content-Type: application/json" \
  -d '{
    "snapshotId": "snap_123",
    "periodStart": "2024-01-01",
    "periodEnd": "2024-12-31"
  }'
```

### View Results

```bash
# Summary
curl /revrec/summary?snapshotId=snap_123

# Obligations
curl /revrec/obligations?snapshotId=snap_123

# Schedules
curl /revrec/schedules?periodStart=2024-01-01&periodEnd=2024-03-31

# Reconciliations
curl /revrec/reconciliations?status=amount_variance
```

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Contract with no terms | Creates single subscription obligation from ARR |
| Contract with $0 value | Skipped - no obligations created |
| Missing start/end dates | Uses contract dates or snapshot date |
| End date before start | Error with descriptive message |
| Partial periods | Pro-rata daily calculation |
| Leap year February | Uses actual days (28 or 29) |
| Multi-year contracts | All periods generated up to end date |
| Contract amendments | Old obligation marked as amended |
| Duplicate compute | Idempotent via snapshot + contract ID |

## Frontend

Access the Rev-Rec dashboard at `/revrec`:

- **Summary Tab**: KPIs, reconciliation status, progress bar
- **Obligations Tab**: List with drill-down to schedules/events
- **Schedules Tab**: Monthly/quarterly view with filters
- **Reconciliations Tab**: Status breakdown with variance details

## Testing

### Unit Tests

```bash
pnpm test packages/revrec
```

Tests cover:
- Obligation identification
- Price allocation algorithms
- Schedule generation
- Recognition events
- Deferred balance calculations
- Reconciliation logic

### Integration Tests

```bash
DATABASE_URL=... pnpm test apps/api/tests/integration/revrec.test.ts
```

Tests cover:
- Full computation pipeline
- Schedule persistence
- Reconciliation with invoices
- Edge cases (zero value, no terms)

### Smoke Tests

```bash
pnpm test apps/api/tests/smoke/phase6.test.ts
```

Verifies all exports and basic functionality.

## Troubleshooting

### No obligations created

Check:
1. Contract has ARR > 0 or contract_value term
2. Contract has valid start/end dates
3. Contract exists in the specified snapshot

### Schedules don't sum to total

Check:
1. Rounding in daily rate calculations
2. Partial period handling

### Reconciliation shows all unmatched

Check:
1. Invoices have correct `contract_id` reference
2. Invoice dates fall within specified period
3. Invoice `period_start`/`period_end` align with schedules

## Performance Considerations

- Computation is batched per contract
- Large contracts (100+ schedules) may take several seconds
- Reconciliation scales with invoice count
- Consider running during off-peak hours for full snapshot computation
