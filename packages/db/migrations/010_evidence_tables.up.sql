-- migrate:up
-- Phase 8: Evidence Generation
-- Immutable, audit-grade evidence packs for detected issues

-- ============================================
-- Issue Evidence table
-- Primary evidence pack metadata per issue
-- ============================================
CREATE TABLE issue_evidence (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    issue_id VARCHAR(64) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    evidence_version INTEGER NOT NULL DEFAULT 1,
    evidence_type VARCHAR(20) NOT NULL DEFAULT 'full' CHECK (evidence_type IN (
        'full', 'summary', 'calculation', 'clause', 'source'
    )),
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    completeness_score NUMERIC(5, 4) NOT NULL DEFAULT 0 CHECK (completeness_score >= 0 AND completeness_score <= 1),
    completeness_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    s3_key VARCHAR(500),
    rule_id VARCHAR(20),
    rule_version VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (issue_id, evidence_version)
);

CREATE INDEX idx_issue_evidence_tenant ON issue_evidence(tenant_id);
CREATE INDEX idx_issue_evidence_snapshot ON issue_evidence(snapshot_id);
CREATE INDEX idx_issue_evidence_issue ON issue_evidence(issue_id);
CREATE INDEX idx_issue_evidence_type ON issue_evidence(evidence_type);
CREATE INDEX idx_issue_evidence_completeness ON issue_evidence(completeness_score);
CREATE INDEX idx_issue_evidence_created ON issue_evidence(created_at DESC);

-- ============================================
-- Issue Evidence Sources table
-- Links evidence to source records with S3 keys
-- ============================================
CREATE TABLE issue_evidence_sources (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    evidence_id VARCHAR(64) NOT NULL REFERENCES issue_evidence(id) ON DELETE CASCADE,
    issue_id VARCHAR(64) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    source_type VARCHAR(30) NOT NULL CHECK (source_type IN (
        'contract', 'invoice', 'invoice_line', 'payment', 'usage_event',
        'schedule', 'obligation', 'customer', 'product', 'contract_term',
        'contract_version', 'contract_document'
    )),
    source_id VARCHAR(64) NOT NULL,
    source_system VARCHAR(50),
    source_external_id VARCHAR(255),
    field_name VARCHAR(100),
    field_value_json JSONB,
    s3_key VARCHAR(500),
    snapshot_value_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issue_evidence_sources_tenant ON issue_evidence_sources(tenant_id);
CREATE INDEX idx_issue_evidence_sources_evidence ON issue_evidence_sources(evidence_id);
CREATE INDEX idx_issue_evidence_sources_issue ON issue_evidence_sources(issue_id);
CREATE INDEX idx_issue_evidence_sources_source ON issue_evidence_sources(source_type, source_id);

-- ============================================
-- Issue Evidence Calculations table
-- Stores reproducible calculation inputs/outputs
-- ============================================
CREATE TABLE issue_evidence_calculations (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    evidence_id VARCHAR(64) NOT NULL REFERENCES issue_evidence(id) ON DELETE CASCADE,
    issue_id VARCHAR(64) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    calc_name VARCHAR(100) NOT NULL,
    calc_type VARCHAR(30) NOT NULL CHECK (calc_type IN (
        'expected_amount', 'actual_amount', 'variance', 'proration',
        'discount', 'fx_conversion', 'revenue_allocation', 'custom'
    )),
    formula VARCHAR(500),
    inputs_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    outputs_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    rule_id VARCHAR(20),
    rule_version VARCHAR(20),
    sequence_number INTEGER NOT NULL DEFAULT 0,
    is_reproducible BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issue_evidence_calculations_tenant ON issue_evidence_calculations(tenant_id);
CREATE INDEX idx_issue_evidence_calculations_evidence ON issue_evidence_calculations(evidence_id);
CREATE INDEX idx_issue_evidence_calculations_issue ON issue_evidence_calculations(issue_id);
CREATE INDEX idx_issue_evidence_calculations_type ON issue_evidence_calculations(calc_type);
CREATE INDEX idx_issue_evidence_calculations_sequence ON issue_evidence_calculations(evidence_id, sequence_number);

-- ============================================
-- Issue Evidence Clauses table
-- Contract clause excerpts with offsets
-- ============================================
CREATE TABLE issue_evidence_clauses (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    evidence_id VARCHAR(64) NOT NULL REFERENCES issue_evidence(id) ON DELETE CASCADE,
    issue_id VARCHAR(64) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    clause_id VARCHAR(64) REFERENCES contract_clauses(id) ON DELETE SET NULL,
    contract_id VARCHAR(64) REFERENCES contracts(id) ON DELETE SET NULL,
    contract_version_id VARCHAR(64) REFERENCES contract_versions(id) ON DELETE SET NULL,
    document_id VARCHAR(64) REFERENCES contract_documents(id) ON DELETE SET NULL,
    clause_type VARCHAR(30) CHECK (clause_type IN ('heading', 'section', 'paragraph', 'list_item', 'excerpt')),
    clause_label VARCHAR(100),
    excerpt TEXT NOT NULL,
    full_text_s3_key VARCHAR(500),
    start_offset INTEGER,
    end_offset INTEGER,
    page_number INTEGER,
    relevance_score NUMERIC(3, 2) CHECK (relevance_score >= 0 AND relevance_score <= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issue_evidence_clauses_tenant ON issue_evidence_clauses(tenant_id);
CREATE INDEX idx_issue_evidence_clauses_evidence ON issue_evidence_clauses(evidence_id);
CREATE INDEX idx_issue_evidence_clauses_issue ON issue_evidence_clauses(issue_id);
CREATE INDEX idx_issue_evidence_clauses_clause ON issue_evidence_clauses(clause_id);
CREATE INDEX idx_issue_evidence_clauses_contract ON issue_evidence_clauses(contract_id);

-- ============================================
-- Issue Evidence Audit table
-- Versioned audit trail for evidence regeneration
-- ============================================
CREATE TABLE issue_evidence_audit (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    issue_id VARCHAR(64) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    evidence_id VARCHAR(64) REFERENCES issue_evidence(id) ON DELETE SET NULL,
    evidence_version INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN (
        'generated', 'regenerated', 'failed', 'expired', 'archived'
    )),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed'
    )),
    trigger_type VARCHAR(20) NOT NULL DEFAULT 'auto' CHECK (trigger_type IN (
        'auto', 'manual', 'scheduled', 'detection_run'
    )),
    actor_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    previous_version INTEGER,
    completeness_score NUMERIC(5, 4),
    processing_time_ms INTEGER,
    error_code VARCHAR(50),
    error_message TEXT,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issue_evidence_audit_tenant ON issue_evidence_audit(tenant_id);
CREATE INDEX idx_issue_evidence_audit_issue ON issue_evidence_audit(issue_id);
CREATE INDEX idx_issue_evidence_audit_evidence ON issue_evidence_audit(evidence_id);
CREATE INDEX idx_issue_evidence_audit_action ON issue_evidence_audit(action);
CREATE INDEX idx_issue_evidence_audit_status ON issue_evidence_audit(status);
CREATE INDEX idx_issue_evidence_audit_generated ON issue_evidence_audit(generated_at DESC);

-- ============================================
-- Evidence Generation Runs table
-- Tracks batch evidence generation jobs
-- ============================================
CREATE TABLE evidence_generation_runs (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    detection_run_id VARCHAR(64) REFERENCES detection_runs(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'running', 'completed', 'failed', 'cancelled'
    )),
    total_issues INTEGER DEFAULT 0,
    processed_issues INTEGER DEFAULT 0,
    failed_issues INTEGER DEFAULT 0,
    skipped_issues INTEGER DEFAULT 0,
    avg_completeness_score NUMERIC(5, 4),
    stats_json JSONB DEFAULT '{}'::jsonb,
    error_code VARCHAR(50),
    error_message TEXT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_generation_runs_tenant ON evidence_generation_runs(tenant_id);
CREATE INDEX idx_evidence_generation_runs_snapshot ON evidence_generation_runs(snapshot_id);
CREATE INDEX idx_evidence_generation_runs_detection ON evidence_generation_runs(detection_run_id);
CREATE INDEX idx_evidence_generation_runs_status ON evidence_generation_runs(status);
CREATE INDEX idx_evidence_generation_runs_created ON evidence_generation_runs(created_at DESC);

-- ============================================
-- Enable RLS on new tables
-- ============================================

-- Issue Evidence RLS
ALTER TABLE issue_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY issue_evidence_tenant_isolation ON issue_evidence
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY issue_evidence_tenant_insert ON issue_evidence
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Issue Evidence Sources RLS
ALTER TABLE issue_evidence_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY issue_evidence_sources_tenant_isolation ON issue_evidence_sources
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY issue_evidence_sources_tenant_insert ON issue_evidence_sources
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Issue Evidence Calculations RLS
ALTER TABLE issue_evidence_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY issue_evidence_calculations_tenant_isolation ON issue_evidence_calculations
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY issue_evidence_calculations_tenant_insert ON issue_evidence_calculations
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Issue Evidence Clauses RLS
ALTER TABLE issue_evidence_clauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY issue_evidence_clauses_tenant_isolation ON issue_evidence_clauses
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY issue_evidence_clauses_tenant_insert ON issue_evidence_clauses
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Issue Evidence Audit RLS
ALTER TABLE issue_evidence_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY issue_evidence_audit_tenant_isolation ON issue_evidence_audit
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY issue_evidence_audit_tenant_insert ON issue_evidence_audit
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Evidence Generation Runs RLS
ALTER TABLE evidence_generation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY evidence_generation_runs_tenant_isolation ON evidence_generation_runs
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY evidence_generation_runs_tenant_insert ON evidence_generation_runs
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- Helpful views for evidence
-- ============================================

-- View: Evidence with issue details
CREATE VIEW evidence_with_issue_details AS
SELECT
    e.id,
    e.tenant_id,
    e.snapshot_id,
    e.issue_id,
    e.evidence_version,
    e.evidence_type,
    e.title,
    e.summary,
    e.completeness_score,
    e.completeness_breakdown,
    e.s3_key,
    e.created_at,
    i.rule_id,
    i.rule_version,
    i.category AS issue_category,
    i.severity AS issue_severity,
    i.status AS issue_status,
    i.impact_amount,
    i.currency,
    i.contract_id,
    i.invoice_id,
    i.customer_id,
    c.name AS contract_name,
    cust.name AS customer_name
FROM issue_evidence e
INNER JOIN issues i ON i.id = e.issue_id
LEFT JOIN contracts c ON c.id = i.contract_id
LEFT JOIN customers cust ON cust.id = i.customer_id;

-- View: Evidence completeness summary by snapshot
CREATE VIEW evidence_completeness_summary AS
SELECT
    tenant_id,
    snapshot_id,
    COUNT(*) AS total_evidence,
    COUNT(DISTINCT issue_id) AS issues_with_evidence,
    AVG(completeness_score) AS avg_completeness,
    COUNT(*) FILTER (WHERE completeness_score >= 0.9) AS complete_count,
    COUNT(*) FILTER (WHERE completeness_score >= 0.7 AND completeness_score < 0.9) AS partial_count,
    COUNT(*) FILTER (WHERE completeness_score < 0.7) AS incomplete_count
FROM issue_evidence
GROUP BY tenant_id, snapshot_id;

-- View: Latest evidence per issue
CREATE VIEW latest_issue_evidence AS
SELECT DISTINCT ON (issue_id)
    id,
    tenant_id,
    snapshot_id,
    issue_id,
    evidence_version,
    evidence_type,
    title,
    summary,
    data_json,
    completeness_score,
    completeness_breakdown,
    s3_key,
    rule_id,
    rule_version,
    created_at
FROM issue_evidence
ORDER BY issue_id, evidence_version DESC;

-- migrate:down
DROP VIEW IF EXISTS latest_issue_evidence CASCADE;
DROP VIEW IF EXISTS evidence_completeness_summary CASCADE;
DROP VIEW IF EXISTS evidence_with_issue_details CASCADE;
DROP TABLE IF EXISTS evidence_generation_runs CASCADE;
DROP TABLE IF EXISTS issue_evidence_audit CASCADE;
DROP TABLE IF EXISTS issue_evidence_clauses CASCADE;
DROP TABLE IF EXISTS issue_evidence_calculations CASCADE;
DROP TABLE IF EXISTS issue_evidence_sources CASCADE;
DROP TABLE IF EXISTS issue_evidence CASCADE;
