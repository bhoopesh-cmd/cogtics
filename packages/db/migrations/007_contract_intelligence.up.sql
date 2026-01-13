-- migrate:up
-- Phase 5: Contract Intelligence
-- Clause extraction, term identification, override workflows, and readiness gating

-- ============================================
-- Contract Documents table
-- Links PDF files to contracts with extraction status
-- ============================================
CREATE TABLE contract_documents (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    contract_id VARCHAR(64) REFERENCES contracts(id) ON DELETE SET NULL,
    contract_version_id VARCHAR(64) REFERENCES contract_versions(id) ON DELETE SET NULL,
    source_system VARCHAR(50) NOT NULL DEFAULT 'manual_upload',
    source_id VARCHAR(255),
    s3_key VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    checksum VARCHAR(64),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'extracting', 'extracted', 'failed')),
    page_count INTEGER,
    extracted_text TEXT,
    extracted_text_length INTEGER,
    error_message TEXT,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    extracted_at TIMESTAMPTZ
);

CREATE INDEX idx_contract_documents_tenant ON contract_documents(tenant_id);
CREATE INDEX idx_contract_documents_snapshot ON contract_documents(snapshot_id);
CREATE INDEX idx_contract_documents_contract ON contract_documents(contract_id);
CREATE INDEX idx_contract_documents_contract_version ON contract_documents(contract_version_id);
CREATE INDEX idx_contract_documents_status ON contract_documents(status);

-- ============================================
-- Contract Clauses table
-- Extracted clause segments from documents
-- ============================================
CREATE TABLE contract_clauses (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    contract_version_id VARCHAR(64) NOT NULL REFERENCES contract_versions(id) ON DELETE CASCADE,
    document_id VARCHAR(64) NOT NULL REFERENCES contract_documents(id) ON DELETE CASCADE,
    clause_type VARCHAR(30) NOT NULL CHECK (clause_type IN ('heading', 'section', 'paragraph', 'list_item')),
    clause_label VARCHAR(100),
    text TEXT NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    page_number INTEGER,
    sequence_number INTEGER NOT NULL,
    parent_clause_id VARCHAR(64) REFERENCES contract_clauses(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contract_clauses_tenant ON contract_clauses(tenant_id);
CREATE INDEX idx_contract_clauses_snapshot ON contract_clauses(snapshot_id);
CREATE INDEX idx_contract_clauses_version ON contract_clauses(contract_version_id);
CREATE INDEX idx_contract_clauses_document ON contract_clauses(document_id);
CREATE INDEX idx_contract_clauses_type ON contract_clauses(clause_type);
CREATE INDEX idx_contract_clauses_sequence ON contract_clauses(contract_version_id, sequence_number);

-- ============================================
-- Contract Term Overrides table
-- User corrections to extracted terms
-- ============================================
CREATE TABLE contract_term_overrides (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    term_id VARCHAR(64) NOT NULL REFERENCES contract_terms(id) ON DELETE CASCADE,
    original_value_json JSONB NOT NULL,
    override_value_json JSONB NOT NULL,
    actor_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contract_term_overrides_tenant ON contract_term_overrides(tenant_id);
CREATE INDEX idx_contract_term_overrides_snapshot ON contract_term_overrides(snapshot_id);
CREATE INDEX idx_contract_term_overrides_term ON contract_term_overrides(term_id);
CREATE INDEX idx_contract_term_overrides_actor ON contract_term_overrides(actor_user_id);

-- ============================================
-- Contract Readiness table
-- Readiness status per contract version
-- ============================================
CREATE TABLE contract_readiness (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    contract_version_id VARCHAR(64) NOT NULL REFERENCES contract_versions(id) ON DELETE CASCADE,
    readiness_status VARCHAR(20) NOT NULL DEFAULT 'incomplete' CHECK (readiness_status IN ('ready', 'needs_review', 'incomplete')),
    confidence_score NUMERIC(5, 2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
    required_terms_count INTEGER NOT NULL DEFAULT 0,
    extracted_terms_count INTEGER NOT NULL DEFAULT 0,
    missing_terms_json JSONB DEFAULT '[]'::jsonb,
    low_confidence_terms_json JSONB DEFAULT '[]'::jsonb,
    reviewed_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contract_readiness_tenant ON contract_readiness(tenant_id);
CREATE INDEX idx_contract_readiness_snapshot ON contract_readiness(snapshot_id);
CREATE INDEX idx_contract_readiness_version ON contract_readiness(contract_version_id);
CREATE INDEX idx_contract_readiness_status ON contract_readiness(readiness_status);
CREATE UNIQUE INDEX idx_contract_readiness_unique ON contract_readiness(contract_version_id);

-- ============================================
-- Extend contract_terms table
-- Add columns for Phase 5 contract intelligence
-- ============================================
ALTER TABLE contract_terms
    ADD COLUMN IF NOT EXISTS source_clause_id VARCHAR(64) REFERENCES contract_clauses(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS extraction_method VARCHAR(20) DEFAULT 'rule' CHECK (extraction_method IN ('rule', 'pattern', 'llm')),
    ADD COLUMN IF NOT EXISTS is_overridden BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS override_id VARCHAR(64) REFERENCES contract_term_overrides(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS matched_text TEXT,
    ADD COLUMN IF NOT EXISTS start_offset INTEGER,
    ADD COLUMN IF NOT EXISTS end_offset INTEGER;

CREATE INDEX IF NOT EXISTS idx_contract_terms_clause ON contract_terms(source_clause_id);
CREATE INDEX IF NOT EXISTS idx_contract_terms_overridden ON contract_terms(is_overridden) WHERE is_overridden = true;

-- ============================================
-- Enable RLS on new tables
-- ============================================

-- Contract Documents RLS
ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_documents_tenant_isolation ON contract_documents
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY contract_documents_tenant_insert ON contract_documents
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Contract Clauses RLS
ALTER TABLE contract_clauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_clauses_tenant_isolation ON contract_clauses
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY contract_clauses_tenant_insert ON contract_clauses
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Contract Term Overrides RLS
ALTER TABLE contract_term_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_term_overrides_tenant_isolation ON contract_term_overrides
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY contract_term_overrides_tenant_insert ON contract_term_overrides
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Contract Readiness RLS
ALTER TABLE contract_readiness ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_readiness_tenant_isolation ON contract_readiness
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY contract_readiness_tenant_insert ON contract_readiness
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- Helpful views for contract intelligence
-- ============================================

-- View: Contracts with readiness status
CREATE VIEW contracts_with_readiness AS
SELECT
    c.*,
    cv.id AS version_id,
    cv.version,
    cr.readiness_status,
    cr.confidence_score,
    cr.required_terms_count,
    cr.extracted_terms_count,
    cr.reviewed_at
FROM contracts c
LEFT JOIN contract_versions cv ON cv.contract_id = c.id
    AND cv.version = (
        SELECT MAX(cv2.version)
        FROM contract_versions cv2
        WHERE cv2.contract_id = c.id
    )
LEFT JOIN contract_readiness cr ON cr.contract_version_id = cv.id;

-- View: Terms with override values
CREATE VIEW terms_with_overrides AS
SELECT
    ct.*,
    CASE
        WHEN ct.is_overridden AND cto.override_value_json IS NOT NULL
        THEN cto.override_value_json
        ELSE ct.value_json
    END AS effective_value_json,
    cto.actor_user_id AS override_actor_id,
    cto.reason AS override_reason,
    cto.created_at AS override_created_at
FROM contract_terms ct
LEFT JOIN contract_term_overrides cto ON cto.id = ct.override_id;

-- migrate:down
DROP VIEW IF EXISTS effective_contract_terms CASCADE;
DROP TABLE IF EXISTS contract_term_overrides CASCADE;
DROP TABLE IF EXISTS contract_readiness CASCADE;
DROP TABLE IF EXISTS contract_terms CASCADE;
DROP TABLE IF EXISTS contract_clauses CASCADE;
DROP TABLE IF EXISTS contract_documents CASCADE;

