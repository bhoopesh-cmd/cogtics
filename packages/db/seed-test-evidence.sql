-- Seed test data for Evidence Panel testing
DO $$
DECLARE
    v_tenant_id VARCHAR(64);
    v_user_id VARCHAR(64);
    v_snapshot_id VARCHAR(64);
    v_contract_id VARCHAR(64);
    v_customer_id VARCHAR(64);
    v_contract_version_id VARCHAR(64);
    v_doc_id VARCHAR(64);
    v_clause_id VARCHAR(64);
    v_run_id VARCHAR(64);
    v_issue_id VARCHAR(64);
    v_evidence_id VARCHAR(64);
BEGIN
    -- Get existing tenant and user
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    SELECT u.id INTO v_user_id FROM users u 
    JOIN memberships m ON u.id = m.user_id 
    WHERE m.tenant_id = v_tenant_id LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'No tenant found';
    END IF;
    
    IF v_user_id IS NULL THEN
        -- Create a test user if none exists
        v_user_id := 'usr_test_' || substr(md5(random()::text), 1, 16);
        INSERT INTO users (id, email, name, status)
        VALUES (v_user_id, 'test@cogtics.ai', 'Test User', 'active');
        INSERT INTO memberships (id, tenant_id, user_id, role_id)
        SELECT 'mem_test_' || substr(md5(random()::text), 1, 16), v_tenant_id, v_user_id, id
        FROM roles WHERE name = 'admin' LIMIT 1;
    END IF;
    
    -- Create snapshot
    v_snapshot_id := 'snp_test_' || substr(md5(random()::text), 1, 16);
    INSERT INTO snapshots (id, tenant_id, status, record_counts, metadata_json)
    VALUES (v_snapshot_id, v_tenant_id, 'complete', '{"customers": 10, "contracts": 5}'::jsonb, '{}'::jsonb);
    
    -- Create customer
    v_customer_id := 'cus_test_' || substr(md5(random()::text), 1, 16);
    INSERT INTO customers (id, tenant_id, snapshot_id, external_id, source_system, name, email, status)
    VALUES (v_customer_id, v_tenant_id, v_snapshot_id, 'ext_cus_1', 'test', 'Acme Corp', 'billing@acme.com', 'active');
    
    -- Create contract
    v_contract_id := 'con_test_' || substr(md5(random()::text), 1, 16);
    INSERT INTO contracts (id, tenant_id, snapshot_id, customer_id, external_id, source_system, name, status, start_date, end_date, arr, currency)
    VALUES (v_contract_id, v_tenant_id, v_snapshot_id, v_customer_id, 'ext_con_1', 'test', 'ACME-2026-001', 'active', '2026-01-01', '2026-12-31', 120000.00, 'USD');
    
    -- Create contract version
    v_contract_version_id := 'cv_test_' || substr(md5(random()::text), 1, 16);
    INSERT INTO contract_versions (id, tenant_id, snapshot_id, contract_id, version, effective_date, source)
    VALUES (v_contract_version_id, v_tenant_id, v_snapshot_id, v_contract_id, 1, '2026-01-01', 'test');
    
    -- Create contract document
    v_doc_id := 'doc_test_' || substr(md5(random()::text), 1, 16);
    INSERT INTO contract_documents (id, tenant_id, snapshot_id, contract_id, contract_version_id, s3_key, file_name, status)
    VALUES (v_doc_id, v_tenant_id, v_snapshot_id, v_contract_id, v_contract_version_id, 'contracts/acme-2026.pdf', 'ACME-2026-001.pdf', 'extracted');
    
    -- Create contract clause
    v_clause_id := 'cl_test_' || substr(md5(random()::text), 1, 16);
    INSERT INTO contract_clauses (id, tenant_id, snapshot_id, contract_version_id, document_id, clause_type, clause_label, text, start_offset, end_offset, page_number, sequence_number)
    VALUES (v_clause_id, v_tenant_id, v_snapshot_id, v_contract_version_id, v_doc_id, 'section', 'Discount Terms', 'Customer is entitled to a 10% discount on all services exceeding $50,000 annually.', 0, 100, 3, 1);
    
    -- Create detection run
    v_run_id := 'det_test_' || substr(md5(random()::text), 1, 16);
    INSERT INTO detection_runs (id, tenant_id, snapshot_id, ruleset_version, status, started_at, finished_at, issues_total, issues_by_category)
    VALUES (v_run_id, v_tenant_id, v_snapshot_id, '1.0.0', 'completed', NOW() - INTERVAL '10 minutes', NOW(), 1, '{"billing": 1}'::jsonb);
    
    -- Create issue
    v_issue_id := 'iss_test_' || substr(md5(random()::text), 1, 16);
    INSERT INTO issues (id, tenant_id, snapshot_id, run_id, rule_id, rule_version, issue_key, category, status, severity, confidence, impact_amount, currency, expected_json, actual_json, dimensions_json, contract_id, customer_id, rule_metadata_json)
    VALUES (v_issue_id, v_tenant_id, v_snapshot_id, v_run_id, 'BILL_DISC_VAR', '1.0.0', 'ACME-2026-001-DISCOUNT', 'billing', 'open', 'high', 0.92, 5000.00, 'USD', '{"discountRate": 0.10}'::jsonb, '{"discountRate": 0.05}'::jsonb, '{"contractName": "ACME-2026-001"}'::jsonb, v_contract_id, v_customer_id, '{"threshold": 0.05}'::jsonb);
    
    -- Create issue source
    INSERT INTO issue_sources (id, tenant_id, issue_id, source_type, source_id, source_system, field_name, field_value_json)
    VALUES ('isrc_test_' || substr(md5(random()::text), 1, 16), v_tenant_id, v_issue_id, 'contract', v_contract_id, 'test', 'discount_rate', '{"value": 0.05}'::jsonb);
    
    -- Create evidence pack
    v_evidence_id := 'iev_test_' || substr(md5(random()::text), 1, 16);
    INSERT INTO issue_evidence (id, tenant_id, snapshot_id, issue_id, evidence_version, evidence_type, title, summary, data_json, completeness_score, completeness_breakdown, s3_key, rule_id, rule_version)
    VALUES (v_evidence_id, v_tenant_id, v_snapshot_id, v_issue_id, 1, 'full', 'Discount Variance Evidence', 'Evidence pack for billing discount variance issue on contract ACME-2026-001', '{"sources": [], "calculations": [], "clauses": []}'::jsonb, 0.85, '{"sources": 0.9, "calculations": 0.8, "clauses": 0.85}'::jsonb, 'evidence-packs/' || v_tenant_id || '/' || v_issue_id || '/pack.json', 'BILL_DISC_VAR', '1.0.0');
    
    -- Create evidence sources
    INSERT INTO issue_evidence_sources (id, tenant_id, evidence_id, issue_id, source_type, source_id, source_system, field_name, field_value_json)
    VALUES ('ies_test_' || substr(md5(random()::text), 1, 16), v_tenant_id, v_evidence_id, v_issue_id, 'contract', v_contract_id, 'test', 'discount_rate', '{"value": 0.05}'::jsonb);
    
    -- Create evidence calculation
    INSERT INTO issue_evidence_calculations (id, tenant_id, evidence_id, issue_id, calc_name, calc_type, inputs_json, outputs_json, sequence_number)
    VALUES ('iec_test_' || substr(md5(random()::text), 1, 16), v_tenant_id, v_evidence_id, v_issue_id, 'Discount Variance', 'variance', '{"expected": 0.10, "actual": 0.05}'::jsonb, '{"variance": 0.05, "impact": 5000}'::jsonb, 1);
    
    -- Create evidence clause
    INSERT INTO issue_evidence_clauses (id, tenant_id, evidence_id, issue_id, contract_id, contract_version_id, clause_id, clause_type, clause_label, excerpt, page_number, relevance_score)
    VALUES ('iecl_test_' || substr(md5(random()::text), 1, 16), v_tenant_id, v_evidence_id, v_issue_id, v_contract_id, v_contract_version_id, v_clause_id, 'section', 'Discount Terms', 'Customer is entitled to a 10% discount on all services exceeding $50,000 annually.', 3, 0.95);
    
    -- Create evidence audit
    INSERT INTO issue_evidence_audit (id, tenant_id, issue_id, evidence_id, evidence_version, action, status, trigger_type, actor_user_id, completeness_score, processing_time_ms, metadata_json)
    VALUES ('iea_test_' || substr(md5(random()::text), 1, 16), v_tenant_id, v_issue_id, v_evidence_id, 1, 'generated', 'completed', 'detection_run', v_user_id, 0.85, 150, '{"reason": "auto-generated after detection run"}'::jsonb);
    
    RAISE NOTICE 'Created snapshot: %, issue: %, evidence: %', v_snapshot_id, v_issue_id, v_evidence_id;
END $$;
