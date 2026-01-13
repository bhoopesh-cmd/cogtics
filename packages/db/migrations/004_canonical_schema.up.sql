-- migrate:up
-- Phase 2: Canonical Data Model + Ingestion Pipeline

-- ============================================
-- Snapshots table
-- Immutable data snapshots with lifecycle status
-- ============================================
CREATE TABLE snapshots (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_run_id VARCHAR(64) REFERENCES connector_runs(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'validating', 'complete', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    record_counts JSONB DEFAULT '{}'::jsonb,
    quality_results JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_snapshots_tenant ON snapshots(tenant_id);
CREATE INDEX idx_snapshots_status ON snapshots(status);
CREATE INDEX idx_snapshots_started ON snapshots(started_at DESC);

-- ============================================
-- Sync Runs table
-- Track ingestion run history per snapshot
-- ============================================
CREATE TABLE sync_runs (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) REFERENCES snapshots(id) ON DELETE CASCADE,
    run_type VARCHAR(30) NOT NULL CHECK (run_type IN ('load', 'normalize', 'upsert', 'finalize', 'full')),
    status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    records_processed INTEGER DEFAULT 0,
    error_code VARCHAR(100),
    error_message TEXT,
    metadata_json JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_sync_runs_tenant ON sync_runs(tenant_id);
CREATE INDEX idx_sync_runs_snapshot ON sync_runs(snapshot_id);
CREATE INDEX idx_sync_runs_status ON sync_runs(status);

-- ============================================
-- Staging Records table
-- Temporary staging for raw JSON before normalization
-- ============================================
CREATE TABLE staging_records (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    connection_id VARCHAR(64) NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    batch_id VARCHAR(64) NOT NULL REFERENCES raw_batches(id) ON DELETE CASCADE,
    object_type VARCHAR(100) NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    raw_json JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'normalized', 'failed', 'skipped')),
    error_message TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staging_records_tenant ON staging_records(tenant_id);
CREATE INDEX idx_staging_records_snapshot ON staging_records(snapshot_id);
CREATE INDEX idx_staging_records_batch ON staging_records(batch_id);
CREATE INDEX idx_staging_records_status ON staging_records(status);
CREATE UNIQUE INDEX idx_staging_records_unique ON staging_records(snapshot_id, object_type, external_id);

-- ============================================
-- Customers table
-- Normalized customer entities
-- ============================================
CREATE TABLE customers (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    external_id VARCHAR(255) NOT NULL,
    external_ids_json JSONB DEFAULT '{}'::jsonb,
    name VARCHAR(500) NOT NULL,
    email VARCHAR(320),
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'churned', 'prospect')),
    metadata_json JSONB DEFAULT '{}'::jsonb,
    source_system VARCHAR(50) NOT NULL,
    source_batch_id VARCHAR(64) REFERENCES raw_batches(id) ON DELETE SET NULL,
    source_record_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_snapshot ON customers(snapshot_id);
CREATE INDEX idx_customers_external_id ON customers(external_id);
CREATE UNIQUE INDEX idx_customers_unique ON customers(tenant_id, snapshot_id, external_id);

-- ============================================
-- Contracts table
-- Contract header records
-- ============================================
CREATE TABLE contracts (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    external_id VARCHAR(255) NOT NULL,
    external_ids_json JSONB DEFAULT '{}'::jsonb,
    name VARCHAR(500),
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'cancelled', 'renewed')),
    start_date DATE,
    end_date DATE,
    arr NUMERIC(15, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    billing_frequency VARCHAR(20) CHECK (billing_frequency IN ('monthly', 'quarterly', 'annually', 'one_time')),
    auto_renew BOOLEAN DEFAULT false,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    source_system VARCHAR(50) NOT NULL,
    source_batch_id VARCHAR(64) REFERENCES raw_batches(id) ON DELETE SET NULL,
    source_record_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contracts_tenant ON contracts(tenant_id);
CREATE INDEX idx_contracts_snapshot ON contracts(snapshot_id);
CREATE INDEX idx_contracts_customer ON contracts(customer_id);
CREATE INDEX idx_contracts_external_id ON contracts(external_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE UNIQUE INDEX idx_contracts_unique ON contracts(tenant_id, snapshot_id, external_id);

-- ============================================
-- Contract Versions table
-- Version history per contract
-- ============================================
CREATE TABLE contract_versions (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    contract_id VARCHAR(64) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    effective_date DATE,
    source VARCHAR(50),
    changes_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contract_versions_tenant ON contract_versions(tenant_id);
CREATE INDEX idx_contract_versions_snapshot ON contract_versions(snapshot_id);
CREATE INDEX idx_contract_versions_contract ON contract_versions(contract_id);
CREATE UNIQUE INDEX idx_contract_versions_unique ON contract_versions(contract_id, version);

-- ============================================
-- Contract Terms table
-- Extracted terms with confidence scores
-- ============================================
CREATE TABLE contract_terms (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    contract_version_id VARCHAR(64) NOT NULL REFERENCES contract_versions(id) ON DELETE CASCADE,
    term_type VARCHAR(50) NOT NULL,
    value_json JSONB NOT NULL,
    confidence NUMERIC(5, 2) CHECK (confidence >= 0 AND confidence <= 100),
    source_clause TEXT,
    source_page INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contract_terms_tenant ON contract_terms(tenant_id);
CREATE INDEX idx_contract_terms_snapshot ON contract_terms(snapshot_id);
CREATE INDEX idx_contract_terms_version ON contract_terms(contract_version_id);
CREATE INDEX idx_contract_terms_type ON contract_terms(term_type);

-- ============================================
-- Invoices table
-- Invoice headers
-- ============================================
CREATE TABLE invoices (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    contract_id VARCHAR(64) REFERENCES contracts(id) ON DELETE SET NULL,
    external_id VARCHAR(255) NOT NULL,
    external_ids_json JSONB DEFAULT '{}'::jsonb,
    invoice_number VARCHAR(100),
    invoice_date DATE NOT NULL,
    due_date DATE,
    currency VARCHAR(3) DEFAULT 'USD',
    subtotal NUMERIC(15, 2),
    tax NUMERIC(15, 2) DEFAULT 0,
    total NUMERIC(15, 2) NOT NULL,
    amount_paid NUMERIC(15, 2) DEFAULT 0,
    amount_due NUMERIC(15, 2),
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible', 'past_due')),
    period_start DATE,
    period_end DATE,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    source_system VARCHAR(50) NOT NULL,
    source_batch_id VARCHAR(64) REFERENCES raw_batches(id) ON DELETE SET NULL,
    source_record_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_snapshot ON invoices(snapshot_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_contract ON invoices(contract_id);
CREATE INDEX idx_invoices_external_id ON invoices(external_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(invoice_date DESC);
CREATE UNIQUE INDEX idx_invoices_unique ON invoices(tenant_id, snapshot_id, external_id);

-- ============================================
-- Products table
-- Product catalog (before invoice_lines which references it)
-- ============================================
CREATE TABLE products (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    external_id VARCHAR(255) NOT NULL,
    external_ids_json JSONB DEFAULT '{}'::jsonb,
    sku VARCHAR(100),
    name VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    metadata_json JSONB DEFAULT '{}'::jsonb,
    source_system VARCHAR(50) NOT NULL,
    source_batch_id VARCHAR(64) REFERENCES raw_batches(id) ON DELETE SET NULL,
    source_record_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_snapshot ON products(snapshot_id);
CREATE INDEX idx_products_external_id ON products(external_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE UNIQUE INDEX idx_products_unique ON products(tenant_id, snapshot_id, external_id);

-- ============================================
-- Invoice Lines table
-- Line items with service periods
-- ============================================
CREATE TABLE invoice_lines (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    invoice_id VARCHAR(64) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
    external_id VARCHAR(255),
    description TEXT,
    quantity NUMERIC(15, 4) DEFAULT 1,
    unit_price NUMERIC(15, 4),
    amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    service_start DATE,
    service_end DATE,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_lines_tenant ON invoice_lines(tenant_id);
CREATE INDEX idx_invoice_lines_snapshot ON invoice_lines(snapshot_id);
CREATE INDEX idx_invoice_lines_invoice ON invoice_lines(invoice_id);
CREATE INDEX idx_invoice_lines_product ON invoice_lines(product_id);

-- ============================================
-- Payments table
-- Payment transactions
-- ============================================
CREATE TABLE payments (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    invoice_id VARCHAR(64) REFERENCES invoices(id) ON DELETE SET NULL,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    external_id VARCHAR(255) NOT NULL,
    external_ids_json JSONB DEFAULT '{}'::jsonb,
    amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_date TIMESTAMPTZ NOT NULL,
    method VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded')),
    metadata_json JSONB DEFAULT '{}'::jsonb,
    source_system VARCHAR(50) NOT NULL,
    source_batch_id VARCHAR(64) REFERENCES raw_batches(id) ON DELETE SET NULL,
    source_record_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_snapshot ON payments(snapshot_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_external_id ON payments(external_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE UNIQUE INDEX idx_payments_unique ON payments(tenant_id, snapshot_id, external_id);

-- ============================================
-- Usage Events table
-- Metered usage records
-- ============================================
CREATE TABLE usage_events (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    contract_id VARCHAR(64) REFERENCES contracts(id) ON DELETE SET NULL,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
    external_id VARCHAR(255),
    metric VARCHAR(100) NOT NULL,
    quantity NUMERIC(20, 6) NOT NULL,
    unit VARCHAR(50),
    event_time TIMESTAMPTZ NOT NULL,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    source_system VARCHAR(50) NOT NULL,
    source_batch_id VARCHAR(64) REFERENCES raw_batches(id) ON DELETE SET NULL,
    source_record_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_events_tenant ON usage_events(tenant_id);
CREATE INDEX idx_usage_events_snapshot ON usage_events(snapshot_id);
CREATE INDEX idx_usage_events_customer ON usage_events(customer_id);
CREATE INDEX idx_usage_events_contract ON usage_events(contract_id);
CREATE INDEX idx_usage_events_metric ON usage_events(metric);
CREATE INDEX idx_usage_events_time ON usage_events(event_time DESC);

-- ============================================
-- Price Plans table
-- Pricing configuration
-- ============================================
CREATE TABLE price_plans (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    external_id VARCHAR(255),
    external_ids_json JSONB DEFAULT '{}'::jsonb,
    name VARCHAR(255),
    billing_cadence VARCHAR(20) CHECK (billing_cadence IN ('monthly', 'quarterly', 'annually', 'one_time', 'usage_based')),
    currency VARCHAR(3) DEFAULT 'USD',
    price_json JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    metadata_json JSONB DEFAULT '{}'::jsonb,
    source_system VARCHAR(50) NOT NULL,
    source_batch_id VARCHAR(64) REFERENCES raw_batches(id) ON DELETE SET NULL,
    source_record_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_price_plans_tenant ON price_plans(tenant_id);
CREATE INDEX idx_price_plans_snapshot ON price_plans(snapshot_id);
CREATE INDEX idx_price_plans_product ON price_plans(product_id);
CREATE INDEX idx_price_plans_external_id ON price_plans(external_id);

-- ============================================
-- Enable RLS on all canonical tables
-- ============================================

-- Snapshots RLS
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY snapshots_tenant_isolation ON snapshots
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY snapshots_tenant_insert ON snapshots
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Sync Runs RLS
ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_runs_tenant_isolation ON sync_runs
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY sync_runs_tenant_insert ON sync_runs
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Staging Records RLS
ALTER TABLE staging_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY staging_records_tenant_isolation ON staging_records
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY staging_records_tenant_insert ON staging_records
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Customers RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_tenant_isolation ON customers
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY customers_tenant_insert ON customers
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Contracts RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contracts_tenant_isolation ON contracts
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY contracts_tenant_insert ON contracts
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Contract Versions RLS
ALTER TABLE contract_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_versions_tenant_isolation ON contract_versions
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY contract_versions_tenant_insert ON contract_versions
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Contract Terms RLS
ALTER TABLE contract_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_terms_tenant_isolation ON contract_terms
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY contract_terms_tenant_insert ON contract_terms
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Invoices RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_tenant_isolation ON invoices
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY invoices_tenant_insert ON invoices
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Invoice Lines RLS
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_lines_tenant_isolation ON invoice_lines
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY invoice_lines_tenant_insert ON invoice_lines
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Products RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_tenant_isolation ON products
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY products_tenant_insert ON products
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Payments RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_tenant_isolation ON payments
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY payments_tenant_insert ON payments
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Usage Events RLS
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY usage_events_tenant_isolation ON usage_events
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY usage_events_tenant_insert ON usage_events
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Price Plans RLS
ALTER TABLE price_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY price_plans_tenant_isolation ON price_plans
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY price_plans_tenant_insert ON price_plans
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- Views for Latest Snapshot Access
-- ============================================

-- Latest snapshot per tenant (materialized for performance)
CREATE VIEW latest_snapshots AS
SELECT DISTINCT ON (tenant_id) *
FROM snapshots
WHERE status = 'complete'
ORDER BY tenant_id, completed_at DESC;

-- Latest customers view
CREATE VIEW latest_customers AS
SELECT c.*
FROM customers c
INNER JOIN latest_snapshots ls ON c.snapshot_id = ls.id AND c.tenant_id = ls.tenant_id;

-- Latest contracts view
CREATE VIEW latest_contracts AS
SELECT ct.*
FROM contracts ct
INNER JOIN latest_snapshots ls ON ct.snapshot_id = ls.id AND ct.tenant_id = ls.tenant_id;

-- Latest invoices view
CREATE VIEW latest_invoices AS
SELECT i.*
FROM invoices i
INNER JOIN latest_snapshots ls ON i.snapshot_id = ls.id AND i.tenant_id = ls.tenant_id;

-- migrate:down
DROP VIEW IF EXISTS latest_invoices CASCADE;
DROP VIEW IF EXISTS latest_contracts CASCADE;
DROP VIEW IF EXISTS latest_customers CASCADE;
DROP VIEW IF EXISTS latest_snapshots CASCADE;
DROP TABLE IF EXISTS invoice_lines CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS contract_line_items CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS price_plans CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS snapshots CASCADE;

