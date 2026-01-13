# Canonical Data Model

This document describes the canonical data model used by Cogtics to store normalized revenue data.

## Overview

The canonical model provides a unified schema for data from multiple sources (Stripe, Salesforce, etc.). All data is:
- **Snapshot-scoped**: Every record belongs to a specific snapshot
- **Immutable**: Snapshots are never modified after completion
- **Traceable**: Records link back to their source system and batch

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Customers  │◄──────│   Contracts  │◄──────│   Invoices   │
│              │       │              │       │              │
│  • id        │       │  • id        │       │  • id        │
│  • name      │       │  • customer_id│      │  • customer_id│
│  • email     │       │  • status    │       │  • contract_id│
│  • status    │       │  • arr       │       │  • total     │
│              │       │  • start_date│       │  • status    │
└──────────────┘       │  • end_date  │       └───────┬──────┘
       │               └──────────────┘               │
       │                      │                       │
       │               ┌──────┴──────┐         ┌──────┴──────┐
       │               │  Contract   │         │ Invoice     │
       │               │  Versions   │         │   Lines     │
       │               └─────────────┘         └─────────────┘
       │
       ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Payments   │       │   Products   │◄──────│ Price Plans  │
│              │       │              │       │              │
│  • invoice_id│       │  • id        │       │  • product_id│
│  • amount    │       │  • name      │       │  • currency  │
│  • status    │       │  • sku       │       │  • price     │
└──────────────┘       │  • status    │       │  • cadence   │
                       └──────────────┘       └──────────────┘
```

## Core Entities

### Snapshots

Every data ingestion creates a snapshot - an immutable point-in-time view.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Owning tenant |
| `status` | ENUM | `pending`, `building`, `validating`, `complete`, `failed` |
| `started_at` | TIMESTAMP | When ingestion started |
| `completed_at` | TIMESTAMP | When snapshot completed |
| `record_counts` | JSONB | Count of records per entity type |
| `quality_results` | JSONB | Quality check results |

### Customers

Represents customer accounts from any source system.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Owning tenant |
| `snapshot_id` | UUID | Parent snapshot |
| `external_id` | VARCHAR | ID in source system |
| `external_ids_json` | JSONB | IDs across all systems |
| `name` | VARCHAR | Customer name |
| `email` | VARCHAR | Primary email |
| `status` | ENUM | `active`, `inactive`, `churned`, `prospect` |
| `source_system` | VARCHAR | Origin system (stripe, salesforce) |

### Contracts

Subscriptions, opportunities, or other recurring revenue agreements.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Owning tenant |
| `snapshot_id` | UUID | Parent snapshot |
| `customer_id` | UUID | FK to customers |
| `external_id` | VARCHAR | ID in source system |
| `name` | VARCHAR | Contract name/description |
| `status` | ENUM | `draft`, `active`, `expired`, `cancelled`, `renewed` |
| `start_date` | DATE | Contract start |
| `end_date` | DATE | Contract end (null = ongoing) |
| `arr` | DECIMAL | Annual Recurring Revenue |
| `currency` | VARCHAR | ISO currency code |
| `billing_frequency` | ENUM | `monthly`, `quarterly`, `annually`, `one_time` |
| `auto_renew` | BOOLEAN | Auto-renewal flag |

### Contract Versions

Historical versions of contracts for audit trail.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `contract_id` | UUID | FK to contracts |
| `version` | INTEGER | Version number |
| `effective_date` | DATE | When version became effective |
| `changes_json` | JSONB | What changed in this version |

### Invoices

Invoice headers from billing systems.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Owning tenant |
| `snapshot_id` | UUID | Parent snapshot |
| `customer_id` | UUID | FK to customers |
| `contract_id` | UUID | FK to contracts (optional) |
| `external_id` | VARCHAR | ID in source system |
| `invoice_number` | VARCHAR | Display number |
| `invoice_date` | DATE | Invoice date |
| `due_date` | DATE | Payment due date |
| `currency` | VARCHAR | ISO currency code |
| `subtotal` | DECIMAL | Amount before tax |
| `tax` | DECIMAL | Tax amount |
| `total` | DECIMAL | Total amount |
| `amount_paid` | DECIMAL | Amount already paid |
| `amount_due` | DECIMAL | Remaining balance |
| `status` | ENUM | `draft`, `open`, `paid`, `void`, `uncollectible`, `past_due` |
| `period_start` | DATE | Service period start |
| `period_end` | DATE | Service period end |

### Invoice Lines

Individual line items on invoices.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `invoice_id` | UUID | FK to invoices |
| `product_id` | UUID | FK to products (optional) |
| `description` | VARCHAR | Line item description |
| `quantity` | DECIMAL | Quantity |
| `unit_price` | DECIMAL | Price per unit |
| `amount` | DECIMAL | Total line amount |
| `currency` | VARCHAR | ISO currency code |
| `service_start` | DATE | Service period start |
| `service_end` | DATE | Service period end |

### Products

Product catalog from billing systems.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Owning tenant |
| `snapshot_id` | UUID | Parent snapshot |
| `external_id` | VARCHAR | ID in source system |
| `sku` | VARCHAR | Stock keeping unit |
| `name` | VARCHAR | Product name |
| `description` | TEXT | Product description |
| `category` | VARCHAR | Product category |
| `status` | ENUM | `active`, `inactive`, `archived` |

### Price Plans

Pricing configurations for products.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `product_id` | UUID | FK to products |
| `name` | VARCHAR | Plan name |
| `billing_cadence` | ENUM | `monthly`, `quarterly`, `annually`, `one_time`, `usage_based` |
| `currency` | VARCHAR | ISO currency code |
| `price_json` | JSONB | Pricing details (amount, tiers, etc.) |
| `status` | ENUM | `active`, `inactive`, `archived` |

### Payments

Payment transactions against invoices.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Owning tenant |
| `snapshot_id` | UUID | Parent snapshot |
| `invoice_id` | UUID | FK to invoices (optional) |
| `customer_id` | UUID | FK to customers (optional) |
| `external_id` | VARCHAR | ID in source system |
| `amount` | DECIMAL | Payment amount |
| `currency` | VARCHAR | ISO currency code |
| `payment_date` | DATE | When payment occurred |
| `method` | VARCHAR | Payment method (card, bank, etc.) |
| `status` | ENUM | `pending`, `succeeded`, `failed`, `refunded`, `partially_refunded` |

## Field Mappings

### Stripe

| Stripe Object | Canonical Entity | Key Mappings |
|---------------|------------------|--------------|
| Customer | customers | `id`→`external_id`, `email`→`email`, `name`→`name` |
| Subscription | contracts | `id`→`external_id`, `status`→`status`, calculated→`arr` |
| Invoice | invoices | `id`→`external_id`, `total`→`total`, `status`→`status` |
| InvoiceLineItem | invoice_lines | `id`→`external_id`, `amount`→`amount` |
| Product | products | `id`→`external_id`, `name`→`name`, `active`→`status` |
| Price | price_plans | `id`→`external_id`, `unit_amount`→`price_json` |
| PaymentIntent | payments | `id`→`external_id`, `amount`→`amount`, `status`→`status` |

### Salesforce

| Salesforce Object | Canonical Entity | Key Mappings |
|-------------------|------------------|--------------|
| Account | customers | `Id`→`external_id`, `Name`→`name`, `Type`→`status` |
| Opportunity | contracts | `Id`→`external_id`, `Amount`→`arr`, `StageName`→`status` |
| Product2 | products | `Id`→`external_id`, `Name`→`name`, `IsActive`→`status` |

## Snapshot Lifecycle

```
[Created]
    │
    ▼
[pending] ──────────────────────────────────────────┐
    │                                               │
    │ ingest.load                                   │
    ▼                                               │
[building] ─────────────────────────────────────────┤
    │                                               │
    │ ingest.normalize                              │
    │ ingest.upsert                                 │
    ▼                                               │
[validating] ───────────────────────────────────────┤
    │                                               │
    │ ingest.finalize                               │
    ▼                                               │
[complete] ◄────────────────────────────────────────┤
                                                    │
[failed] ◄──────────────────────────────────────────┘
         (on any stage error)
```

## Lineage and Traceability

Every canonical record includes:
- `source_system`: Which system the data came from
- `source_batch_id`: Which raw batch contained the original data
- `source_record_id`: Original record ID within the batch

This allows full traceability from canonical data back to raw API responses.

## Querying Data

### Latest Snapshot

The database includes views for querying latest snapshot data:
- `customers_latest`: Current customer records
- `contracts_latest`: Current contract records
- `invoices_latest`: Current invoice records

### Explicit Snapshot

All queries should include `snapshot_id`:
```sql
SELECT * FROM customers 
WHERE snapshot_id = 'snap_xxx' 
  AND tenant_id = 'tenant_xxx';
```

### API Endpoints

```
GET /data/summary          - KPIs for snapshot
GET /data/customers        - List customers
GET /data/customers/:id    - Customer with contracts/invoices
GET /data/contracts        - List contracts
GET /data/contracts/:id    - Contract with versions
GET /data/invoices         - List invoices
GET /data/invoices/:id     - Invoice with line items
GET /data/products         - List products
GET /data/payments         - List payments
```

All endpoints accept optional `?snapshotId=xxx` (defaults to latest complete).
