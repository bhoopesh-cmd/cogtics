-- migrate:up
-- Phase 4: Upload Tables for CSV/PDF Manual Uploads
-- All tables are tenant scoped with RLS

-- ============================================
-- Uploads - Upload sessions with status tracking
-- ============================================
CREATE TABLE uploads (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('csv', 'pdf')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'processing', 'completed', 'failed')),
    entity_type VARCHAR(50),
    display_name VARCHAR(255),
    file_count INTEGER NOT NULL DEFAULT 0,
    total_rows INTEGER,
    valid_rows INTEGER,
    error_count INTEGER NOT NULL DEFAULT 0,
    created_by VARCHAR(36) REFERENCES users(id),
    error_code VARCHAR(50),
    error_message TEXT,
    metadata_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_uploads_tenant ON uploads(tenant_id);
CREATE INDEX idx_uploads_tenant_status ON uploads(tenant_id, status);
CREATE INDEX idx_uploads_created_by ON uploads(created_by);

-- ============================================
-- Upload Files - Files within an upload
-- ============================================
CREATE TABLE upload_files (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    upload_id VARCHAR(36) NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    checksum VARCHAR(64),
    size_bytes BIGINT NOT NULL DEFAULT 0,
    extracted_text_json JSONB,
    metadata_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_upload_files_tenant ON upload_files(tenant_id);
CREATE INDEX idx_upload_files_upload ON upload_files(upload_id);

-- ============================================
-- Upload Mappings - Column mappings for CSV
-- ============================================
CREATE TABLE upload_mappings (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    upload_id VARCHAR(36) NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    mapping_json JSONB NOT NULL,
    validation_rules_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(upload_id, entity_type)
);

CREATE INDEX idx_upload_mappings_tenant ON upload_mappings(tenant_id);
CREATE INDEX idx_upload_mappings_upload ON upload_mappings(upload_id);

-- ============================================
-- Upload Parse Runs - Parse job runs with stats
-- ============================================
CREATE TABLE upload_parse_runs (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    upload_id VARCHAR(36) NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
    file_id VARCHAR(36) REFERENCES upload_files(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    run_number INTEGER NOT NULL DEFAULT 1,
    stats_json JSONB NOT NULL DEFAULT '{}',
    error_code VARCHAR(50),
    error_message TEXT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_upload_parse_runs_tenant ON upload_parse_runs(tenant_id);
CREATE INDEX idx_upload_parse_runs_upload ON upload_parse_runs(upload_id);
CREATE INDEX idx_upload_parse_runs_status ON upload_parse_runs(tenant_id, status);

-- ============================================
-- Upload Parse Errors - Row-level parse errors
-- ============================================
CREATE TABLE upload_parse_errors (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    upload_id VARCHAR(36) NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
    parse_run_id VARCHAR(36) NOT NULL REFERENCES upload_parse_runs(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    field VARCHAR(100),
    error_type VARCHAR(50) NOT NULL,
    error_message TEXT NOT NULL,
    raw_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_upload_parse_errors_tenant ON upload_parse_errors(tenant_id);
CREATE INDEX idx_upload_parse_errors_upload ON upload_parse_errors(upload_id);
CREATE INDEX idx_upload_parse_errors_run ON upload_parse_errors(parse_run_id);

-- ============================================
-- Upload Templates - Predefined CSV templates
-- ============================================
CREATE TABLE upload_templates (
    id VARCHAR(36) PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    columns_json JSONB NOT NULL,
    sample_data_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default templates
INSERT INTO upload_templates (id, entity_type, display_name, description, columns_json, sample_data_json) VALUES
('tpl_customers', 'customer', 'Customers', 'Import customer records', 
 '[{"name":"external_id","label":"External ID","required":true,"type":"string"},{"name":"name","label":"Company Name","required":true,"type":"string"},{"name":"email","label":"Email","required":false,"type":"email"},{"name":"phone","label":"Phone","required":false,"type":"string"},{"name":"billing_address","label":"Billing Address","required":false,"type":"string"},{"name":"tax_id","label":"Tax ID","required":false,"type":"string"}]',
 '[{"external_id":"CUST001","name":"Acme Inc","email":"billing@acme.com","phone":"+1-555-0100","billing_address":"123 Main St, NYC","tax_id":"12-3456789"}]'),
('tpl_invoices', 'invoice', 'Invoices', 'Import invoice records',
 '[{"name":"external_id","label":"Invoice Number","required":true,"type":"string"},{"name":"customer_id","label":"Customer ID","required":true,"type":"string"},{"name":"invoice_date","label":"Invoice Date","required":true,"type":"date"},{"name":"due_date","label":"Due Date","required":false,"type":"date"},{"name":"total","label":"Total Amount","required":true,"type":"number"},{"name":"currency","label":"Currency","required":false,"type":"string"},{"name":"status","label":"Status","required":false,"type":"string"}]',
 '[{"external_id":"INV-001","customer_id":"CUST001","invoice_date":"2024-01-15","due_date":"2024-02-15","total":"1500.00","currency":"USD","status":"open"}]'),
('tpl_contracts', 'contract', 'Contracts', 'Import contract records',
 '[{"name":"external_id","label":"Contract ID","required":true,"type":"string"},{"name":"customer_id","label":"Customer ID","required":true,"type":"string"},{"name":"name","label":"Contract Name","required":true,"type":"string"},{"name":"start_date","label":"Start Date","required":true,"type":"date"},{"name":"end_date","label":"End Date","required":false,"type":"date"},{"name":"value","label":"Contract Value","required":false,"type":"number"},{"name":"status","label":"Status","required":false,"type":"string"}]',
 '[{"external_id":"CTR-001","customer_id":"CUST001","name":"Enterprise Agreement","start_date":"2024-01-01","end_date":"2024-12-31","value":"50000.00","status":"active"}]');

-- ============================================
-- Enable Row Level Security
-- ============================================

-- Uploads RLS
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY uploads_tenant_isolation ON uploads
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY uploads_tenant_insert ON uploads
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Upload Files RLS
ALTER TABLE upload_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY upload_files_tenant_isolation ON upload_files
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY upload_files_tenant_insert ON upload_files
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Upload Mappings RLS
ALTER TABLE upload_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY upload_mappings_tenant_isolation ON upload_mappings
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY upload_mappings_tenant_insert ON upload_mappings
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Upload Parse Runs RLS
ALTER TABLE upload_parse_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY upload_parse_runs_tenant_isolation ON upload_parse_runs
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY upload_parse_runs_tenant_insert ON upload_parse_runs
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Upload Parse Errors RLS
ALTER TABLE upload_parse_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY upload_parse_errors_tenant_isolation ON upload_parse_errors
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY upload_parse_errors_tenant_insert ON upload_parse_errors
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- migrate:down
DROP TABLE IF EXISTS upload_parse_errors CASCADE;
DROP TABLE IF EXISTS upload_parse_runs CASCADE;
DROP TABLE IF EXISTS upload_files CASCADE;
DROP TABLE IF EXISTS uploads CASCADE;
