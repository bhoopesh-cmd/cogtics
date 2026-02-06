-- ============================================
-- LLM Audit Logs for Request/Response Persistence
-- ============================================
-- 
-- Stores full LLM request/response content for:
-- - Audit trail and compliance
-- - Debugging and replay capability
-- - Prompt version tracking
-- - Low-confidence issue flagging
--

CREATE TABLE IF NOT EXISTS llm_request_logs (
  id VARCHAR(64) PRIMARY KEY,
  usage_log_id VARCHAR(64) REFERENCES llm_usage_logs(id) ON DELETE SET NULL,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Prompt versioning for tracking prompt changes
  prompt_version VARCHAR(20),
  
  -- Operation metadata
  operation_type VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  
  -- Request content (prompts)
  system_prompt TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  
  -- Response content
  response_content TEXT,
  response_parsed JSONB,
  
  -- Validation results
  validation_passed BOOLEAN DEFAULT TRUE,
  validation_errors JSONB,
  
  -- Low confidence flagging
  needs_review BOOLEAN DEFAULT FALSE,
  confidence NUMERIC(3, 2),
  
  -- Tracing correlation
  trace_id VARCHAR(64),
  run_id VARCHAR(64) REFERENCES detection_runs(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes for efficient querying
-- ============================================

-- Tenant isolation
CREATE INDEX IF NOT EXISTS idx_llm_request_logs_tenant 
  ON llm_request_logs(tenant_id);

-- Link to usage metrics
CREATE INDEX IF NOT EXISTS idx_llm_request_logs_usage 
  ON llm_request_logs(usage_log_id);

-- Prompt version tracking
CREATE INDEX IF NOT EXISTS idx_llm_request_logs_version 
  ON llm_request_logs(prompt_version);

-- Low confidence review queue
CREATE INDEX IF NOT EXISTS idx_llm_request_logs_needs_review 
  ON llm_request_logs(needs_review) 
  WHERE needs_review = TRUE;

-- Operation type queries
CREATE INDEX IF NOT EXISTS idx_llm_request_logs_operation 
  ON llm_request_logs(operation_type);

-- Trace correlation
CREATE INDEX IF NOT EXISTS idx_llm_request_logs_trace 
  ON llm_request_logs(trace_id) 
  WHERE trace_id IS NOT NULL;

-- Run correlation  
CREATE INDEX IF NOT EXISTS idx_llm_request_logs_run 
  ON llm_request_logs(run_id);

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_llm_request_logs_created 
  ON llm_request_logs(created_at);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE llm_request_logs ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy for reads
CREATE POLICY llm_request_logs_tenant_isolation ON llm_request_logs
  FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id', true));

-- Tenant isolation policy for inserts
CREATE POLICY llm_request_logs_tenant_insert ON llm_request_logs
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON TABLE llm_request_logs IS 'Full LLM request/response audit log for replay and compliance';
COMMENT ON COLUMN llm_request_logs.prompt_version IS 'Version of the prompt template used (e.g., 1.0.0)';
COMMENT ON COLUMN llm_request_logs.needs_review IS 'Flag for low-confidence outputs requiring human review';
COMMENT ON COLUMN llm_request_logs.validation_passed IS 'Whether Zod schema validation passed';
COMMENT ON COLUMN llm_request_logs.response_parsed IS 'Parsed and validated JSON response';
