-- migrate:up
-- Connector tables for Phase 1

-- ============================================
-- Connections table
-- ============================================
CREATE TABLE connections (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('stripe', 'salesforce')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'error', 'disconnected')),
    display_name VARCHAR(255),
    config_json JSONB,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_sync_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_error_at TIMESTAMPTZ,
    last_error_code VARCHAR(100),
    last_error_message TEXT
);

CREATE INDEX idx_connections_tenant ON connections(tenant_id);
CREATE INDEX idx_connections_provider ON connections(provider);
CREATE INDEX idx_connections_status ON connections(status);

-- ============================================
-- Connection Credentials table (encrypted tokens)
-- ============================================
CREATE TABLE connection_credentials (
    id VARCHAR(64) PRIMARY KEY,
    connection_id VARCHAR(64) NOT NULL UNIQUE REFERENCES connections(id) ON DELETE CASCADE,
    access_token_enc TEXT NOT NULL,
    refresh_token_enc TEXT,
    token_type VARCHAR(50),
    scopes TEXT[],
    expires_at TIMESTAMPTZ,
    external_account_id VARCHAR(255),
    instance_url VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_refreshed_at TIMESTAMPTZ
);

CREATE INDEX idx_connection_credentials_connection ON connection_credentials(connection_id);

-- ============================================
-- Connector Schemas table
-- ============================================
CREATE TABLE connector_schemas (
    id VARCHAR(64) PRIMARY KEY,
    connection_id VARCHAR(64) NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    object_type VARCHAR(100) NOT NULL,
    schema_json JSONB NOT NULL,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(connection_id, object_type)
);

CREATE INDEX idx_connector_schemas_connection ON connector_schemas(connection_id);

-- ============================================
-- Connector Cursors table
-- ============================================
CREATE TABLE connector_cursors (
    id VARCHAR(64) PRIMARY KEY,
    connection_id VARCHAR(64) NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    object_type VARCHAR(100) NOT NULL,
    cursor_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ,
    UNIQUE(connection_id, object_type)
);

CREATE INDEX idx_connector_cursors_connection ON connector_cursors(connection_id);

-- ============================================
-- Connector Runs table
-- ============================================
CREATE TABLE connector_runs (
    id VARCHAR(64) PRIMARY KEY,
    connection_id VARCHAR(64) NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    run_type VARCHAR(20) NOT NULL CHECK (run_type IN ('full', 'incremental')),
    status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    records_fetched INTEGER DEFAULT 0,
    objects_fetched INTEGER DEFAULT 0,
    error_code VARCHAR(100),
    error_message TEXT,
    idempotency_key_id VARCHAR(64) REFERENCES idempotency_keys(id) ON DELETE SET NULL,
    job_id VARCHAR(64) REFERENCES jobs(id) ON DELETE SET NULL
);

CREATE INDEX idx_connector_runs_connection ON connector_runs(connection_id);
CREATE INDEX idx_connector_runs_tenant ON connector_runs(tenant_id);
CREATE INDEX idx_connector_runs_status ON connector_runs(status);
CREATE INDEX idx_connector_runs_started ON connector_runs(started_at DESC);

-- ============================================
-- Raw Batches table
-- ============================================
CREATE TABLE raw_batches (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    connection_id VARCHAR(64) NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    run_id VARCHAR(64) NOT NULL REFERENCES connector_runs(id) ON DELETE CASCADE,
    object_type VARCHAR(100) NOT NULL,
    s3_key VARCHAR(1024) NOT NULL,
    record_count INTEGER NOT NULL,
    min_updated_at TIMESTAMPTZ,
    max_updated_at TIMESTAMPTZ,
    checksum VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raw_batches_tenant ON raw_batches(tenant_id);
CREATE INDEX idx_raw_batches_connection ON raw_batches(connection_id);
CREATE INDEX idx_raw_batches_run ON raw_batches(run_id);
CREATE INDEX idx_raw_batches_object ON raw_batches(object_type);

-- ============================================
-- Enable RLS on connector tables
-- ============================================

-- Connections RLS
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY connections_tenant_isolation ON connections
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY connections_tenant_insert ON connections
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Connector Runs RLS
ALTER TABLE connector_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY connector_runs_tenant_isolation ON connector_runs
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY connector_runs_tenant_insert ON connector_runs
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Raw Batches RLS
ALTER TABLE raw_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY raw_batches_tenant_isolation ON raw_batches
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY raw_batches_tenant_insert ON raw_batches
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- migrate:down
DROP TABLE IF EXISTS raw_batches CASCADE;
DROP TABLE IF EXISTS connector_runs CASCADE;
DROP TABLE IF EXISTS connection_sync_cursors CASCADE;
DROP TABLE IF EXISTS connections CASCADE;

