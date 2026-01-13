-- migrate:up
-- Phase 3: Identity Resolution Tables
-- All tables are tenant and snapshot scoped with RLS

-- ============================================
-- Identity Runs - Track resolution pipeline executions
-- ============================================
CREATE TABLE identity_runs (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    snapshot_id VARCHAR(36) NOT NULL REFERENCES snapshots(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    rules_version VARCHAR(20) NOT NULL DEFAULT 'v1',
    config_json JSONB NOT NULL DEFAULT '{}',
    stats_json JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    error_code VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_identity_runs_tenant_snapshot ON identity_runs(tenant_id, snapshot_id);
CREATE INDEX idx_identity_runs_status ON identity_runs(tenant_id, status);

-- ============================================
-- Customer Identities - Merged identity groups
-- ============================================
CREATE TABLE customer_identities (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    snapshot_id VARCHAR(36) NOT NULL REFERENCES snapshots(id),
    run_id VARCHAR(36) REFERENCES identity_runs(id),
    primary_customer_id VARCHAR(36) NOT NULL,
    confidence DECIMAL(5,2) NOT NULL DEFAULT 0,
    method VARCHAR(20) NOT NULL DEFAULT 'auto' CHECK (method IN ('auto', 'manual', 'override')),
    member_count INTEGER NOT NULL DEFAULT 1,
    source_systems TEXT[] NOT NULL DEFAULT '{}',
    metadata_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_identities_tenant_snapshot ON customer_identities(tenant_id, snapshot_id);
CREATE INDEX idx_customer_identities_primary ON customer_identities(tenant_id, primary_customer_id);

-- ============================================
-- Customer Identity Members - Customers belonging to an identity
-- ============================================
CREATE TABLE customer_identity_members (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    snapshot_id VARCHAR(36) NOT NULL REFERENCES snapshots(id),
    identity_id VARCHAR(36) NOT NULL REFERENCES customer_identities(id) ON DELETE CASCADE,
    customer_id VARCHAR(36) NOT NULL,
    source_system VARCHAR(50) NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    confidence DECIMAL(5,2) NOT NULL DEFAULT 0,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('primary', 'member')),
    added_method VARCHAR(20) NOT NULL DEFAULT 'auto' CHECK (added_method IN ('auto', 'manual')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(snapshot_id, identity_id, customer_id)
);

CREATE INDEX idx_identity_members_tenant_snapshot ON customer_identity_members(tenant_id, snapshot_id);
CREATE INDEX idx_identity_members_identity ON customer_identity_members(identity_id);
CREATE INDEX idx_identity_members_customer ON customer_identity_members(tenant_id, customer_id);

-- ============================================
-- Identity Candidates - Potential match pairs with scores
-- ============================================
CREATE TABLE identity_candidates (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    snapshot_id VARCHAR(36) NOT NULL REFERENCES snapshots(id),
    run_id VARCHAR(36) REFERENCES identity_runs(id),
    customer_id_a VARCHAR(36) NOT NULL,
    customer_id_b VARCHAR(36) NOT NULL,
    score DECIMAL(5,2) NOT NULL DEFAULT 0,
    features_json JSONB NOT NULL DEFAULT '{}',
    blocking_keys TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'auto_merged', 'suppressed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(snapshot_id, customer_id_a, customer_id_b)
);

CREATE INDEX idx_identity_candidates_tenant_snapshot ON identity_candidates(tenant_id, snapshot_id);
CREATE INDEX idx_identity_candidates_status ON identity_candidates(tenant_id, snapshot_id, status);
CREATE INDEX idx_identity_candidates_score ON identity_candidates(tenant_id, snapshot_id, score DESC);

-- ============================================
-- Identity Tasks - Human review queue items
-- ============================================
CREATE TABLE identity_tasks (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    snapshot_id VARCHAR(36) NOT NULL REFERENCES snapshots(id),
    run_id VARCHAR(36) REFERENCES identity_runs(id),
    candidate_id VARCHAR(36) NOT NULL REFERENCES identity_candidates(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'resolved', 'skipped')),
    priority INTEGER NOT NULL DEFAULT 0,
    assigned_to VARCHAR(36) REFERENCES users(id),
    assigned_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(candidate_id)
);

CREATE INDEX idx_identity_tasks_tenant_snapshot ON identity_tasks(tenant_id, snapshot_id);
CREATE INDEX idx_identity_tasks_status ON identity_tasks(tenant_id, status);
CREATE INDEX idx_identity_tasks_assigned ON identity_tasks(assigned_to) WHERE assigned_to IS NOT NULL;

-- ============================================
-- Identity Decisions - Recorded decisions
-- ============================================
CREATE TABLE identity_decisions (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    snapshot_id VARCHAR(36) NOT NULL REFERENCES snapshots(id),
    task_id VARCHAR(36) NOT NULL REFERENCES identity_tasks(id),
    candidate_id VARCHAR(36) NOT NULL REFERENCES identity_candidates(id),
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('confirm', 'reject', 'merge', 'split')),
    actor_user_id VARCHAR(36) REFERENCES users(id),
    notes TEXT,
    metadata_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_identity_decisions_tenant_snapshot ON identity_decisions(tenant_id, snapshot_id);
CREATE INDEX idx_identity_decisions_task ON identity_decisions(task_id);
CREATE INDEX idx_identity_decisions_actor ON identity_decisions(actor_user_id);

-- ============================================
-- Identity Overrides - Manual force-merge overrides
-- ============================================
CREATE TABLE identity_overrides (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    snapshot_id VARCHAR(36) REFERENCES snapshots(id),
    customer_id VARCHAR(36) NOT NULL,
    identity_id VARCHAR(36) NOT NULL REFERENCES customer_identities(id),
    method VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (method IN ('manual', 'import')),
    reason TEXT,
    actor_user_id VARCHAR(36) REFERENCES users(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_identity_overrides_tenant ON identity_overrides(tenant_id);
CREATE INDEX idx_identity_overrides_customer ON identity_overrides(tenant_id, customer_id);
CREATE INDEX idx_identity_overrides_identity ON identity_overrides(identity_id);

-- ============================================
-- Identity Suppressions - Permanently blocked pairs
-- ============================================
CREATE TABLE identity_suppressions (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    customer_id_a VARCHAR(36) NOT NULL,
    customer_id_b VARCHAR(36) NOT NULL,
    reason TEXT,
    actor_user_id VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, customer_id_a, customer_id_b)
);

CREATE INDEX idx_identity_suppressions_tenant ON identity_suppressions(tenant_id);
CREATE INDEX idx_identity_suppressions_customers ON identity_suppressions(tenant_id, customer_id_a, customer_id_b);

-- ============================================
-- Enable Row Level Security
-- ============================================

-- Identity Runs RLS
ALTER TABLE identity_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY identity_runs_tenant_isolation ON identity_runs
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY identity_runs_tenant_insert ON identity_runs
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Customer Identities RLS
ALTER TABLE customer_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY customer_identities_tenant_isolation ON customer_identities
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY customer_identities_tenant_insert ON customer_identities
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Customer Identity Members RLS
ALTER TABLE customer_identity_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY customer_identity_members_tenant_isolation ON customer_identity_members
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY customer_identity_members_tenant_insert ON customer_identity_members
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Identity Candidates RLS
ALTER TABLE identity_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY identity_candidates_tenant_isolation ON identity_candidates
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY identity_candidates_tenant_insert ON identity_candidates
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Identity Tasks RLS
ALTER TABLE identity_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY identity_tasks_tenant_isolation ON identity_tasks
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY identity_tasks_tenant_insert ON identity_tasks
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Identity Decisions RLS
ALTER TABLE identity_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY identity_decisions_tenant_isolation ON identity_decisions
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY identity_decisions_tenant_insert ON identity_decisions
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Identity Overrides RLS
ALTER TABLE identity_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY identity_overrides_tenant_isolation ON identity_overrides
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY identity_overrides_tenant_insert ON identity_overrides
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Identity Suppressions RLS
ALTER TABLE identity_suppressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY identity_suppressions_tenant_isolation ON identity_suppressions
    USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY identity_suppressions_tenant_insert ON identity_suppressions
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- Resolved Customers View
-- ============================================
CREATE VIEW resolved_customers AS
SELECT 
    ci.id AS identity_id,
    ci.tenant_id,
    ci.snapshot_id,
    ci.primary_customer_id,
    c.name AS primary_name,
    c.email AS primary_email,
    ci.confidence,
    ci.method,
    ci.member_count,
    ci.source_systems,
    ci.created_at,
    ci.updated_at
FROM customer_identities ci
LEFT JOIN customers c ON ci.primary_customer_id = c.id AND ci.snapshot_id = c.snapshot_id;

-- migrate:down
DROP VIEW IF EXISTS identity_summary CASCADE;
DROP TABLE IF EXISTS identity_suppressions CASCADE;
DROP TABLE IF EXISTS identity_tasks CASCADE;
DROP TABLE IF EXISTS identity_candidates CASCADE;
DROP TABLE IF EXISTS customer_identity_members CASCADE;
DROP TABLE IF EXISTS customer_identities CASCADE;
DROP TABLE IF EXISTS identity_runs CASCADE;
