-- migrate:up
-- Fix simulation table RLS policies
-- 1. Change from app.current_tenant_id to app.tenant_id (consistent with other tables)
-- 2. Add WITH CHECK policies for inserts

-- ============================================
-- Drop all existing policies (isolation and insert)
-- ============================================
DROP POLICY IF EXISTS simulation_templates_tenant_isolation ON simulation_templates;
DROP POLICY IF EXISTS simulation_templates_tenant_insert ON simulation_templates;
DROP POLICY IF EXISTS simulations_tenant_isolation ON simulations;
DROP POLICY IF EXISTS simulations_tenant_insert ON simulations;
DROP POLICY IF EXISTS simulation_overrides_tenant_isolation ON simulation_overrides;
DROP POLICY IF EXISTS simulation_overrides_tenant_insert ON simulation_overrides;
DROP POLICY IF EXISTS simulation_runs_tenant_isolation ON simulation_runs;
DROP POLICY IF EXISTS simulation_runs_tenant_insert ON simulation_runs;
DROP POLICY IF EXISTS simulation_results_tenant_isolation ON simulation_results;
DROP POLICY IF EXISTS simulation_results_tenant_insert ON simulation_results;
DROP POLICY IF EXISTS simulation_deltas_tenant_isolation ON simulation_deltas;
DROP POLICY IF EXISTS simulation_deltas_tenant_insert ON simulation_deltas;
DROP POLICY IF EXISTS simulation_audit_tenant_isolation ON simulation_audit;
DROP POLICY IF EXISTS simulation_audit_tenant_insert ON simulation_audit;

-- ============================================
-- Create correct USING policies (for SELECT, UPDATE, DELETE)
-- ============================================

-- Simulation Templates
CREATE POLICY simulation_templates_tenant_isolation ON simulation_templates
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY simulation_templates_tenant_insert ON simulation_templates
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Simulations
CREATE POLICY simulations_tenant_isolation ON simulations
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY simulations_tenant_insert ON simulations
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Simulation Overrides
CREATE POLICY simulation_overrides_tenant_isolation ON simulation_overrides
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY simulation_overrides_tenant_insert ON simulation_overrides
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Simulation Runs
CREATE POLICY simulation_runs_tenant_isolation ON simulation_runs
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY simulation_runs_tenant_insert ON simulation_runs
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Simulation Results
CREATE POLICY simulation_results_tenant_isolation ON simulation_results
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY simulation_results_tenant_insert ON simulation_results
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Simulation Deltas
CREATE POLICY simulation_deltas_tenant_isolation ON simulation_deltas
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY simulation_deltas_tenant_insert ON simulation_deltas
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Simulation Audit
CREATE POLICY simulation_audit_tenant_isolation ON simulation_audit
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY simulation_audit_tenant_insert ON simulation_audit
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- migrate:down
-- No-op: This migration only fixes RLS policies
