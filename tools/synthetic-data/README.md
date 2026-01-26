# Synthetic Data Generator for Cogtics

A hybrid synthetic data generator that produces realistic test data for the Cogtics platform.

## Features

- **Rule-Based Core**: Revenue recognition and billing calculations ported from Cogtics TypeScript
- **CUAD Templates**: Real contract clause structures from the Contract Understanding Atticus Dataset
- **LLM Synthesis**: OpenAI-powered text generation for realistic variations
- **Faker Support**: IDs, timestamps, emails, and contact information
- **Multi-Format Export**: JSON, CSV, and PDF output

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Synthetic Data Generator                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ CUAD        │  │ Rule-Based  │  │ LLM Synthesis           │  │
│  │ Templates   │  │ Core        │  │ (OpenAI)                │  │
│  │             │  │             │  │                         │  │
│  │ Real clause │  │ RevRec      │  │ Contract text variation │  │
│  │ structures  │  │ Billing     │  │ Invoice descriptions    │  │
│  │             │  │ Schedules   │  │ CRM notes + messiness   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                           │                                      │
│                    ┌──────┴──────┐                               │
│                    │ Faker       │                               │
│                    │ IDs, dates  │                               │
│                    │ contacts    │                               │
│                    └─────────────┘                               │
│                           │                                      │
│              ┌────────────┼────────────┐                        │
│              ▼            ▼            ▼                        │
│         ┌───────┐    ┌───────┐    ┌───────┐                     │
│         │ JSON  │    │ CSV   │    │ PDF   │                     │
│         └───────┘    └───────┘    └───────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Setup

```bash
cd tools/synthetic-data

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure (Optional)

Copy the `.env` file from the repo root or create a symlink:

```bash
# The generator will automatically read from repo root .env
# Or you can copy it:
cp ../../.env .env
```

Required for LLM features:
```
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

### 3. Generate Data

```bash
# Small dataset (10 customers, 20 contracts)
python examples/generate_full_dataset.py --size small

# Medium dataset with LLM text generation
python examples/generate_full_dataset.py --size medium --use-llm

# Large dataset with PDFs
python examples/generate_full_dataset.py --size large --generate-pdfs
```

## Output

Generated data is saved to `output/`:

```
output/
├── data/
│   ├── contracts.json
│   ├── contracts.csv
│   ├── customers.json
│   ├── customers.csv
│   ├── invoices.json
│   ├── invoices.csv
│   ├── invoice_lines.csv
│   ├── revenue_obligations.csv
│   └── revenue_schedules.csv
├── contracts/
│   ├── con_abc123.pdf
│   └── ...
└── invoices/
    ├── INV-2024-000001.pdf
    └── ...
```

## Programmatic Usage

```python
from src.support.generators import FakerSupport
from src.core.obligations import identify_obligations
from src.core.allocation import allocate_prices
from src.core.schedules import generate_schedule
from src.llm.contracts import HybridContractGenerator
from src.exporters.json_export import JSONExporter

# Initialize
faker = FakerSupport(seed=42)
contract_gen = HybridContractGenerator()

# Generate customer
customer = faker.generate_customer()

# Generate contract terms
dates = faker.generate_contract_dates(term_months=12)
arr = faker.generate_arr()

# Identify revenue obligations
obligations = identify_obligations(
    contract_id="con_123",
    start_date=dates["start_date"],
    end_date=dates["end_date"],
    arr=arr,
)

# Allocate prices
allocations = allocate_prices(obligations, arr)

# Generate schedules
for obl, alloc in zip(obligations, allocations):
    schedules = generate_schedule(obl, alloc, "monthly")

# Export
exporter = JSONExporter()
exporter.export(customer, "customer.json")
```

## Module Reference

### Core (Ported from TypeScript)

| Module | Source | Description |
|--------|--------|-------------|
| `src/core/obligations.py` | `packages/revrec/src/obligations.ts` | Identify performance obligations |
| `src/core/allocation.py` | `packages/revrec/src/allocation.ts` | SSP-based price allocation |
| `src/core/schedules.py` | `packages/revrec/src/schedules.ts` | Recognition schedule generation |
| `src/core/recognition.py` | `packages/revrec/src/recognition.ts` | Recognition events |
| `src/core/deferred.py` | `packages/revrec/src/deferred.ts` | Deferred revenue balances |
| `src/core/billing.py` | `packages/rules/src/rules/billing/index.ts` | Billing calculations |

### Templates

| Module | Description |
|--------|-------------|
| `src/templates/cuad_loader.py` | Load CUAD dataset from Hugging Face |
| `src/templates/clause_extractor.py` | Extract clause templates by type |
| `src/templates/template_store.py` | Cache and manage templates |

### LLM

| Module | Description |
|--------|-------------|
| `src/llm/client.py` | OpenAI client wrapper |
| `src/llm/contracts.py` | Hybrid contract generator |
| `src/llm/invoices.py` | Invoice text generator |
| `src/llm/crm.py` | CRM notes with messiness |

### Exporters

| Module | Description |
|--------|-------------|
| `src/exporters/json_export.py` | JSON export |
| `src/exporters/csv_export.py` | CSV export with pandas |
| `src/exporters/pdf_export.py` | PDF export with WeasyPrint |

## Data Models

All Pydantic models match Cogtics schemas in `packages/schemas/src/`:

- **Contracts**: `Contract`, `ContractVersion`, `ContractTerm`, `ContractClause`
- **Invoices**: `Invoice`, `InvoiceLine`, `Payment`
- **Customers**: `Customer`, `Product`, `PricePlan`
- **RevRec**: `RevenueObligation`, `RevenueSchedule`, `RecognitionEvent`, `DeferredBalance`

## Command Line Options

```
python examples/generate_full_dataset.py --help

Options:
  --size {small,medium,large}  Dataset size (default: small)
  --use-llm                    Use LLM for text generation
  --generate-pdfs              Generate PDF documents
  --output-dir PATH            Custom output directory
  --seed INT                   Random seed for reproducibility
```

## Dataset Sizes

| Size | Customers | Contracts | Invoices (approx) |
|------|-----------|-----------|-------------------|
| small | 10 | 20 | ~200 |
| medium | 50 | 100 | ~1,000 |
| large | 200 | 500 | ~5,000 |

## Dependencies

Core:
- `openai>=1.0.0` - LLM text generation
- `pydantic>=2.0.0` - Data models
- `pandas>=2.0.0` - Data manipulation
- `faker>=22.0.0` - Random data generation
- `python-dotenv>=1.0.0` - Environment variables
- `python-dateutil>=2.8.0` - Date utilities

Optional:
- `datasets>=2.14.0` - CUAD dataset loading
- `weasyprint>=60.0` - PDF generation
- `jinja2>=3.1.0` - HTML templates

## Stress Testing

For comprehensive stress and integration testing, use `generate_stress_test.py`:

```bash
# Medium scenario with all features
python examples/generate_stress_test.py --scenario medium

# Multi-tenant with snapshot drift
python examples/generate_stress_test.py --scenario medium --tenants 3 --snapshots 2

# Stress scenario with connector payloads and expected outputs
python examples/generate_stress_test.py --scenario stress --connectors stripe,salesforce --with-expected-outputs

# Large scale without anomalies
python examples/generate_stress_test.py --scenario large --no-anomalies --no-duplicates
```

### Stress Test Features

| Feature | Description |
|---------|-------------|
| **Billing Discrepancies** | Deliberate mismatches to trigger rule detection (R001-R010) |
| **Data Anomalies** | Nulls, duplicates, encoding issues, orphans, invalid dates |
| **Lifecycle Events** | Amendments, renewals, cancellations, upgrades/downgrades |
| **Multi-Currency** | USD, EUR, GBP, etc. with FX rate variations |
| **Multi-Tenant** | Multiple tenants with `--tenants N` and snapshot drift with `--snapshots N` |
| **Connector Payloads** | Stripe, Salesforce, HubSpot, NetSuite raw formats |
| **Usage Billing** | Usage records, overage calculations, commitments |
| **Payments/Refunds** | Payment records, credits, refund scenarios |
| **Products/Pricing** | Products, price plans (flat/tiered/volume), discounts |
| **Invoice Line Items** | Full invoice breakdowns with tax, quantities |
| **Contract Terms/Clauses** | Terms linked to products, clause templates |
| **Duplicate Records** | Idempotency test cases with same external_id |
| **Job Payloads** | Queue/worker job fixtures for integration testing |
| **Expected Outputs** | Ground truth for rule violations, anomalies, reconciliation |

### Load Scenarios

| Scenario | Customers | Contracts | Invoices |
|----------|-----------|-----------|----------|
| `small` | 10 | ~30 | ~180 |
| `medium` | 100 | ~300 | ~1,800 |
| `large` | 1,000 | ~5,000 | ~30,000 |
| `stress` | 10,000 | ~75,000 | ~450,000 |
| `burst` | 500 | ~15,000 | ~90,000 |

### Output Structure

```
output/stress_test/
├── json/
│   ├── customers.json
│   ├── contracts.json
│   ├── contract_terms.json
│   ├── contract_clauses.json
│   ├── invoices.json
│   ├── invoice_lines.json
│   ├── payments.json
│   ├── refunds.json
│   ├── credits.json
│   ├── products.json
│   ├── price_plans.json
│   ├── discounts.json
│   ├── usage_records.json
│   ├── usage_summaries.json
│   ├── recognition_events.json
│   ├── deferred_balances.json
│   ├── job_payloads.json
│   ├── discrepancy_log.json
│   ├── anomaly_log.json
│   ├── duplicate_log.json
│   └── snapshot_drifts.json
├── csv/
│   └── (same entities as CSV)
├── expected_outputs/
│   ├── rule_violations.json
│   ├── data_quality_issues.json
│   ├── billing_reconciliation.json
│   ├── lifecycle_outcomes.json
│   └── duplicate_detections.json
├── connectors/
│   ├── stripe/
│   │   ├── customers.json
│   │   ├── contracts.json
│   │   └── invoices.json
│   └── salesforce/
│       └── ...
└── stats.json
```

## License

Part of the Cogtics platform.
