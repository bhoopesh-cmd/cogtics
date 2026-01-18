-- migrate:up
-- Phase: Contract Intelligence Engine - Bundles, Precedence, and Review Queue
-- Adds contract bundling, document hierarchy, term conflicts, and review workflows

-- ============================================
-- Contract Bundles table
-- Groups related documents (MSA + Order Forms + Amendments)
-- ============================================
CREATE TABLE contract_bundles (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    master_contract_id VARCHAR(64) REFERENCES contracts(id) ON DELETE SET NULL,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'superseded')),
    metadata_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contract_bundles_tenant ON contract_bundles(tenant_id);
CREATE INDEX idx_contract_bundles_snapshot ON contract_bundles(snapshot_id);
CREATE INDEX idx_contract_bundles_master ON contract_bundles(master_contract_id);
CREATE INDEX idx_contract_bundles_customer ON contract_bundles(customer_id);
CREATE INDEX idx_contract_bundles_status ON contract_bundles(status);

-- ============================================
-- Extend contract_documents table
-- Add document type, bundle reference, and precedence info
-- ============================================
ALTER TABLE contract_documents
    ADD COLUMN IF NOT EXISTS document_type VARCHAR(30) CHECK (document_type IN (
        'msa', 'order_form', 'amendment', 'sow', 'addendum', 'exhibit', 
        'schedule', 'renewal', 'termination', 'other'
    )),
    ADD COLUMN IF NOT EXISTS bundle_id VARCHAR(64) REFERENCES contract_bundles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS effective_date DATE,
    ADD COLUMN IF NOT EXISTS expiration_date DATE,
    ADD COLUMN IF NOT EXISTS supersedes_document_id VARCHAR(64) REFERENCES contract_documents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS precedence_order INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_primary_document BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS detected_document_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS document_type_confidence NUMERIC(3, 2);

CREATE INDEX idx_contract_documents_bundle ON contract_documents(bundle_id);
CREATE INDEX idx_contract_documents_type ON contract_documents(document_type);
CREATE INDEX idx_contract_documents_effective ON contract_documents(effective_date);
CREATE INDEX idx_contract_documents_supersedes ON contract_documents(supersedes_document_id);

-- ============================================
-- Term Conflicts table
-- Tracks conflicting term extractions across documents
-- ============================================
CREATE TABLE term_conflicts (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    bundle_id VARCHAR(64) REFERENCES contract_bundles(id) ON DELETE CASCADE,
    contract_version_id VARCHAR(64) REFERENCES contract_versions(id) ON DELETE CASCADE,
    term_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'auto_resolved', 'human_resolved', 'accepted', 'escalated')),
    resolution_method VARCHAR(30) CHECK (resolution_method IN ('auto_precedence', 'human_review', 'llm_suggestion', 'manual_override')),
    resolved_term_id VARCHAR(64) REFERENCES contract_terms(id) ON DELETE SET NULL,
    resolution_reason TEXT,
    applied_precedence_rules JSONB DEFAULT '[]'::jsonb,
    resolved_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_term_conflicts_tenant ON term_conflicts(tenant_id);
CREATE INDEX idx_term_conflicts_snapshot ON term_conflicts(snapshot_id);
CREATE INDEX idx_term_conflicts_bundle ON term_conflicts(bundle_id);
CREATE INDEX idx_term_conflicts_version ON term_conflicts(contract_version_id);
CREATE INDEX idx_term_conflicts_status ON term_conflicts(status);
CREATE INDEX idx_term_conflicts_term_type ON term_conflicts(term_type);

-- ============================================
-- Term Conflict Candidates table
-- Links conflicting terms to conflicts (many-to-many)
-- ============================================
CREATE TABLE term_conflict_candidates (
    id VARCHAR(64) PRIMARY KEY,
    conflict_id VARCHAR(64) NOT NULL REFERENCES term_conflicts(id) ON DELETE CASCADE,
    term_id VARCHAR(64) NOT NULL REFERENCES contract_terms(id) ON DELETE CASCADE,
    document_id VARCHAR(64) REFERENCES contract_documents(id) ON DELETE CASCADE,
    precedence_score INTEGER DEFAULT 0,
    is_winning_term BOOLEAN DEFAULT false,
    evidence_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_term_conflict_candidates_conflict ON term_conflict_candidates(conflict_id);
CREATE INDEX idx_term_conflict_candidates_term ON term_conflict_candidates(term_id);
CREATE INDEX idx_term_conflict_candidates_document ON term_conflict_candidates(document_id);
CREATE UNIQUE INDEX idx_term_conflict_candidates_unique ON term_conflict_candidates(conflict_id, term_id);

-- ============================================
-- Review Queue table
-- Items requiring human review
-- ============================================
CREATE TABLE review_queue (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    item_type VARCHAR(30) NOT NULL CHECK (item_type IN (
        'low_confidence_term', 'conflict', 'missing_required_term', 
        'validation_error', 'llm_extraction', 'ocr_required'
    )),
    term_id VARCHAR(64) REFERENCES contract_terms(id) ON DELETE CASCADE,
    conflict_id VARCHAR(64) REFERENCES term_conflicts(id) ON DELETE CASCADE,
    document_id VARCHAR(64) REFERENCES contract_documents(id) ON DELETE CASCADE,
    contract_version_id VARCHAR(64) REFERENCES contract_versions(id) ON DELETE CASCADE,
    bundle_id VARCHAR(64) REFERENCES contract_bundles(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'skipped', 'escalated')),
    assigned_to VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    resolution_json JSONB,
    resolved_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_review_queue_tenant ON review_queue(tenant_id);
CREATE INDEX idx_review_queue_snapshot ON review_queue(snapshot_id);
CREATE INDEX idx_review_queue_type ON review_queue(item_type);
CREATE INDEX idx_review_queue_status ON review_queue(status);
CREATE INDEX idx_review_queue_priority ON review_queue(priority DESC);
CREATE INDEX idx_review_queue_assigned ON review_queue(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_review_queue_pending ON review_queue(tenant_id, status) WHERE status = 'pending';

-- ============================================
-- Contract Defined Terms table
-- Stores definition section terms and their resolutions
-- ============================================
CREATE TABLE contract_defined_terms (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    document_id VARCHAR(64) NOT NULL REFERENCES contract_documents(id) ON DELETE CASCADE,
    contract_version_id VARCHAR(64) REFERENCES contract_versions(id) ON DELETE CASCADE,
    term VARCHAR(100) NOT NULL,
    definition TEXT NOT NULL,
    source_clause_id VARCHAR(64) REFERENCES contract_clauses(id) ON DELETE SET NULL,
    start_offset INTEGER,
    end_offset INTEGER,
    page_number INTEGER,
    confidence NUMERIC(3, 2) DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contract_defined_terms_tenant ON contract_defined_terms(tenant_id);
CREATE INDEX idx_contract_defined_terms_document ON contract_defined_terms(document_id);
CREATE INDEX idx_contract_defined_terms_version ON contract_defined_terms(contract_version_id);
CREATE INDEX idx_contract_defined_terms_term ON contract_defined_terms(term);

-- ============================================
-- Override Clauses table
-- Tracks explicit override language in documents
-- ============================================
CREATE TABLE override_clauses (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    document_id VARCHAR(64) NOT NULL REFERENCES contract_documents(id) ON DELETE CASCADE,
    clause_id VARCHAR(64) REFERENCES contract_clauses(id) ON DELETE SET NULL,
    override_type VARCHAR(30) NOT NULL CHECK (override_type IN (
        'notwithstanding', 'except_as', 'prevails_over', 'controls', 
        'supersedes', 'in_event_of_conflict', 'explicit_precedence'
    )),
    matched_text TEXT NOT NULL,
    target_section VARCHAR(100),
    start_offset INTEGER,
    end_offset INTEGER,
    page_number INTEGER,
    confidence NUMERIC(3, 2) DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_override_clauses_tenant ON override_clauses(tenant_id);
CREATE INDEX idx_override_clauses_document ON override_clauses(document_id);
CREATE INDEX idx_override_clauses_type ON override_clauses(override_type);

-- ============================================
-- Extend contract_terms table
-- Add enhanced evidence fields
-- ============================================
ALTER TABLE contract_terms
    ADD COLUMN IF NOT EXISTS context_before TEXT,
    ADD COLUMN IF NOT EXISTS context_after TEXT,
    ADD COLUMN IF NOT EXISTS llm_reasoning TEXT,
    ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) DEFAULT 'valid' CHECK (validation_status IN ('valid', 'warning', 'error')),
    ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS precedence_applied_json JSONB;

-- ============================================
-- Enable RLS on new tables
-- ============================================

-- Contract Bundles RLS
ALTER TABLE contract_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_bundles_tenant_isolation ON contract_bundles
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY contract_bundles_tenant_insert ON contract_bundles
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Term Conflicts RLS
ALTER TABLE term_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY term_conflicts_tenant_isolation ON term_conflicts
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY term_conflicts_tenant_insert ON term_conflicts
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Term Conflict Candidates RLS (through join)
ALTER TABLE term_conflict_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY term_conflict_candidates_tenant_isolation ON term_conflict_candidates
    USING (EXISTS (
        SELECT 1 FROM term_conflicts tc 
        WHERE tc.id = conflict_id 
        AND tc.tenant_id = current_setting('app.tenant_id', true)
    ));

-- Review Queue RLS
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY review_queue_tenant_isolation ON review_queue
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY review_queue_tenant_insert ON review_queue
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Contract Defined Terms RLS
ALTER TABLE contract_defined_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_defined_terms_tenant_isolation ON contract_defined_terms
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY contract_defined_terms_tenant_insert ON contract_defined_terms
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Override Clauses RLS
ALTER TABLE override_clauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY override_clauses_tenant_isolation ON override_clauses
    USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY override_clauses_tenant_insert ON override_clauses
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- Helpful views
-- ============================================

-- View: Documents with bundle and precedence info
CREATE VIEW documents_with_precedence AS
SELECT
    cd.*,
    cb.name AS bundle_name,
    cb.master_contract_id,
    CASE cd.document_type
        WHEN 'amendment' THEN 1
        WHEN 'order_form' THEN 2
        WHEN 'addendum' THEN 3
        WHEN 'msa' THEN 4
        WHEN 'sow' THEN 5
        WHEN 'exhibit' THEN 6
        WHEN 'schedule' THEN 7
        ELSE 10
    END AS type_precedence_rank
FROM contract_documents cd
LEFT JOIN contract_bundles cb ON cb.id = cd.bundle_id;

-- View: Pending review items with details
CREATE VIEW review_queue_details AS
SELECT
    rq.*,
    ct.term_type,
    ct.value_json AS term_value,
    ct.confidence AS term_confidence,
    cd.file_name AS document_name,
    cd.document_type
FROM review_queue rq
LEFT JOIN contract_terms ct ON ct.id = rq.term_id
LEFT JOIN contract_documents cd ON cd.id = rq.document_id;

-- migrate:down
DROP VIEW IF EXISTS review_queue_details CASCADE;
DROP VIEW IF EXISTS documents_with_precedence CASCADE;
DROP TABLE IF EXISTS override_clauses CASCADE;
DROP TABLE IF EXISTS contract_defined_terms CASCADE;
DROP TABLE IF EXISTS review_queue CASCADE;
DROP TABLE IF EXISTS term_conflict_candidates CASCADE;
DROP TABLE IF EXISTS term_conflicts CASCADE;
ALTER TABLE contract_documents 
    DROP COLUMN IF EXISTS document_type,
    DROP COLUMN IF EXISTS bundle_id,
    DROP COLUMN IF EXISTS effective_date,
    DROP COLUMN IF EXISTS expiration_date,
    DROP COLUMN IF EXISTS supersedes_document_id,
    DROP COLUMN IF EXISTS precedence_order,
    DROP COLUMN IF EXISTS is_primary_document,
    DROP COLUMN IF EXISTS detected_document_type,
    DROP COLUMN IF EXISTS document_type_confidence;
ALTER TABLE contract_terms
    DROP COLUMN IF EXISTS context_before,
    DROP COLUMN IF EXISTS context_after,
    DROP COLUMN IF EXISTS llm_reasoning,
    DROP COLUMN IF EXISTS validation_status,
    DROP COLUMN IF EXISTS validation_errors,
    DROP COLUMN IF EXISTS precedence_applied_json;
DROP TABLE IF EXISTS contract_bundles CASCADE;
