-- migrate:up
-- Phase 9: Simulation Engine
-- Snapshot-based simulations with parameter overrides and delta impact analysis

-- ============================================
-- Simulation Templates table (created first for FK reference)
-- Reusable override configurations
-- ============================================
CREATE TABLE simulation_templates (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_json JSONB NOT NULL DEFAULT '{"overrides": []}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_simulation_templates_tenant ON simulation_templates(tenant_id);
CREATE INDEX idx_simulation_templates_active ON simulation_templates(tenant_id, is_active);

-- ============================================
-- Simulations table
-- Core simulation entity with snapshot reference
-- ============================================
CREATE TABLE simulations (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending', 'running', 'completed', 'failed', 'cancelled'
    )),
    template_id VARCHAR(64) REFERENCES simulation_templates(id) ON DELETE SET NULL,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_simulations_tenant ON simulations(tenant_id);
CREATE INDEX idx_simulations_snapshot ON simulations(snapshot_id);
CREATE INDEX idx_simulations_status ON simulations(tenant_id, status);
CREATE INDEX idx_simulations_created_by ON simulations(created_by);
CREATE INDEX idx_simulations_template ON simulations(template_id);

-- ============================================
-- Simulation Overrides table
-- Parameter overrides applied to simulation
-- ============================================
CREATE TABLE simulation_overrides (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    simulation_id VARCHAR(64) NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    override_type VARCHAR(30) NOT NULL CHECK (override_type IN (
        'contract_term', 'usage_adjustment', 'billing_adjustment', 
        'timing_shift', 'discount_change', 'price_change'
    )),
    target_type VARCHAR(30) NOT NULL CHECK (target_type IN (
        'contract', 'invoice', 'customer', 'obligation', 'line_item'
    )),
    target_id VARCHAR(64) NOT NULL,
    field_path VARCHAR(255),
    original_value_json JSONB,
    override_value_json JSONB NOT NULL,
    sequence_number INTEGER NOT NULL DEFAULT 0,
    is_valid BOOLEAN NOT NULL DEFAULT true,
    validation_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_simulation_overrides_tenant ON simulation_overrides(tenant_id);
CREATE INDEX idx_simulation_overrides_simulation ON simulation_overrides(simulation_id);
CREATE INDEX idx_simulation_overrides_type ON simulation_overrides(override_type);
CREATE INDEX idx_simulation_overrides_target ON simulation_overrides(target_type, target_id);
CREATE INDEX idx_simulation_overrides_sequence ON simulation_overrides(simulation_id, sequence_number);

-- ============================================
-- Simulation Runs table
-- Execution history per simulation
-- ============================================
CREATE TABLE simulation_runs (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    simulation_id VARCHAR(64) NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    run_number INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'running', 'completed', 'failed', 'cancelled'
    )),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    processing_time_ms INTEGER,
    triggered_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    options_json JSONB DEFAULT '{}'::jsonb,
    error_code VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_simulation_runs_tenant ON simulation_runs(tenant_id);
CREATE INDEX idx_simulation_runs_simulation ON simulation_runs(simulation_id);
CREATE INDEX idx_simulation_runs_status ON simulation_runs(status);
CREATE INDEX idx_simulation_runs_started ON simulation_runs(started_at);

-- Unique constraint for run number per simulation
CREATE UNIQUE INDEX idx_simulation_runs_number ON simulation_runs(simulation_id, run_number);

-- ============================================
-- Simulation Results table
-- Aggregated summary outputs (immutable per run)
-- ============================================
CREATE TABLE simulation_results (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    run_id VARCHAR(64) NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
    simulation_id VARCHAR(64) NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    -- Summary metrics
    total_revenue_baseline NUMERIC(15, 2),
    total_revenue_simulated NUMERIC(15, 2),
    total_revenue_delta NUMERIC(15, 2),
    total_revenue_delta_pct NUMERIC(7, 4),
    -- Recognition metrics
    total_recognized_baseline NUMERIC(15, 2),
    total_recognized_simulated NUMERIC(15, 2),
    total_deferred_baseline NUMERIC(15, 2),
    total_deferred_simulated NUMERIC(15, 2),
    -- Impact counts
    contracts_affected INTEGER NOT NULL DEFAULT 0,
    obligations_affected INTEGER NOT NULL DEFAULT 0,
    overrides_applied INTEGER NOT NULL DEFAULT 0,
    overrides_skipped INTEGER NOT NULL DEFAULT 0,
    -- Detailed results
    summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    warnings_json JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_simulation_results_tenant ON simulation_results(tenant_id);
CREATE INDEX idx_simulation_results_run ON simulation_results(run_id);
CREATE INDEX idx_simulation_results_simulation ON simulation_results(simulation_id);

-- One result per run
CREATE UNIQUE INDEX idx_simulation_results_run_unique ON simulation_results(run_id);

-- ============================================
-- Simulation Deltas table
-- Granular delta records (revenue, timing, recognition)
-- ============================================
CREATE TABLE simulation_deltas (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    run_id VARCHAR(64) NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
    simulation_id VARCHAR(64) NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    delta_type VARCHAR(30) NOT NULL CHECK (delta_type IN (
        'revenue_total', 'revenue_period', 'recognized_shift', 
        'deferred_shift', 'contract_impact', 'obligation_impact'
    )),
    target_type VARCHAR(30),
    target_id VARCHAR(64),
    period_start DATE,
    period_end DATE,
    baseline_amount NUMERIC(15, 2),
    simulated_amount NUMERIC(15, 2),
    delta_amount NUMERIC(15, 2) NOT NULL,
    delta_pct NUMERIC(7, 4),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    details_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_simulation_deltas_tenant ON simulation_deltas(tenant_id);
CREATE INDEX idx_simulation_deltas_run ON simulation_deltas(run_id);
CREATE INDEX idx_simulation_deltas_simulation ON simulation_deltas(simulation_id);
CREATE INDEX idx_simulation_deltas_type ON simulation_deltas(delta_type);
CREATE INDEX idx_simulation_deltas_target ON simulation_deltas(target_type, target_id);
CREATE INDEX idx_simulation_deltas_period ON simulation_deltas(period_start, period_end);

-- ============================================
-- Simulation Audit table
-- Track all simulation actions
-- ============================================
CREATE TABLE simulation_audit (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    simulation_id VARCHAR(64) REFERENCES simulations(id) ON DELETE CASCADE,
    run_id VARCHAR(64) REFERENCES simulation_runs(id) ON DELETE CASCADE,
    action VARCHAR(30) NOT NULL CHECK (action IN (
        'created', 'updated', 'deleted', 'override_added', 'override_removed',
        'run_started', 'run_completed', 'run_failed', 'template_applied'
    )),
    actor_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    details_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_simulation_audit_tenant ON simulation_audit(tenant_id);
CREATE INDEX idx_simulation_audit_simulation ON simulation_audit(simulation_id);
CREATE INDEX idx_simulation_audit_run ON simulation_audit(run_id);
CREATE INDEX idx_simulation_audit_action ON simulation_audit(action);
CREATE INDEX idx_simulation_audit_actor ON simulation_audit(actor_user_id);
CREATE INDEX idx_simulation_audit_created ON simulation_audit(created_at);

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Enable RLS on all simulation tables
ALTER TABLE simulation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_deltas ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_audit ENABLE ROW LEVEL SECURITY;

-- Simulation Templates RLS
CREATE POLICY simulation_templates_tenant_isolation ON simulation_templates
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY simulation_templates_tenant_insert ON simulation_templates
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Simulations RLS
CREATE POLICY simulations_tenant_isolation ON simulations
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY simulations_tenant_insert ON simulations
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Simulation Overrides RLS
CREATE POLICY simulation_overrides_tenant_isolation ON simulation_overrides
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY simulation_overrides_tenant_insert ON simulation_overrides
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Simulation Runs RLS
CREATE POLICY simulation_runs_tenant_isolation ON simulation_runs
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY simulation_runs_tenant_insert ON simulation_runs
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Simulation Results RLS
CREATE POLICY simulation_results_tenant_isolation ON simulation_results
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY simulation_results_tenant_insert ON simulation_results
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Simulation Deltas RLS
CREATE POLICY simulation_deltas_tenant_isolation ON simulation_deltas
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY simulation_deltas_tenant_insert ON simulation_deltas
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Simulation Audit RLS
CREATE POLICY simulation_audit_tenant_isolation ON simulation_audit
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY simulation_audit_tenant_insert ON simulation_audit
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- migrate:down
DROP TABLE IF EXISTS simulation_audit CASCADE;
DROP TABLE IF EXISTS simulation_deltas CASCADE;
DROP TABLE IF EXISTS simulation_results CASCADE;
DROP TABLE IF EXISTS simulation_runs CASCADE;
DROP TABLE IF EXISTS simulation_overrides CASCADE;
DROP TABLE IF EXISTS simulations CASCADE;
DROP TABLE IF EXISTS simulation_templates CASCADE;
