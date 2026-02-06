# AI-Augmented Detection Engine - Staged Rollout Guide

This document outlines the staged rollout process for the AI-augmented detection engine.

## Rollout Phases

### Phase 1: Internal Testing (Days 1-2)

**Objective:** Validate the AI detection pipeline on synthetic data and internal test tenants.

**Steps:**
1. Run the comprehensive validation script against synthetic data
2. Execute detection on internal test tenants with AI features enabled
3. Review AI-generated outputs for quality
4. Fix any critical issues before proceeding

**Configuration:**
```json
{
  "aiEnrichment": {
    "enabled": true,
    "maxIssuesPerRun": 100,
    "minConfidenceToEnrich": 0.3
  },
  "aiAnomalyDetection": {
    "enabled": true,
    "minConfidenceToReport": 0.6,
    "maxAnomaliesPerRun": 50
  },
  "llmCostControls": {
    "maxCostPerRunUsd": 5.0,
    "preferredModel": "gpt-4o-mini",
    "enableCaching": true
  }
}
```

**Success Criteria:**
- [ ] Validation passes with F1 > 0.85
- [ ] No critical errors in logs
- [ ] AI enrichments are meaningful
- [ ] Cost per run is within budget

---

### Phase 2: Shadow Mode (Days 3-4)

**Objective:** Run AI detection in parallel with rule-based detection without persisting AI results.

**Steps:**
1. Enable shadow mode in configuration
2. AI features run but results are logged, not persisted
3. Compare AI output quality against production data
4. Monitor latency and cost impact

**Configuration:**
```json
{
  "aiEnrichment": {
    "enabled": true,
    "shadowMode": true,
    "maxIssuesPerRun": 50
  },
  "aiAnomalyDetection": {
    "enabled": true,
    "shadowMode": true
  },
  "llmCostControls": {
    "maxCostPerRunUsd": 2.0,
    "preferredModel": "gpt-4o-mini",
    "enableCaching": true,
    "budgetAlertThresholdUsd": 10
  }
}
```

**Monitoring:**
- Check `/api/detection-runs/:id` for AI stats in `stats_json`
- Review logs for AI enrichment quality
- Monitor LLM cost tracking dashboard

**Success Criteria:**
- [ ] AI processing adds < 30s to detection time
- [ ] No degradation of rule-based detection
- [ ] Cost per detection run < $0.50
- [ ] AI explanations are accurate

---

### Phase 3: Limited Rollout (Days 5-6)

**Objective:** Enable AI features for 1-2 test tenants with real production data.

**Steps:**
1. Select test tenants (internal or trusted customers)
2. Enable AI features with full persistence
3. Gather user feedback on AI enrichments
4. Monitor for any issues

**Configuration (per-tenant override):**
```json
{
  "tenantOverrides": {
    "tenant_internal": {
      "aiEnrichment": { "enabled": true },
      "aiAnomalyDetection": { "enabled": true }
    },
    "tenant_beta_customer": {
      "aiEnrichment": { "enabled": true },
      "aiAnomalyDetection": { "enabled": false }
    }
  },
  "defaultConfig": {
    "aiEnrichment": { "enabled": false },
    "aiAnomalyDetection": { "enabled": false }
  }
}
```

**User Feedback Areas:**
- Are AI explanations helpful?
- Are AI discoveries relevant?
- Are recommendations actionable?
- Any false positives to address?

**Success Criteria:**
- [ ] Positive user feedback (> 4/5 rating)
- [ ] No false positive spike
- [ ] Users engaging with AI features
- [ ] No escalations or issues

---

### Phase 4: Full Rollout (Days 7-8)

**Objective:** Enable AI features for all tenants with opt-in configuration.

**Steps:**
1. Set AI features as opt-in defaults
2. Communicate availability to customers
3. Provide documentation and training
4. Monitor adoption and usage

**Configuration (default for all tenants):**
```json
{
  "aiEnrichment": {
    "enabled": true,
    "maxIssuesPerRun": 50,
    "minConfidenceToEnrich": 0.5,
    "includeRecommendations": true
  },
  "aiAnomalyDetection": {
    "enabled": true,
    "minConfidenceToReport": 0.7,
    "maxAnomaliesPerRun": 20,
    "categories": ["semantic", "pattern"]
  },
  "llmCostControls": {
    "maxCostPerRunUsd": 1.0,
    "preferredModel": "gpt-4o-mini",
    "enableCaching": true
  }
}
```

**Communication:**
- Release notes for AI detection features
- API documentation updates
- In-app feature announcements

**Success Criteria:**
- [ ] 50%+ tenant adoption in first week
- [ ] Stable system performance
- [ ] Positive ROI on AI costs
- [ ] No critical issues

---

## Environment Variables

Add these to `.env` for AI features:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini  # or gpt-4o for higher quality

# AI Feature Flags
AI_ENRICHMENT_ENABLED=true
AI_ANOMALY_DETECTION_ENABLED=true

# Cost Controls
AI_MAX_COST_PER_RUN_USD=1.0
AI_BUDGET_ALERT_USD=100

# Cache Configuration
AI_CACHE_ENABLED=true
AI_CACHE_TTL_SECONDS=3600
```

---

## Monitoring Dashboard

Key metrics to track:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| AI Enrichment Rate | > 80% | < 50% |
| AI Explanation Quality | > 4.0/5.0 | < 3.5/5.0 |
| AI Novel Discovery Rate | > 5% | < 2% |
| AI Recommendation Relevance | > 70% | < 50% |
| Avg Cost Per Run | < $0.50 | > $1.00 |
| Avg Latency Added | < 15s | > 30s |
| Cache Hit Rate | > 40% | < 20% |

---

## Rollback Plan

If issues occur during rollout:

### Quick Disable
```sql
-- Disable AI features for all tenants
UPDATE tenants 
SET config_json = jsonb_set(
  config_json, 
  '{aiEnrichment,enabled}', 
  'false'
);
```

### Feature Flags
Set environment variables:
```bash
AI_ENRICHMENT_ENABLED=false
AI_ANOMALY_DETECTION_ENABLED=false
```

### Code Rollback
If code issues:
```bash
git revert <commit-hash>  # Revert AI feature commits
npm run deploy            # Redeploy
```

---

## Support Runbook

### Issue: High AI Costs
1. Check `llm_usage_logs` table for cost breakdown
2. Verify caching is enabled and working
3. Reduce `maxIssuesPerRun` temporarily
4. Switch to `gpt-4o-mini` if using `gpt-4o`

### Issue: AI Enrichments Failing
1. Check OpenAI API status
2. Verify API key is valid
3. Check rate limits
4. Review error logs for specific failures

### Issue: Low Quality AI Output
1. Review prompts in `packages/utils/src/llm/prompts/`
2. Check if input data is complete
3. Consider increasing temperature
4. Add more context to prompts

### Issue: High Latency
1. Enable caching if not already
2. Reduce batch size for enrichments
3. Check for API rate limiting
4. Consider async processing

---

## Success Metrics After 30 Days

| Metric | Target |
|--------|--------|
| Rule Detection F1 | > 0.93 |
| AI Enrichment Quality | > 4.0/5.0 |
| AI Novel Discovery Rate | > 10% |
| AI Recommendation Adoption | > 30% |
| User Satisfaction | > 4.5/5.0 |
| Cost per Issue | < $0.02 |
