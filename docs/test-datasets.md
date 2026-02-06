# Test Datasets and Fixtures

This document maps synthetic datasets to test phases and describes expected contents.

## Primary Functional Dataset

Path: `tools/synthetic-data/output/test_comprehensive`

Summary:
- size: minimal
- seed: 42
- tenants: 1
- snapshots: 1
- customers: 5
- contracts: 10
- invoices: 54
- obligations: 16
- schedules: 138
- usage_events: 2
- contract_terms: 10
- expected_issues: 120
- ai_test_cases: 58

Use for:
- Schema validation
- Detection correctness
- Small E2E flows

## Load/Scale Dataset

Path: `tools/synthetic-data/output/stress_test`

Summary:
- size: medium
- seed: 12345
- tenants: 2
- snapshots: 3
- customers: 600
- contracts: 2400
- invoices: 12386
- obligations: 4278
- schedules: 31302
- usage_events: 696
- contract_terms: 2400
- expected_issues: 15435
- ai_test_cases: 90

Use for:
- Performance and concurrency tests
- Multi-tenant isolation
- Snapshot drift scenarios

## Ground Truth and Expected Outputs

- `tools/synthetic-data/output/stress_test/expected_outputs/expected_issues.json`
- `tools/synthetic-data/output/stress_test/expected_outputs/ai_test_cases.json`
- `tools/synthetic-data/output/stress_test/expected_outputs/rule_coverage.json`

## Upload Fixtures

- Valid uploads: `tools/synthetic-data/output/stress_test/uploads/valid`
- Malformed uploads: `tools/synthetic-data/output/stress_test/uploads/malformed`

## Connector Fixtures

- `tools/synthetic-data/output/stress_test/connectors/*`

## Notes

- Generate additional datasets with `tools/synthetic-data/examples/generate_full_dataset.py`.
- Stress scenarios can be generated via `tools/synthetic-data/examples/generate_stress_test.py`.
