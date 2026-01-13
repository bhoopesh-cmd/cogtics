-- migrate:up
-- Phase 6: Revenue Recognition Engine
-- ASC 606-compliant revenue recognition with obligations, schedules, and reconciliation

-- ============================================
-- Revenue Obligations table
-- Performance obligations identified from contracts
-- ============================================
CREATE TABLE revenue_obligations (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    contract_id VARCHAR(64) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    contract_version_id VARCHAR(64) REFERENCES contract_versions(id) ON DELETE SET NULL,
    obligation_type VARCHAR(30) NOT NULL CHECK (obligation_type IN (
        'subscription', 'usage', 'one_time', 'professional_services', 'support'
    )),
    description TEXT,
    transaction_price NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    allocation_method VARCHAR(20) NOT NULL DEFAULT 'straight_line' CHECK (allocation_method IN (
        'ssp', 'residual', 'straight_line', 'custom'
    )),
    standalone_selling_price NUMERIC(15, 2),
    service_start_date DATE,
    service_end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
        'active', 'completed', 'cancelled', 'amended'
    )),
    source_term_ids JSONB DEFAULT '[]'::jsonb,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revenue_obligations_tenant ON revenue_obligations(tenant_id);
CREATE INDEX idx_revenue_obligations_snapshot ON revenue_obligations(snapshot_id);
CREATE INDEX idx_revenue_obligations_contract ON revenue_obligations(contract_id);
CREATE INDEX idx_revenue_obligations_type ON revenue_obligations(obligation_type);
CREATE INDEX idx_revenue_obligations_status ON revenue_obligations(status);
CREATE INDEX idx_revenue_obligations_dates ON revenue_obligations(service_start_date, service_end_date);

-- ============================================
-- Revenue Allocations table
-- Transaction price allocation to obligations
-- ============================================
CREATE TABLE revenue_allocations (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    obligation_id VARCHAR(64) NOT NULL REFERENCES revenue_obligations(id) ON DELETE CASCADE,
    allocation_pct NUMERIC(7, 4) NOT NULL CHECK (allocation_pct >= 0 AND allocation_pct <= 100),
    allocated_amount NUMERIC(15, 2) NOT NULL,
    allocation_basis VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revenue_allocations_tenant ON revenue_allocations(tenant_id);
CREATE INDEX idx_revenue_allocations_snapshot ON revenue_allocations(snapshot_id);
CREATE INDEX idx_revenue_allocations_obligation ON revenue_allocations(obligation_id);

-- ============================================
-- Revenue Schedules table
-- Recognition schedules by period
-- ============================================
CREATE TABLE revenue_schedules (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    obligation_id VARCHAR(64) NOT NULL REFERENCES revenue_obligations(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    scheduled_amount NUMERIC(15, 2) NOT NULL,
    recognized_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    deferred_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    recognition_method VARCHAR(20) NOT NULL CHECK (recognition_method IN (
        'straight_line', 'usage_based', 'milestone', 'as_invoiced'
    )),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'partial', 'recognized', 'cancelled'
    )),
    period_days INTEGER,
    daily_rate NUMERIC(15, 6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revenue_schedules_tenant ON revenue_schedules(tenant_id);
CREATE INDEX idx_revenue_schedules_snapshot ON revenue_schedules(snapshot_id);
CREATE INDEX idx_revenue_schedules_obligation ON revenue_schedules(obligation_id);
CREATE INDEX idx_revenue_schedules_period ON revenue_schedules(period_start, period_end);
CREATE INDEX idx_revenue_schedules_status ON revenue_schedules(status);

-- ============================================
-- Recognition Events table
-- Individual recognition events (scheduled, usage, adjustment)
-- ============================================
CREATE TABLE recognition_events (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    obligation_id VARCHAR(64) NOT NULL REFERENCES revenue_obligations(id) ON DELETE CASCADE,
    schedule_id VARCHAR(64) REFERENCES revenue_schedules(id) ON DELETE SET NULL,
    event_date DATE NOT NULL,
    recognized_amount NUMERIC(15, 2) NOT NULL,
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN (
        'scheduled', 'usage', 'milestone', 'adjustment', 'cancellation', 'amendment'
    )),
    source_invoice_id VARCHAR(64) REFERENCES invoices(id) ON DELETE SET NULL,
    description TEXT,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recognition_events_tenant ON recognition_events(tenant_id);
CREATE INDEX idx_recognition_events_snapshot ON recognition_events(snapshot_id);
CREATE INDEX idx_recognition_events_obligation ON recognition_events(obligation_id);
CREATE INDEX idx_recognition_events_schedule ON recognition_events(schedule_id);
CREATE INDEX idx_recognition_events_date ON recognition_events(event_date);
CREATE INDEX idx_recognition_events_type ON recognition_events(event_type);

-- ============================================
-- Deferred Revenue Balances table
-- Period-end deferred revenue tracking
-- ============================================
CREATE TABLE deferred_revenue_balances (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    obligation_id VARCHAR(64) NOT NULL REFERENCES revenue_obligations(id) ON DELETE CASCADE,
    period_end DATE NOT NULL,
    opening_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    additions NUMERIC(15, 2) NOT NULL DEFAULT 0,
    recognized NUMERIC(15, 2) NOT NULL DEFAULT 0,
    adjustments NUMERIC(15, 2) NOT NULL DEFAULT 0,
    closing_balance NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (obligation_id, period_end)
);

CREATE INDEX idx_deferred_revenue_tenant ON deferred_revenue_balances(tenant_id);
CREATE INDEX idx_deferred_revenue_snapshot ON deferred_revenue_balances(snapshot_id);
CREATE INDEX idx_deferred_revenue_obligation ON deferred_revenue_balances(obligation_id);
CREATE INDEX idx_deferred_revenue_period ON deferred_revenue_balances(period_end);

-- ============================================
-- RevRec Reconciliations table
-- Reconciliation between schedules and invoices
-- ============================================
CREATE TABLE revrec_reconciliations (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    contract_id VARCHAR(64) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN (
        'matched', 'timing_variance', 'amount_variance', 'missing_invoice', 'unmatched'
    )),
    scheduled_amount NUMERIC(15, 2) NOT NULL,
    invoiced_amount NUMERIC(15, 2) NOT NULL,
    variance_amount NUMERIC(15, 2) NOT NULL,
    variance_pct NUMERIC(7, 4),
    details_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revrec_reconciliations_tenant ON revrec_reconciliations(tenant_id);
CREATE INDEX idx_revrec_reconciliations_snapshot ON revrec_reconciliations(snapshot_id);
CREATE INDEX idx_revrec_reconciliations_contract ON revrec_reconciliations(contract_id);
CREATE INDEX idx_revrec_reconciliations_period ON revrec_reconciliations(period_start, period_end);
CREATE INDEX idx_revrec_reconciliations_status ON revrec_reconciliations(status);

-- ============================================
-- Enable RLS on new tables
-- ============================================

-- Revenue Obligations RLS
ALTER TABLE revenue_obligations ENABLE ROW LEVEL SECURITY;

CREATE POLICY revenue_obligations_tenant_isolation ON revenue_obligations
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY revenue_obligations_tenant_insert ON revenue_obligations
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Revenue Allocations RLS
ALTER TABLE revenue_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY revenue_allocations_tenant_isolation ON revenue_allocations
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY revenue_allocations_tenant_insert ON revenue_allocations
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Revenue Schedules RLS
ALTER TABLE revenue_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY revenue_schedules_tenant_isolation ON revenue_schedules
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY revenue_schedules_tenant_insert ON revenue_schedules
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Recognition Events RLS
ALTER TABLE recognition_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY recognition_events_tenant_isolation ON recognition_events
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY recognition_events_tenant_insert ON recognition_events
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Deferred Revenue Balances RLS
ALTER TABLE deferred_revenue_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY deferred_revenue_balances_tenant_isolation ON deferred_revenue_balances
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY deferred_revenue_balances_tenant_insert ON deferred_revenue_balances
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- RevRec Reconciliations RLS
ALTER TABLE revrec_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY revrec_reconciliations_tenant_isolation ON revrec_reconciliations
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY revrec_reconciliations_tenant_insert ON revrec_reconciliations
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- Helpful views for revenue recognition
-- ============================================

-- View: Obligations with allocation and schedule summary
CREATE VIEW obligations_summary AS
SELECT
    ro.id,
    ro.tenant_id,
    ro.snapshot_id,
    ro.contract_id,
    c.name AS contract_name,
    cust.name AS customer_name,
    ro.obligation_type,
    ro.description,
    ro.transaction_price,
    ro.currency,
    ro.allocation_method,
    ro.service_start_date,
    ro.service_end_date,
    ro.status,
    COALESCE(ra.allocated_amount, 0) AS allocated_amount,
    COALESCE(ra.allocation_pct, 0) AS allocation_pct,
    COALESCE(sched_agg.total_scheduled, 0) AS total_scheduled,
    COALESCE(sched_agg.total_recognized, 0) AS total_recognized,
    COALESCE(sched_agg.total_deferred, 0) AS total_deferred,
    COALESCE(sched_agg.schedule_count, 0) AS schedule_count
FROM revenue_obligations ro
LEFT JOIN contracts c ON c.id = ro.contract_id
LEFT JOIN customers cust ON cust.id = c.customer_id
LEFT JOIN revenue_allocations ra ON ra.obligation_id = ro.id
LEFT JOIN (
    SELECT
        obligation_id,
        SUM(scheduled_amount) AS total_scheduled,
        SUM(recognized_amount) AS total_recognized,
        SUM(deferred_amount) AS total_deferred,
        COUNT(*) AS schedule_count
    FROM revenue_schedules
    GROUP BY obligation_id
) sched_agg ON sched_agg.obligation_id = ro.id;

-- View: Period summary for waterfall charts
CREATE VIEW revrec_period_summary AS
SELECT
    tenant_id,
    snapshot_id,
    DATE_TRUNC('month', period_start) AS period,
    SUM(scheduled_amount) AS scheduled_total,
    SUM(recognized_amount) AS recognized_total,
    SUM(deferred_amount) AS deferred_total,
    COUNT(DISTINCT obligation_id) AS obligation_count
FROM revenue_schedules
GROUP BY tenant_id, snapshot_id, DATE_TRUNC('month', period_start)
ORDER BY period;

-- migrate:down
DROP VIEW IF EXISTS revenue_period_summary CASCADE;
DROP TABLE IF EXISTS revrec_reconciliation_items CASCADE;
DROP TABLE IF EXISTS revrec_reconciliation_runs CASCADE;
DROP TABLE IF EXISTS revenue_adjustments CASCADE;
DROP TABLE IF EXISTS revenue_schedule_entries CASCADE;
DROP TABLE IF EXISTS revenue_schedules CASCADE;
DROP TABLE IF EXISTS revenue_obligations CASCADE;
