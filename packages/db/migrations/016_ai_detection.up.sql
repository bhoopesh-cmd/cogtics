-- Migration 016: AI Detection Engine
-- Adds support for AI-powered issue enrichment, anomaly detection, and recommendations

-- ============================================
-- Tier 2: AI Issue Enrichment
-- ============================================

-- Add AI analysis columns to issues table
ALTER TABLE issues ADD COLUMN IF NOT EXISTS ai_analysis_json JSONB;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS ai_enriched_at TIMESTAMPTZ;

-- Add AI enrichment stats to detection_runs
ALTER TABLE detection_runs ADD COLUMN IF NOT EXISTS ai_enrichment_stats JSONB;

-- Index for AI-enriched issues
CREATE INDEX IF NOT EXISTS idx_issues_ai_enriched 
  ON issues(ai_enriched_at) 
  WHERE ai_analysis_json IS NOT NULL;

-- ============================================
-- Tier 3: AI Discovered Issues
-- ============================================

CREATE TABLE IF NOT EXISTS ai_discovered_issues (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  run_id VARCHAR(64) NOT NULL REFERENCES detection_runs(id) ON DELETE CASCADE,
  
  -- Issue classification
  category VARCHAR(20) NOT NULL CHECK (category IN ('semantic', 'pattern', 'anomaly', 'contextual')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
  confidence NUMERIC(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Issue content
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  evidence_json JSONB NOT NULL,
  reasoning TEXT NOT NULL,
  
  -- Review workflow
  review_status VARCHAR(20) DEFAULT 'pending' CHECK (review_status IN ('pending', 'confirmed', 'dismissed')),
  reviewed_by VARCHAR(64) REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Promotion to regular issue
  promoted_to_issue_id VARCHAR(64) REFERENCES issues(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ai_discovered_issues
CREATE INDEX IF NOT EXISTS idx_ai_discovered_issues_tenant ON ai_discovered_issues(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_discovered_issues_snapshot ON ai_discovered_issues(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_ai_discovered_issues_run ON ai_discovered_issues(run_id);
CREATE INDEX IF NOT EXISTS idx_ai_discovered_issues_status ON ai_discovered_issues(review_status);
CREATE INDEX IF NOT EXISTS idx_ai_discovered_issues_category ON ai_discovered_issues(category);

-- RLS for ai_discovered_issues
ALTER TABLE ai_discovered_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_discovered_issues_tenant_isolation ON ai_discovered_issues
  USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY ai_discovered_issues_tenant_insert ON ai_discovered_issues
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- Tier 4: AI Recommendations
-- ============================================

CREATE TABLE IF NOT EXISTS ai_recommendations (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  snapshot_id VARCHAR(64) NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  run_id VARCHAR(64) REFERENCES detection_runs(id) ON DELETE SET NULL,
  
  -- Related issues
  issue_ids JSONB NOT NULL,
  
  -- Recommendation details
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Impact estimation
  estimated_impact_json JSONB NOT NULL,
  
  -- Simulation configuration
  suggested_simulation_json JSONB NOT NULL,
  
  -- Effort and reasoning
  effort VARCHAR(20) NOT NULL CHECK (effort IN ('low', 'medium', 'high')),
  reasoning TEXT NOT NULL,
  
  -- Status workflow
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed', 'simulated', 'applied')),
  
  -- Link to simulation if created
  simulation_id VARCHAR(64) REFERENCES simulations(id),
  
  -- User actions
  actioned_by VARCHAR(64) REFERENCES users(id),
  actioned_at TIMESTAMPTZ,
  action_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ai_recommendations
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_tenant ON ai_recommendations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_snapshot ON ai_recommendations(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_run ON ai_recommendations(run_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_status ON ai_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_priority ON ai_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_simulation ON ai_recommendations(simulation_id);

-- GIN index for searching issue_ids array
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_issue_ids ON ai_recommendations USING GIN (issue_ids);

-- RLS for ai_recommendations
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_recommendations_tenant_isolation ON ai_recommendations
  USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY ai_recommendations_tenant_insert ON ai_recommendations
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- LLM Cost Tracking
-- ============================================

CREATE TABLE IF NOT EXISTS llm_usage_logs (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Operation details
  operation_type VARCHAR(50) NOT NULL,
  run_id VARCHAR(64) REFERENCES detection_runs(id) ON DELETE SET NULL,
  
  -- Model and tokens
  model VARCHAR(50) NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  
  -- Cost calculation
  cost_usd NUMERIC(10, 6) NOT NULL,
  
  -- Request metadata
  request_id VARCHAR(64),
  duration_ms INTEGER,
  status VARCHAR(20) CHECK (status IN ('success', 'error', 'cached')),
  
  -- Error tracking
  error_code VARCHAR(50),
  error_message TEXT,
  
  -- Caching
  cache_hit BOOLEAN DEFAULT FALSE,
  cache_key VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for llm_usage_logs
CREATE INDEX IF NOT EXISTS idx_llm_usage_logs_tenant ON llm_usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_logs_run ON llm_usage_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_logs_operation ON llm_usage_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_llm_usage_logs_created ON llm_usage_logs(created_at);

-- RLS for llm_usage_logs
ALTER TABLE llm_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY llm_usage_logs_tenant_isolation ON llm_usage_logs
  USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY llm_usage_logs_tenant_insert ON llm_usage_logs
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- Update triggers for timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_ai_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_discovered_issues_updated_at
  BEFORE UPDATE ON ai_discovered_issues
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_updated_at();

CREATE TRIGGER ai_recommendations_updated_at
  BEFORE UPDATE ON ai_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_updated_at();
