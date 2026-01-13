-- migrate:up
-- Phase 7: Detection Engine
-- Deterministic rule-based detection for revenue leakage and rev-rec mismatches

-- ============================================
-- Detection Runs table
-- Tracks execution of rule sets against snapshots
-- ============================================
CREATE TABLE detection_runs (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    ruleset_version VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'running', 'completed', 'failed', 'cancelled'
    )),
    config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    stats_json JSONB DEFAULT '{}'::jsonb,
    issues_total INTEGER DEFAULT 0,
    issues_by_severity JSONB DEFAULT '{}'::jsonb,
    issues_by_category JSONB DEFAULT '{}'::jsonb,
    error_code VARCHAR(50),
    error_message TEXT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_detection_runs_tenant ON detection_runs(tenant_id);
CREATE INDEX idx_detection_runs_snapshot ON detection_runs(snapshot_id);
CREATE INDEX idx_detection_runs_status ON detection_runs(status);
CREATE INDEX idx_detection_runs_created ON detection_runs(created_at DESC);

-- ============================================
-- Issues table
-- Individual issues detected by rules
-- ============================================
CREATE TABLE issues (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    run_id VARCHAR(64) NOT NULL REFERENCES detection_runs(id) ON DELETE CASCADE,
    rule_id VARCHAR(20) NOT NULL,
    rule_version VARCHAR(20) NOT NULL,
    issue_key VARCHAR(128) NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN (
        'data_quality', 'billing', 'discount', 'revrec', 'credits', 
        'usage', 'lifecycle', 'multi_entity', 'cross_snapshot', 'tax_fees', 'fx_currency'
    )),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN (
        'open', 'resolved', 'dismissed', 'acknowledged'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN (
        'low', 'medium', 'high', 'critical', 'info'
    )),
    confidence NUMERIC(3, 2) NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
    impact_amount NUMERIC(15, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    expected_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    actual_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    dimensions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    contract_id VARCHAR(64) REFERENCES contracts(id) ON DELETE SET NULL,
    invoice_id VARCHAR(64) REFERENCES invoices(id) ON DELETE SET NULL,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    data_quality_flags JSONB DEFAULT '[]'::jsonb,
    suppressed_by_rule VARCHAR(20),
    rule_metadata_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, snapshot_id, issue_key)
);

CREATE INDEX idx_issues_tenant ON issues(tenant_id);
CREATE INDEX idx_issues_snapshot ON issues(snapshot_id);
CREATE INDEX idx_issues_run ON issues(run_id);
CREATE INDEX idx_issues_rule ON issues(rule_id);
CREATE INDEX idx_issues_category ON issues(category);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_severity ON issues(severity);
CREATE INDEX idx_issues_contract ON issues(contract_id);
CREATE INDEX idx_issues_invoice ON issues(invoice_id);
CREATE INDEX idx_issues_customer ON issues(customer_id);
CREATE INDEX idx_issues_tenant_snapshot_status ON issues(tenant_id, snapshot_id, status);
CREATE INDEX idx_issues_created ON issues(created_at DESC);

-- ============================================
-- Issue Status History table
-- Audit trail for status changes
-- ============================================
CREATE TABLE issue_status_history (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    issue_id VARCHAR(64) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    from_status VARCHAR(20) NOT NULL,
    to_status VARCHAR(20) NOT NULL,
    actor_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issue_status_history_tenant ON issue_status_history(tenant_id);
CREATE INDEX idx_issue_status_history_issue ON issue_status_history(issue_id);
CREATE INDEX idx_issue_status_history_actor ON issue_status_history(actor_user_id);
CREATE INDEX idx_issue_status_history_created ON issue_status_history(created_at DESC);

-- ============================================
-- Issue Sources table
-- Links issues to source evidence
-- ============================================
CREATE TABLE issue_sources (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    issue_id VARCHAR(64) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    source_type VARCHAR(30) NOT NULL CHECK (source_type IN (
        'contract', 'invoice', 'invoice_line', 'payment', 'usage_event',
        'schedule', 'obligation', 'customer', 'product', 'contract_term'
    )),
    source_id VARCHAR(64) NOT NULL,
    source_system VARCHAR(50),
    field_name VARCHAR(100),
    field_value_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issue_sources_tenant ON issue_sources(tenant_id);
CREATE INDEX idx_issue_sources_issue ON issue_sources(issue_id);
CREATE INDEX idx_issue_sources_source ON issue_sources(source_type, source_id);

-- ============================================
-- Detection Configs table
-- Tenant-level detection configuration
-- ============================================
CREATE TABLE detection_configs (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'default',
    is_active BOOLEAN NOT NULL DEFAULT true,
    fx_config JSONB NOT NULL DEFAULT '{
        "rateSource": "ecb",
        "rateDate": "invoice_date",
        "tolerancePct": 0.02,
        "baseCurrency": "USD"
    }'::jsonb,
    proration_config JSONB NOT NULL DEFAULT '{
        "method": "daily_exact",
        "midPeriodAmendmentHandling": "prorate",
        "rampScheduleRecognition": "as_invoiced"
    }'::jsonb,
    tax_fees_config JSONB NOT NULL DEFAULT '{
        "excludeFromComparison": true,
        "taxLineItemCodes": ["TAX", "VAT", "GST"],
        "feeLineItemCodes": ["SHIPPING", "HANDLING"]
    }'::jsonb,
    credits_config JSONB NOT NULL DEFAULT '{
        "netWithInvoices": true,
        "treatAsSeparateRevenue": false
    }'::jsonb,
    zero_value_config JSONB NOT NULL DEFAULT '{
        "treatAsValid": true,
        "skipBillingRules": true
    }'::jsonb,
    thresholds_config JSONB NOT NULL DEFAULT '{
        "amountVariancePct": 0.01,
        "amountVarianceAbs": 100,
        "timingVarianceDays": 5,
        "highImpactThreshold": 10000,
        "criticalImpactThreshold": 50000
    }'::jsonb,
    gating_config JSONB NOT NULL DEFAULT '{
        "skipIfContractNotReady": false,
        "confidenceCapIfNotReady": 0.3,
        "skipIfUsageStale": true,
        "usageStalenessHours": 24,
        "skipIfCRMStale": true,
        "crmStalenessHours": 48
    }'::jsonb,
    auto_renewal_config JSONB NOT NULL DEFAULT '{
        "detectImplicitRenewal": true,
        "renewalGraceDays": 30
    }'::jsonb,
    enabled_rules JSONB DEFAULT '[]'::jsonb,
    disabled_rules JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, name)
);

CREATE INDEX idx_detection_configs_tenant ON detection_configs(tenant_id);
CREATE INDEX idx_detection_configs_active ON detection_configs(tenant_id, is_active);

-- ============================================
-- FX Rates table (for currency normalization)
-- ============================================
CREATE TABLE fx_rates (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_currency VARCHAR(3) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    rate NUMERIC(18, 8) NOT NULL,
    rate_date DATE NOT NULL,
    rate_source VARCHAR(30) NOT NULL DEFAULT 'ecb',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, source_currency, target_currency, rate_date, rate_source)
);

CREATE INDEX idx_fx_rates_tenant ON fx_rates(tenant_id);
CREATE INDEX idx_fx_rates_currencies ON fx_rates(source_currency, target_currency);
CREATE INDEX idx_fx_rates_date ON fx_rates(rate_date);

-- ============================================
-- Enable RLS on new tables
-- ============================================

-- Detection Runs RLS
ALTER TABLE detection_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY detection_runs_tenant_isolation ON detection_runs
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY detection_runs_tenant_insert ON detection_runs
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Issues RLS
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY issues_tenant_isolation ON issues
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY issues_tenant_insert ON issues
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Issue Status History RLS
ALTER TABLE issue_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY issue_status_history_tenant_isolation ON issue_status_history
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY issue_status_history_tenant_insert ON issue_status_history
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Issue Sources RLS
ALTER TABLE issue_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY issue_sources_tenant_isolation ON issue_sources
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY issue_sources_tenant_insert ON issue_sources
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Detection Configs RLS
ALTER TABLE detection_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY detection_configs_tenant_isolation ON detection_configs
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY detection_configs_tenant_insert ON detection_configs
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- FX Rates RLS
ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY fx_rates_tenant_isolation ON fx_rates
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY fx_rates_tenant_insert ON fx_rates
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- Helpful views for detection
-- ============================================

-- View: Issues with related entity names
CREATE VIEW issues_with_details AS
SELECT
    i.id,
    i.tenant_id,
    i.snapshot_id,
    i.run_id,
    i.rule_id,
    i.rule_version,
    i.issue_key,
    i.category,
    i.status,
    i.severity,
    i.confidence,
    i.impact_amount,
    i.currency,
    i.expected_json,
    i.actual_json,
    i.dimensions_json,
    i.data_quality_flags,
    i.suppressed_by_rule,
    i.created_at,
    i.updated_at,
    c.name AS contract_name,
    c.external_id AS contract_external_id,
    inv.invoice_number,
    inv.invoice_date,
    cust.name AS customer_name,
    cust.external_id AS customer_external_id
FROM issues i
LEFT JOIN contracts c ON c.id = i.contract_id
LEFT JOIN invoices inv ON inv.id = i.invoice_id
LEFT JOIN customers cust ON cust.id = i.customer_id;

-- View: Detection run summary
CREATE VIEW detection_run_summary AS
SELECT
    dr.id,
    dr.tenant_id,
    dr.snapshot_id,
    dr.ruleset_version,
    dr.status,
    dr.started_at,
    dr.finished_at,
    dr.issues_total,
    dr.issues_by_severity,
    dr.issues_by_category,
    EXTRACT(EPOCH FROM (dr.finished_at - dr.started_at)) AS duration_seconds,
    s.status AS snapshot_status,
    s.completed_at AS snapshot_completed_at
FROM detection_runs dr
LEFT JOIN snapshots s ON s.id = dr.snapshot_id;

-- View: Issues summary by category and severity
CREATE VIEW issues_summary AS
SELECT
    tenant_id,
    snapshot_id,
    category,
    severity,
    status,
    COUNT(*) AS issue_count,
    SUM(impact_amount) AS total_impact,
    AVG(confidence) AS avg_confidence
FROM issues
GROUP BY tenant_id, snapshot_id, category, severity, status;

-- migrate:down
DROP VIEW IF EXISTS issue_summary_by_category CASCADE;
DROP TABLE IF EXISTS issue_suppression_rules CASCADE;
DROP TABLE IF EXISTS issue_status_history CASCADE;
DROP TABLE IF EXISTS issue_sources CASCADE;
DROP TABLE IF EXISTS issues CASCADE;
DROP TABLE IF EXISTS detection_runs CASCADE;
