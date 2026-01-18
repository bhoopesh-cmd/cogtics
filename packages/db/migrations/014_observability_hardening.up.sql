-- migrate:up
-- Phase 11: Observability & Hardening
-- Dead Letter Queue and Data Integrity Tables

-- =====================================================
-- Dead Letter Queue Table
-- =====================================================
CREATE TABLE dead_letter_jobs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    original_job_id TEXT NOT NULL,
    queue_name TEXT NOT NULL,
    job_type TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    error_message TEXT,
    error_stack TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    first_failed_at TIMESTAMPTZ NOT NULL,
    last_failed_at TIMESTAMPTZ NOT NULL,
    requeued_at TIMESTAMPTZ,
    requeued_by TEXT REFERENCES users(id),
    discarded_at TIMESTAMPTZ,
    discarded_by TEXT REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'failed' CHECK (status IN ('failed', 'requeued', 'discarded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for listing by tenant and status
CREATE INDEX idx_dead_letter_jobs_tenant_status ON dead_letter_jobs(tenant_id, status);

-- Index for filtering by queue and job type
CREATE INDEX idx_dead_letter_jobs_queue ON dead_letter_jobs(queue_name, job_type);

-- Index for ordering by failure time
CREATE INDEX idx_dead_letter_jobs_last_failed ON dead_letter_jobs(last_failed_at DESC);

-- RLS for dead_letter_jobs
ALTER TABLE dead_letter_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY dead_letter_jobs_tenant_isolation ON dead_letter_jobs
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));


-- =====================================================
-- Data Integrity Check Runs Table
-- =====================================================
CREATE TABLE integrity_check_runs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    snapshot_id TEXT REFERENCES snapshots(id),
    check_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    issues_found INTEGER DEFAULT 0,
    details_json JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for listing by tenant and snapshot
CREATE INDEX idx_integrity_check_runs_tenant ON integrity_check_runs(tenant_id, snapshot_id);

-- Index for filtering by status
CREATE INDEX idx_integrity_check_runs_status ON integrity_check_runs(status);

-- RLS for integrity_check_runs
ALTER TABLE integrity_check_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY integrity_check_runs_tenant_isolation ON integrity_check_runs
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));


-- =====================================================
-- Replay Audit Trail Table
-- =====================================================
CREATE TABLE replay_audit (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    replay_type TEXT NOT NULL CHECK (replay_type IN ('snapshot', 'detection', 'evidence', 'backfill')),
    target_id TEXT NOT NULL,
    source_description TEXT,
    initiated_by TEXT REFERENCES users(id),
    job_id TEXT REFERENCES jobs(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    result_json JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for listing by tenant
CREATE INDEX idx_replay_audit_tenant ON replay_audit(tenant_id);

-- Index for filtering by target
CREATE INDEX idx_replay_audit_target ON replay_audit(target_id);

-- RLS for replay_audit
ALTER TABLE replay_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY replay_audit_tenant_isolation ON replay_audit
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- migrate:down
DROP TABLE IF EXISTS replay_audit CASCADE;
DROP TABLE IF EXISTS integrity_check_runs CASCADE;
DROP TABLE IF EXISTS dead_letter_jobs CASCADE;
