# Phase 7: Detection Engine - Rule Catalog

## Overview

The Detection Engine is the core analytical component of Cogtics that automatically identifies discrepancies, compliance issues, and anomalies across contract, billing, and revenue data. It operates on a tiered execution model with 62 detection rules across 11 categories.

---

## Rule ID Allocation

To prevent ID conflicts when adding new rules, follow this allocation table:

| Range | Category | Count | Notes |
|-------|----------|-------|-------|
| R001-R010, R017-R018 | billing | 12 | Core billing vs contract rules |
| R011-R016 | discount | 6 | Discount and pricing rules |
| R020-R027 | revrec | 8 | Revenue recognition rules |
| R060-R064, R160-R161 | lifecycle | 7 | Contract lifecycle rules |
| R080-R083 | cross_snapshot | 4 | Cross-snapshot consistency |
| R100-R105 | data_quality | 6 | Data quality gates (Tier 0) |
| R110-R113 | credits | 4 | Credits and refunds |
| R120-R122 | tax_fees | 3 | Tax/fee rules |
| R130-R132 | fx_currency | 3 | FX and currency rules |
| R150-R154 | usage | 5 | Usage-based billing |
| R170-R173 | multi_entity | 4 | Multi-entity rules |

**Reserved ranges for future expansion:**
- R018-R019: Additional billing rules
- R028-R039: Additional rev-rec rules
- R065-R079: Additional lifecycle rules
- R084-R099: Additional cross-snapshot rules
- R114-R119: Additional credits rules
- R123-R129: Additional tax/fee rules
- R133-R149: Additional FX rules
- R155-R159: Additional usage rules
- R162-R169: Reserved
- R174-R199: Additional multi-entity rules

## Architecture

### Execution Flow

```
Snapshot Data → Preprocessor → Rule Registry → Runner → Deduplicator → Scorer → Issues
```

1. **Preprocessor**: Normalizes data, excludes tax/fees per config, handles FX conversions
2. **Rule Registry**: Manages all rules with tiered execution order
3. **Runner**: Executes rules in priority order, respects dependencies
4. **Deduplicator**: Removes exact duplicates, applies hierarchy suppression
5. **Scorer**: Adjusts severity/confidence based on meta-rules (R070-R072)

### Key Concepts

- **Issue Key**: Deterministic SHA256 hash based on rule ID, version, and dimensions for idempotency
- **Rule Hierarchy**: Prevents double-counting when specific rules explain generic issues
- **Data Quality Gating**: Tier 0 rules can cap confidence or skip downstream processing
- **Replay Support**: Re-run detection on historical snapshots for audit/comparison

---

## Tier 0: Data Quality Gates (6 rules)

| Rule ID | Name | Description | Severity |
|---------|------|-------------|----------|
| R100 | Stale Usage Feed | Usage data has not been updated within configured threshold | Medium |
| R101 | Stale CRM Feed | CRM/contract data is stale | Medium |
| R102 | Incomplete Snapshot | Snapshot completeness below threshold | High |
| R103 | Low Contract Readiness | Contract extraction confidence below threshold | Medium |
| R104 | Missing FX Rates | Required foreign exchange rates not available | High |
| R105 | Missing Master Data | Orphan product or customer references detected | Medium |

**Purpose**: Gate downstream detection when data quality is insufficient. May cap confidence scores.

---

## Tier 1: Billing vs Contract (12 rules)

| Rule ID | Name | Description | Severity |
|---------|------|-------------|----------|
| R001 | Missing Invoice | Expected billing period has no invoice | High |
| R002 | Underbilling | Invoiced amount less than contracted amount | High |
| R003 | Overbilling | Invoiced amount exceeds contracted amount | High |
| R004 | Wrong Unit Price | Invoice line unit price differs from contract | High |
| R005 | Wrong Quantity | Invoice line quantity differs from contract | High |
| R006 | Duplicate Billing | Same period/amount billed multiple times (includes adjacent/overlapping periods, invoice numbers) | Critical |
| R007 | Billing Outside Term | Invoice period outside contract term | High |
| R008 | Missing SKU | Invoice references unknown product | Medium |
| R009 | Currency Mismatch | Invoice currency differs from contract | Medium |
| R010 | Billing Frequency Mismatch | Invoices don't match contract frequency (interval-based) | Medium |
| R017 | Invoice Period Span Mismatch | Invoice service period length doesn't match billing frequency | Medium |
| R018 | Invoice Timing Variance | Invoice date significantly after expected billing date | Medium |

**Suppression**: R002/R003 are suppressed when R004/R005 fire (specific cause identified).

---

## Tier 2: Discounts and Pricing (6 rules)

| Rule ID | Name | Description | Severity |
|---------|------|-------------|----------|
| R011 | Expired Discount Applied | Discount applied after expiry date | High |
| R012 | Discount Not Applied | Active discount missing from invoice | High |
| R013 | Wrong Discount Rate | Applied rate differs from contracted rate | High |
| R014 | Discount Exceeds Max | Discount amount exceeds maximum cap | Medium |
| R015 | Annual Uplift Not Applied | Year-over-year price increase missing | Medium |
| R016 | Ramp Pricing Mismatch | Price doesn't match ramp schedule | High |

---

## Tier 3: Rev-Rec Mismatches (8 rules)

| Rule ID | Name | Description | Severity |
|---------|------|-------------|----------|
| R020 | Recognized/Invoiced Gap | Gap between recognized and invoiced revenue | High |
| R021 | Deferred Balance Imbalance | Opening + additions - recognized ≠ closing | Critical |
| R022 | Schedule Exceeds TCV | Total scheduled exceeds transaction price | Critical |
| R023 | Missing Schedule | Active obligation has no recognition schedule | High |
| R024 | Recognition Outside Service | Recognition in period outside service term | High |
| R025 | Premature Recognition | Revenue recognized for future periods | Critical |
| R026 | Allocation Sum Mismatch | Obligation allocations don't sum to TCV | High |
| R027 | SSP Outlier | Allocated price deviates from SSP range | Medium |

---

## Tier 4: Credits and Refunds (4 rules)

| Rule ID | Name | Description | Severity |
|---------|------|-------------|----------|
| R110 | Unmatched Credit Memo | Credit memo not linked to original invoice | Medium |
| R111 | Credit Exceeds Original | Credit amount greater than original invoice | High |
| R112 | Unreconciled Refund | Refund/chargeback without matching credit | High |
| R113 | Negative Net Revenue | Period net revenue negative due to credits | Critical |

---

## Tier 5: Usage-Based Billing (5 rules)

| Rule ID | Name | Description | Severity |
|---------|------|-------------|----------|
| R150 | Missing Usage Period | Usage-based contract has no usage for period | High |
| R151 | Late Usage Event | Usage processed significantly after event date | Medium |
| R152 | Usage Exceeds Cap | Usage quantity exceeds contract cap | High |
| R153 | Usage Outside Contract | Usage recorded outside contract term | High |
| R154 | Usage Rate Mismatch | Billed rate differs from contracted usage rate | High |

---

## Tier 6: Contract Lifecycle (7 rules)

| Rule ID | Name | Description | Severity |
|---------|------|-------------|----------|
| R060 | Unadjusted Billing After Amendment | Billing not reflecting contract amendment | High |
| R061 | Billing On Cancelled Contract | Invoice issued after cancellation | Critical |
| R062 | Billing On Expired Contract | Invoice issued after contract expiry | High |
| R063 | Contract Version Gap | Missing version in contract history | Medium |
| R064 | Unreflected Auto-Renewal | Auto-renewal not processed properly | High |
| R160 | Billing During Hold | Invoice issued during billing hold | High |
| R161 | Payment During Hold | Payment received during contract hold | Medium |

**Suppression**: R062 is suppressed by R061 (cancelled is more specific than expired).

---

## Tier 7: Multi-Entity / Parent-Child (4 rules)

| Rule ID | Name | Description | Severity |
|---------|------|-------------|----------|
| R170 | Bill-To vs Sold-To Mismatch | Invoice sent to wrong entity | Medium |
| R171 | Unreconciled Split Billing | Split billing amounts don't sum correctly | High |
| R172 | Missing Consolidated Breakdown | Consolidated invoice lacks subsidiary breakdown | Medium |
| R173 | Orphan Subsidiary Invoice | Subsidiary invoice without parent reference | Medium |

---

## Tier 8: Cross-Snapshot Consistency (4 rules)

| Rule ID | Name | Description | Severity |
|---------|------|-------------|----------|
| R080 | Issue Regression | Previously resolved issue reappeared | High |
| R081 | New Issue On Unchanged Data | New issue but underlying data unchanged | Medium |
| R082 | Value Change Without Amendment | Contract value changed without amendment | High |
| R083 | Snapshot Gap Detected | Missing snapshots in time series | Medium |

**Note**: These rules require `prior_snapshots` data to function.

---

## Tier 9: Tax/Fee Exclusion (3 rules)

| Rule ID | Name | Description | Severity |
|---------|------|-------------|----------|
| R120 | Unexpected Tax On Exempt | Tax charged to exempt customer | Medium |
| R121 | Tax Rate Mismatch | Applied tax rate differs from expected | Medium |
| R122 | Missing Expected Tax | Invoice for taxable customer/jurisdiction has no tax line | High |

---

## Tier 10: FX and Currency (3 rules)

| Rule ID | Name | Description | Severity |
|---------|------|-------------|----------|
| R130 | FX Rate Deviation | Applied rate differs from reference rate | Medium |
| R131 | Inconsistent Invoice FX | Invoice lines use different FX rates | High |
| R132 | Realized FX Gain/Loss | Significant realized FX impact | Medium |

---

## Meta-Rules (Scoring Logic)

These are not detection rules but scoring adjustments applied post-detection:

| Rule ID | Name | Description |
|---------|------|-------------|
| R070 | High-Value Contract Weight | Escalate severity for contracts above ARR threshold |
| R071 | Recurring Issue Escalation | Increase severity for repeatedly occurring issues |
| R072 | Multi-Rule Correlation | Escalate when multiple related rules fire |

---

## Configuration Policies

### FX Configuration
```typescript
{
  rateTolerancePct: 1,        // Allow 1% FX rate deviation
  useSnapshotDateRate: true,  // Use rate from snapshot date
  fallbackToLatest: true,     // Fall back to latest rate if missing
}
```

### Proration Configuration
```typescript
{
  method: 'daily',            // daily | monthly | actual_days
  roundingPrecision: 2,       // Decimal places
  toleranceDays: 3,           // Grace period for period boundaries
}
```

### Tax/Fees Configuration
```typescript
{
  excludeTaxFromComparison: true,  // Exclude tax when comparing amounts
  excludeFeesFromComparison: true, // Exclude fees when comparing amounts
  taxRateTolerance: 0.005,         // 0.5% tolerance for tax rate matching
}
```

### Thresholds
```typescript
{
  amountTolerancePct: 1,      // Amount variance tolerance
  amountToleranceAbs: 1,      // Absolute amount tolerance ($1)
  timingToleranceDays: 3,     // Timing variance tolerance
  impactThresholdUsd: 100,    // Minimum impact to report
  confidenceFloor: 0.5,       // Minimum confidence to report
  disabledRuleIds: [],        // Rules to skip
}
```

### Data Quality Gating
```typescript
{
  minSnapshotCompleteness: 0.9,  // 90% completeness required
  minContractReadiness: 0.8,     // 80% contract readiness required
  skipDownstreamOnGate: false,   // Continue detection even if gates fail
}
```

---

## Issue Lifecycle

Issues follow a state machine:

```
open → acknowledged → resolved
  ↓         ↓
dismissed ←─┘
```

- **open**: Newly detected, requires attention
- **acknowledged**: Reviewed, being worked on
- **resolved**: Issue has been fixed
- **dismissed**: False positive or accepted risk

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/issues` | GET | List issues with filters |
| `/issues/summary` | GET | Aggregate statistics |
| `/issues/:id` | GET | Issue details with sources |
| `/issues/:id/status` | POST | Update issue status |
| `/issues/bulk-status` | POST | Bulk status update |
| `/issues/detection-runs` | GET | List detection runs |
| `/issues/detection-runs` | POST | Trigger new detection |
| `/issues/detection-runs/:id` | GET | Run details with stats |
| `/issues/detection-runs/:id/replay` | POST | Replay with new ruleset |

---

## Best Practices

1. **Regular Snapshots**: Run detection on each new snapshot for continuous monitoring
2. **Address Data Quality First**: Resolve Tier 0 issues before investigating others
3. **Use Bulk Actions**: For systemic issues, use bulk acknowledge/dismiss
4. **Leverage Replay**: Test rule changes on historical data before deployment
5. **Configure Thresholds**: Tune tolerances to match your business requirements
6. **Review Suppressions**: Ensure hierarchy suppression matches your domain logic

---

## Extending the Engine

### Adding a New Rule

1. Create rule file in appropriate tier directory
2. Implement `Rule` interface with `run()` function
3. Register in tier's `index.ts` exports
4. Add to `allRules` in `rules/index.ts`
5. Write unit tests in `__tests__/`
6. Update this documentation

### Rule Implementation Example

```typescript
export const R999_ExampleRule: Rule = {
  id: 'R999',
  version: '1.0.0',
  name: 'Example Rule',
  description: 'Detects example condition',
  category: 'billing',
  tier: 'billing',
  severity: 'medium',
  priority: 99,
  requiresData: ['contracts', 'invoices'],
  suppressedBy: [],
  dependsOn: [],
  enabled: true,
  
  run: (ctx: RuleContext): RuleIssue[] => {
    const issues: RuleIssue[] = [];
    
    for (const contract of ctx.contracts) {
      // Detection logic here
      if (/* condition */) {
        issues.push({
          ruleId: 'R999',
          ruleVersion: '1.0.0',
          severity: 'medium',
          category: 'billing',
          expected: { /* expected values */ },
          actual: { /* actual values */ },
          dimensions: { contractId: contract.id },
          sources: [{ type: 'contract', id: contract.id }],
        });
      }
    }
    
    return issues;
  },
};
```
