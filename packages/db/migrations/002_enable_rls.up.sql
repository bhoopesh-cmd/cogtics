-- migrate:up
-- Enable RLS

-- Enable Row Level Security on tenant-scoped tables
-- RLS policies check current_setting('app.tenant_id') against row tenant_id

-- ============================================
-- Memberships RLS
-- ============================================
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY memberships_tenant_isolation ON memberships
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY memberships_tenant_insert ON memberships
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- Audit Logs RLS
-- ============================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_tenant_isolation ON audit_logs
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY audit_logs_tenant_insert ON audit_logs
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- Idempotency Keys RLS
-- ============================================
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY idempotency_keys_tenant_isolation ON idempotency_keys
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY idempotency_keys_tenant_insert ON idempotency_keys
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- Jobs RLS
-- ============================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY jobs_tenant_isolation ON jobs
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY jobs_tenant_insert ON jobs
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- Storage Objects RLS
-- ============================================
ALTER TABLE storage_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY storage_objects_tenant_isolation ON storage_objects
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY storage_objects_tenant_insert ON storage_objects
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- migrate:down
-- RLS policies will be dropped when tables are dropped

