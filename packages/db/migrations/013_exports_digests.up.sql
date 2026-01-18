-- migrate:up
-- Phase 10: Exports & Digests

-- ============================================
-- Exports Table
-- ============================================
CREATE TABLE IF NOT EXISTS exports (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
    export_type TEXT NOT NULL CHECK (export_type IN ('issues_csv', 'revrec_csv', 'contracts_csv', 'contracts_pdf', 'audit_bundle_pdf', 'executive_summary_pdf')),
    format TEXT NOT NULL CHECK (format IN ('csv', 'pdf', 'xlsx')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    requested_by TEXT REFERENCES users(id),
    options_json JSONB DEFAULT '{}',
    error_code TEXT,
    error_message TEXT,
    processing_lock TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_exports_tenant_id ON exports(tenant_id);
CREATE INDEX idx_exports_snapshot_id ON exports(snapshot_id);
CREATE INDEX idx_exports_status ON exports(status);
CREATE INDEX idx_exports_created_at ON exports(created_at DESC);

-- ============================================
-- Export Files Table
-- ============================================
CREATE TABLE IF NOT EXISTS export_files (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    export_id TEXT NOT NULL REFERENCES exports(id) ON DELETE CASCADE,
    s3_key TEXT NOT NULL,
    file_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    checksum_sha256 TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_export_files_tenant_id ON export_files(tenant_id);
CREATE INDEX idx_export_files_export_id ON export_files(export_id);

-- ============================================
-- Export Items Table (for traceability)
-- ============================================
CREATE TABLE IF NOT EXISTS export_items (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    export_id TEXT NOT NULL REFERENCES exports(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    metadata_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_export_items_tenant_id ON export_items(tenant_id);
CREATE INDEX idx_export_items_export_id ON export_items(export_id);
CREATE INDEX idx_export_items_item_type ON export_items(item_type);

-- ============================================
-- Export Schedules Table
-- ============================================
CREATE TABLE IF NOT EXISTS export_schedules (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    export_type TEXT NOT NULL CHECK (export_type IN ('issues_csv', 'revrec_csv', 'contracts_csv', 'contracts_pdf', 'audit_bundle_pdf', 'executive_summary_pdf')),
    cadence TEXT NOT NULL CHECK (cadence IN ('daily', 'weekly', 'monthly')),
    scope_json JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_export_schedules_tenant_id ON export_schedules(tenant_id);
CREATE INDEX idx_export_schedules_is_active ON export_schedules(is_active);

-- ============================================
-- Export Runs Table
-- ============================================
CREATE TABLE IF NOT EXISTS export_runs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    schedule_id TEXT NOT NULL REFERENCES export_schedules(id) ON DELETE CASCADE,
    export_id TEXT REFERENCES exports(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    error_code TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_export_runs_tenant_id ON export_runs(tenant_id);
CREATE INDEX idx_export_runs_schedule_id ON export_runs(schedule_id);
CREATE INDEX idx_export_runs_status ON export_runs(status);

-- ============================================
-- Export Audit Table
-- ============================================
CREATE TABLE IF NOT EXISTS export_audit (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    export_id TEXT NOT NULL REFERENCES exports(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('requested', 'started', 'completed', 'failed', 'downloaded', 'regenerated', 'cancelled', 'deleted')),
    actor_user_id TEXT REFERENCES users(id),
    details_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_export_audit_tenant_id ON export_audit(tenant_id);
CREATE INDEX idx_export_audit_export_id ON export_audit(export_id);
CREATE INDEX idx_export_audit_action ON export_audit(action);
CREATE INDEX idx_export_audit_created_at ON export_audit(created_at DESC);

-- ============================================
-- Digest Subscriptions Table
-- ============================================
CREATE TABLE IF NOT EXISTS digest_subscriptions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    cadence TEXT NOT NULL CHECK (cadence IN ('daily', 'weekly', 'monthly')),
    scope_json JSONB DEFAULT '{}',
    recipients_json JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_digest_subscriptions_tenant_id ON digest_subscriptions(tenant_id);
CREATE INDEX idx_digest_subscriptions_is_active ON digest_subscriptions(is_active);
CREATE INDEX idx_digest_subscriptions_cadence ON digest_subscriptions(cadence);

-- ============================================
-- Digest Runs Table
-- ============================================
CREATE TABLE IF NOT EXISTS digest_runs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    subscription_id TEXT NOT NULL REFERENCES digest_subscriptions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
    items_count INTEGER NOT NULL DEFAULT 0,
    recipients_count INTEGER NOT NULL DEFAULT 0,
    emails_sent INTEGER NOT NULL DEFAULT 0,
    emails_failed INTEGER NOT NULL DEFAULT 0,
    snapshot_id TEXT REFERENCES snapshots(id),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    error_code TEXT,
    error_message TEXT,
    content_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_digest_runs_tenant_id ON digest_runs(tenant_id);
CREATE INDEX idx_digest_runs_subscription_id ON digest_runs(subscription_id);
CREATE INDEX idx_digest_runs_status ON digest_runs(status);
CREATE INDEX idx_digest_runs_created_at ON digest_runs(created_at DESC);

-- ============================================
-- Enable RLS on all tables
-- ============================================
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_runs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies - Exports
-- ============================================
CREATE POLICY exports_tenant_isolation ON exports
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY exports_tenant_insert ON exports
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- RLS Policies - Export Files
-- ============================================
CREATE POLICY export_files_tenant_isolation ON export_files
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY export_files_tenant_insert ON export_files
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- RLS Policies - Export Items
-- ============================================
CREATE POLICY export_items_tenant_isolation ON export_items
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY export_items_tenant_insert ON export_items
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- RLS Policies - Export Schedules
-- ============================================
CREATE POLICY export_schedules_tenant_isolation ON export_schedules
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY export_schedules_tenant_insert ON export_schedules
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- RLS Policies - Export Runs
-- ============================================
CREATE POLICY export_runs_tenant_isolation ON export_runs
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY export_runs_tenant_insert ON export_runs
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- RLS Policies - Export Audit
-- ============================================
CREATE POLICY export_audit_tenant_isolation ON export_audit
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY export_audit_tenant_insert ON export_audit
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- RLS Policies - Digest Subscriptions
-- ============================================
CREATE POLICY digest_subscriptions_tenant_isolation ON digest_subscriptions
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY digest_subscriptions_tenant_insert ON digest_subscriptions
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- RLS Policies - Digest Runs
-- ============================================
CREATE POLICY digest_runs_tenant_isolation ON digest_runs
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY digest_runs_tenant_insert ON digest_runs
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- migrate:down
DROP TABLE IF EXISTS digest_runs CASCADE;
DROP TABLE IF EXISTS digest_subscriptions CASCADE;
DROP TABLE IF EXISTS export_audit CASCADE;
DROP TABLE IF EXISTS export_runs CASCADE;
DROP TABLE IF EXISTS export_schedules CASCADE;
DROP TABLE IF EXISTS export_items CASCADE;
DROP TABLE IF EXISTS export_files CASCADE;
DROP TABLE IF EXISTS exports CASCADE;
