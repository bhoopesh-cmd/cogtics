# Simulation Engine Documentation

## Overview

The Simulation Engine (Phase 9) enables users to test revenue strategies on snapshot data without modifying source records. Simulations apply parameter overrides to compute delta impacts on revenue, recognition schedules, and contract terms.

## Key Concepts

### Simulation

A simulation represents a set of parameter overrides applied to a specific snapshot. Simulations go through the following lifecycle:

- **draft**: Initial state, overrides can be added/removed
- **pending**: Queued for execution
- **running**: Currently being processed
- **completed**: Execution finished successfully
- **failed**: Execution failed
- **cancelled**: Cancelled by user

### Overrides

Overrides are parameter changes applied to snapshot data. Each override targets a specific entity and field.

#### Override Types

| Type | Description | Target Types |
|------|-------------|--------------|
| `contract_term` | Change ARR, dates, billing frequency | contract |
| `price_change` | Apply percentage or absolute price changes | contract, obligation, line_item |
| `discount_change` | Apply or modify discounts | contract, invoice, line_item |
| `timing_shift` | Shift recognition dates | contract, obligation |
| `billing_adjustment` | Adjust invoice amounts | invoice, line_item |
| `usage_adjustment` | Add or modify usage events | contract |

### Runs

Each execution of a simulation creates an immutable run record. Multiple runs can exist for a single simulation, allowing comparison of results across different engine versions or after override changes.

### Deltas

Deltas represent the computed differences between baseline and simulated values. Delta types include:

- `revenue_total`: Overall revenue impact
- `revenue_period`: Period-by-period revenue changes
- `recognized_shift`: Changes to recognized revenue timing
- `deferred_shift`: Changes to deferred revenue timing
- `contract_impact`: Individual contract value changes
- `obligation_impact`: Individual obligation value changes

### Templates

Templates are reusable sets of overrides that can be applied to new simulations. They enable consistent scenario testing across multiple snapshots.

## API Endpoints

### Simulations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/simulations` | GET | List simulations |
| `/simulations` | POST | Create new simulation |
| `/simulations/:id` | GET | Get simulation details |
| `/simulations/:id` | PATCH | Update draft simulation |
| `/simulations/:id` | DELETE | Delete simulation |

### Overrides

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/simulations/:id/overrides` | GET | List overrides |
| `/simulations/:id/overrides` | POST | Add override |
| `/simulations/:id/overrides/:overrideId` | DELETE | Remove override |

### Runs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/simulations/:id/run` | POST | Execute simulation |
| `/simulations/:id/runs` | GET | List runs |
| `/simulations/:id/runs/:runId/results` | GET | Get run results |
| `/simulations/:id/runs/:runId/deltas` | GET | Get run deltas |

### Templates

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/simulations/templates` | GET | List templates |
| `/simulations/templates` | POST | Create template |
| `/simulations/templates/:id` | GET | Get template |
| `/simulations/templates/:id/apply` | POST | Apply template |

## Usage Examples

### Create and Run a Simulation

```typescript
// 1. Create simulation
const sim = await createSimulation({
  snapshotId: 'snap_abc123',
  name: 'Q1 Price Adjustment',
  description: 'Test 10% price increase impact',
});

// 2. Add price change override
await addSimulationOverride(sim.id, {
  overrideType: 'price_change',
  targetType: 'contract',
  targetId: 'ctr_xyz789',
  overrideValue: { pricePct: 10 },
});

// 3. Add timing shift
await addSimulationOverride(sim.id, {
  overrideType: 'timing_shift',
  targetType: 'contract',
  targetId: 'ctr_xyz789',
  overrideValue: { shiftType: 'end_date', shiftDays: 90 },
  sequenceNumber: 1,
});

// 4. Run simulation
const { runId } = await runSimulation(sim.id, {
  recomputeRevRec: true,
});

// 5. Poll for completion and get results
const results = await getSimulationRunResults(sim.id, runId);
console.log('Revenue Delta:', results.totalRevenueDelta);
console.log('Contracts Affected:', results.contractsAffected);
```

### Create and Use a Template

```typescript
// Create template
const template = await createSimulationTemplate({
  name: 'Standard 10% Increase',
  description: 'Apply 10% increase to all contracts',
  overrides: [
    {
      overrideType: 'price_change',
      targetType: 'contract',
      targetId: 'ctr_*', // Placeholder
      overrideValue: { pricePct: 10 },
    },
  ],
});

// Apply to new simulation
const sim = await applySimulationTemplate(template.id, {
  snapshotId: 'snap_newmonth',
  name: 'March Price Increase Analysis',
});
```

## Override Value Structures

### Contract Term Override

```json
{
  "overrideType": "contract_term",
  "targetType": "contract",
  "targetId": "ctr_abc123",
  "fieldPath": "arr",
  "overrideValue": 150000
}
```

Valid field paths: `arr`, `discount_rate`, `billing_frequency`, `start_date`, `end_date`, `currency`, `name`

### Price Change Override

```json
{
  "overrideType": "price_change",
  "targetType": "contract",
  "targetId": "ctr_abc123",
  "overrideValue": {
    "pricePct": 10,      // Percentage change
    // OR
    "priceDelta": 5000,  // Absolute change
    // OR
    "newPrice": 130000   // Set exact value
  }
}
```

### Discount Change Override

```json
{
  "overrideType": "discount_change",
  "targetType": "contract",
  "targetId": "ctr_abc123",
  "overrideValue": {
    "discountPct": 15,     // Discount percentage (0-100)
    // OR
    "discountAmount": 5000 // Absolute discount
  }
}
```

### Timing Shift Override

```json
{
  "overrideType": "timing_shift",
  "targetType": "contract",
  "targetId": "ctr_abc123",
  "overrideValue": {
    "shiftType": "end_date",  // start_date, end_date, recognition_start, recognition_end
    "shiftDays": 90,          // Shift by days
    // OR
    "newDate": "2025-03-31"   // Set exact date
  }
}
```

### Billing Adjustment Override

```json
{
  "overrideType": "billing_adjustment",
  "targetType": "invoice",
  "targetId": "inv_abc123",
  "overrideValue": {
    "adjustmentType": "credit",  // credit, discount, fee, correction
    "adjustmentAmount": -500,    // Negative for credits
    // OR
    "adjustmentPct": -5          // Percentage adjustment
  }
}
```

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Override target not found | Skipped, warning added |
| Invalid override value | Validation error returned |
| Negative ARR | Validation error |
| Discount > 100% | Validation error |
| Date shift > 1 year | Warning added, override applied |
| Zero-value delta | Filtered from results (< $0.01) |
| Concurrent run request | 409 Conflict returned |
| Modify completed simulation | 400 Bad Request |

## Database Schema

The simulation engine uses these tables:

- `simulations`: Core simulation entity
- `simulation_overrides`: Parameter overrides
- `simulation_runs`: Execution history
- `simulation_results`: Aggregated results per run
- `simulation_deltas`: Granular delta records
- `simulation_templates`: Reusable override sets
- `simulation_audit`: Action audit trail

All tables include Row Level Security (RLS) for tenant isolation.

## Worker Jobs

| Queue | Description |
|-------|-------------|
| `simulation.run` | Execute simulation and compute results |
| `simulation.replay` | Re-run simulation with new engine |

## Best Practices

1. **Create drafts first**: Build and validate overrides before running
2. **Use templates**: Create templates for common scenarios to ensure consistency
3. **Review warnings**: Check simulation warnings before acting on results
4. **Compare runs**: Use multiple runs to compare different override combinations
5. **Keep overrides focused**: Apply minimal overrides to isolate impact
6. **Name descriptively**: Use clear names describing the scenario being tested
